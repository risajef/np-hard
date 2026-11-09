const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const orientation = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** Distance to the finite edge, including its endpoints. */
export function pointSegmentDistance(point, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1)
    : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

// Nodes have radius 19: leave visible space around unrelated edges.
export const EDGE_CLEARANCE = 24;

function onSegment(point, a, b) {
  return (
    Math.abs(orientation(a, b, point)) < 1e-6 &&
    point.x >= Math.min(a.x, b.x) - 1e-6 &&
    point.x <= Math.max(a.x, b.x) + 1e-6 &&
    point.y >= Math.min(a.y, b.y) - 1e-6 &&
    point.y <= Math.max(a.y, b.y) + 1e-6
  );
}

export function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c),
    abD = orientation(a, b, d);
  const cdA = orientation(c, d, a),
    cdB = orientation(c, d, b);
  if (abC * abD < -1e-6 && cdA * cdB < -1e-6) return true;
  return onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}

/**
 * Persistent physics state, independent from DOM and puzzle answers.
 * There is no cooling schedule or stop threshold: the UI can keep stepping it
 * indefinitely. Damping lets a layout settle; dragging disturbs that equilibrium.
 */
export class SpringSimulation {
  constructor(points, edges, { planar = false, width = 700, height = 470 } = {}) {
    this.positions = points.map((point) => ({ ...point }));
    this.velocities = points.map(() => ({ x: 0, y: 0 }));
    this.edges = edges.map((edge) => [...edge]);
    this.incident = points.map((_, index) => this.edges.filter((edge) => edge.includes(index)));
    this.planar = planar;
    this.width = width;
    this.height = height;
    this.pinned = null;
  }

  step(seconds = 1 / 60) {
    const time = clamp(seconds, 0, 1 / 30) * 60;
    if (!time) return;
    const force = this.positions.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < this.positions.length; i++) {
      for (let j = i + 1; j < this.positions.length; j++) {
        const dx = this.positions[i].x - this.positions[j].x;
        const dy = this.positions[i].y - this.positions[j].y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const strength = 12000 / (distance * distance);
        force[i].x += (dx / distance) * strength;
        force[i].y += (dy / distance) * strength;
        force[j].x -= (dx / distance) * strength;
        force[j].y -= (dy / distance) * strength;
      }
    }
    for (const [a, b] of this.edges) {
      const dx = this.positions[b].x - this.positions[a].x;
      const dy = this.positions[b].y - this.positions[a].y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const strength = (distance - 105) * 0.028;
      force[a].x += (dx / distance) * strength;
      force[a].y += (dy / distance) * strength;
      force[b].x -= (dx / distance) * strength;
      force[b].y -= (dy / distance) * strength;
    }
    const damping = 0.82 ** time;
    for (let i = 0; i < this.positions.length; i++) {
      if (i === this.pinned) continue;
      const point = this.positions[i],
        velocity = this.velocities[i];
      velocity.x =
        (velocity.x + (force[i].x + (this.width / 2 - point.x) * 0.004) * time) * damping;
      velocity.y =
        (velocity.y + (force[i].y + (this.height / 2 - point.y) * 0.004) * time) * damping;
      const scale = Math.min(1, 5 / Math.max(0.01, Math.hypot(velocity.x, velocity.y)));
      const candidate = this.bounded({
        x: point.x + velocity.x * scale * time,
        y: point.y + velocity.y * scale * time,
      });
      if (this.canMove(i, candidate)) {
        point.x = candidate.x;
        point.y = candidate.y;
      } else {
        velocity.x = 0;
        velocity.y = 0;
      }
    }
  }

  pin(index) {
    this.pinned = index;
    this.velocities[index].x = 0;
    this.velocities[index].y = 0;
  }

  movePinned(target) {
    if (this.pinned === null) return;
    const index = this.pinned,
      point = this.positions[index];
    const destination = this.bounded(target);
    const start = { ...point };
    // Subdivide pointer jumps so a node cannot tunnel across the planar graph.
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(destination.x - start.x, destination.y - start.y) / 6),
    );
    for (let step = 1; step <= steps; step++) {
      const candidate = {
        x: start.x + ((destination.x - start.x) * step) / steps,
        y: start.y + ((destination.y - start.y) * step) / steps,
      };
      if (!this.canMove(index, candidate)) break;
      point.x = candidate.x;
      point.y = candidate.y;
    }
  }

  release() {
    this.pinned = null;
  }

  bounded(point) {
    return { x: clamp(point.x, 30, this.width - 30), y: clamp(point.y, 30, this.height - 30) };
  }

  canMove(index, candidate) {
    if (
      this.positions.some(
        (point, other) =>
          other !== index && Math.hypot(point.x - candidate.x, point.y - candidate.y) < 44,
      )
    )
      return false;
    if (!this.planar) return true;
    const point = (i) => (i === index ? candidate : this.positions[i]);
    // Crossing tests alone miss an edge hidden underneath a third node, and
    // overlapping edges that share an endpoint. Check both kinds of motion:
    // the node approaching a fixed edge, and its edges approaching other nodes.
    for (const [a, b] of this.edges) {
      if (a === index || b === index) {
        for (let other = 0; other < this.positions.length; other++) {
          if (other === a || other === b) continue;
          if (pointSegmentDistance(point(other), point(a), point(b)) < EDGE_CLEARANCE) return false;
        }
      } else if (pointSegmentDistance(candidate, point(a), point(b)) < EDGE_CLEARANCE) return false;
    }
    for (const [a, b] of this.incident[index]) {
      for (const [c, d] of this.edges) {
        if (a === c || a === d || b === c || b === d) continue;
        if (segmentsIntersect(point(a), point(b), point(c), point(d))) return false;
      }
    }
    return true;
  }
}
