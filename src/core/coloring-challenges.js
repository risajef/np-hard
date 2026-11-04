import { propagateColors } from './graph.js';

/** Compose planar regions inside the faces of a triangular strip.
 * Each five-vertex region is uniquely colorable from its boundary, but none of
 * its vertices can be the first automatic deduction. One correct choice then
 * resolves it. Relabeling and independent rotations/reflections of the regions
 * vary both the presentation and the color relationships between challenges.
 */
export function createColoringChallenge(random, regionCount) {
  const columns = regionCount === 10 ? 3 : 2;
  const cells = regionCount / 2;
  const rows = Math.ceil(cells / columns);
  const board = { width: columns * 300 + 80, height: rows * 340 + 80 };
  const points = [];
  const edges = [];
  const frame = new Map();
  const decisionRegions = [];
  const decisionSeeds = [];
  const vertex = (x, y) => {
    const key = `${x},${y}`;
    if (!frame.has(key)) {
      frame.set(key, points.length);
      points.push({ x: 40 + x * 300, y: 40 + y * 340 });
    }
    return frame.get(key);
  };
  const edge = (a, b) => {
    if (!edges.some(([u, v]) => (a === u && b === v) || (a === v && b === u))) edges.push([a, b]);
  };

  function fillFace(face) {
    const [a, b, c] = random.shuffle(face);
    edge(a, b);
    edge(b, c);
    edge(c, a);
    // An affine embedding keeps the region inside its own triangular face.
    const inner = [
      [0.3, 0.3],
      [0.55, 0.15],
      [0.65, 0.4],
      [0.4, 0.45],
      [0.77, 0.2],
    ].map(([x, y]) => {
      const index = points.length;
      const weights = [1 - x - y / 2, x - y / 2, y];
      points.push({
        x: [a, b, c].reduce((sum, i, j) => sum + points[i].x * weights[j], 0),
        y: [a, b, c].reduce((sum, i, j) => sum + points[i].y * weights[j], 0),
      });
      return index;
    });
    const [u, v, w, x, y] = inner;
    for (const [first, second] of [
      [a, u],
      [a, v],
      [u, v],
      [u, w],
      [v, w],
      [u, x],
      [w, x],
      [v, y],
      [w, y],
      [b, y],
    ])
      edge(first, second);
    decisionRegions.push(inner);
    decisionSeeds.push([u, v, w, y][random.int(0, 3)]);
  }

  for (let cell = 0; cell < cells; cell++) {
    const x = cell % columns;
    const y = Math.floor(cell / columns);
    const a = vertex(x, y),
      b = vertex(x + 1, y),
      c = vertex(x, y + 1),
      d = vertex(x + 1, y + 1);
    if (random.next() < 0.5) {
      fillFace([a, b, d]);
      fillFace([a, d, c]);
    } else {
      fillFace([a, b, c]);
      fillFace([b, d, c]);
    }
  }
  // Only the two adjacent anchors are givens. The rest of the frame follows
  // from the same propagation rule as the player's moves.
  const frameVertices = new Set(frame.values());
  const frameEdges = edges.filter(([a, b]) => frameVertices.has(a) && frameVertices.has(b));
  const anchors = frameEdges[random.int(0, frameEdges.length - 1)];
  const order = [
    ...anchors,
    ...random.shuffle(Array.from(points.keys())).filter((i) => !anchors.includes(i)),
  ];
  const mapped = new Map(order.map((old, index) => [old, index]));
  return {
    board,
    points: order.map((i) => points[i]),
    edges: edges.map((pair) => pair.map((i) => mapped.get(i))),
    decisionRegions: random
      .shuffle(decisionRegions)
      .map((region) => region.map((i) => mapped.get(i))),
    decisionSeeds: random.shuffle(decisionSeeds).map((i) => mapped.get(i)),
  };
}

/** A checkable lower bound, plus a matching move sequence proves the minimum.
 * In each disjoint region every vertex sees at most one solution color outside
 * that region. Without a manual choice inside it, no first vertex can ever be
 * auto-colored, even if the entire outside is already correctly colored.
 * This proves the bound for every possible click order, not sampled strategies.
 */
export function certifyColoringClicks(puzzle) {
  const { points, edges, solution, decisionRegions: regions, decisionSeeds: seeds } = puzzle;
  if (!regions?.length || !seeds || seeds.length !== regions.length) return null;
  if (
    !solution ||
    solution.length !== points.length ||
    solution[0] !== 0 ||
    solution[1] !== 1 ||
    !solution.every((color) => [0, 1, 2].includes(color)) ||
    edges.some(([a, b]) => solution[a] === solution[b])
  )
    return null;
  const adjacency = points.map(() => []);
  for (const [a, b] of edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  const used = new Set([0, 1]);
  for (const region of regions) {
    if (!region.length || new Set(region).size !== region.length) return null;
    const members = new Set(region);
    for (const vertex of region) {
      if (!Number.isInteger(vertex) || vertex < 0 || vertex >= points.length || used.has(vertex))
        return null;
      used.add(vertex);
      const outsideColors = new Set(
        adjacency[vertex].filter((i) => !members.has(i)).map((i) => solution[i]),
      );
      if (outsideColors.size > 1) return null;
    }
  }
  const choices = points.map((_, i) => (i < 2 ? i : -1));
  let colors = propagateColors(choices, edges);
  for (const vertex of seeds) {
    if (!used.has(vertex) || colors[vertex] >= 0) return null;
    choices[vertex] = solution[vertex];
    colors = propagateColors(choices, edges);
  }
  if (!colors.every((color, i) => color === solution[i])) return null;
  return {
    minimum: regions.length,
    initiallyColored: propagateColors(
      points.map((_, i) => (i < 2 ? i : -1)),
      edges,
    ).filter((c) => c >= 0).length,
  };
}
