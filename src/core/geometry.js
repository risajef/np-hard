export function inside(point, polygon) {
  let contained = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      contained = !contained;
  }
  return contained;
}

export function visible(a, b, polygon) {
  const times = [0, 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i];
    const d = polygon[(i + 1) % polygon.length];
    const ex = d.x - c.x;
    const ey = d.y - c.y;
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-9) continue;
    const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / denominator;
    const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / denominator;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) times.push(t);
  }
  times.sort((x, y) => x - y);
  return times
    .slice(1)
    .every((t, i) =>
      inside({ x: a.x + (dx * (t + times[i])) / 2, y: a.y + (dy * (t + times[i])) / 2 }, polygon),
    );
}

/** Visibility through a union of floor cells, split at every grid boundary. */
export function gridVisible(a, b, grid) {
  const times = [0, 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (let x = 0; x <= grid.columns; x++) {
    const t = (grid.x + x * grid.cell - a.x) / dx;
    if (t > 0 && t < 1) times.push(t);
  }
  for (let y = 0; y <= grid.rows; y++) {
    const t = (grid.y + y * grid.cell - a.y) / dy;
    if (t > 0 && t < 1) times.push(t);
  }
  times.sort((x, y) => x - y);
  return times.slice(1).every((t, i) => {
    const middle = (t + times[i]) / 2;
    const x = Math.floor((a.x + dx * middle - grid.x) / grid.cell);
    const y = Math.floor((a.y + dy * middle - grid.y) / grid.cell);
    return (
      x >= 0 &&
      y >= 0 &&
      x < grid.columns &&
      y < grid.rows &&
      grid.floor.includes(y * grid.columns + x)
    );
  });
}
