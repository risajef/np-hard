import { SpringSimulation } from './spring-simulation.js';

/** Exact 3-coloring with two adjacent anchors to remove color permutations. */
export function solveColoring(nodeCount, edges, limit = 2) {
  const adjacency = Array.from({ length: nodeCount }, () => []);
  for (const [a, b] of edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  const colors = Array(nodeCount).fill(-1);
  colors[0] = 0;
  colors[1] = 1;
  let count = 0;
  let solution;
  let branches = 0;

  function search() {
    if (count >= limit) return;
    let vertex = -1;
    let choices = null;
    for (let i = 0; i < nodeCount; i++) {
      if (colors[i] >= 0) continue;
      const available = [0, 1, 2].filter((c) => adjacency[i].every((j) => colors[j] !== c));
      if (!available.length) return;
      if (
        !choices ||
        available.length < choices.length ||
        (available.length === choices.length && adjacency[i].length > adjacency[vertex].length)
      ) {
        vertex = i;
        choices = available;
      }
    }
    if (vertex < 0) {
      count++;
      solution = [...colors];
      return;
    }
    if (choices.length > 1) branches++;
    for (const c of choices) {
      colors[vertex] = c;
      search();
    }
    colors[vertex] = -1;
  }
  search();
  return { best: 0, count, solution, branches };
}

export function greedyColoring(nodeCount, edges, strategy = 'index', reverse = false) {
  const adjacency = Array.from({ length: nodeCount }, () => []);
  for (const [a, b] of edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  const colors = Array(nodeCount).fill(-1);
  colors[0] = 0;
  colors[1] = 1;
  while (colors.includes(-1)) {
    let order = Array.from({ length: nodeCount }, (_, i) => i).filter((i) => colors[i] < 0);
    const saturation = (i) =>
      new Set(adjacency[i].map((j) => colors[j]).filter((c) => c >= 0)).size;
    order.sort((a, b) => {
      const tie = reverse ? b - a : a - b;
      if (strategy === 'degree') return adjacency[b].length - adjacency[a].length || tie;
      if (strategy === 'saturation')
        return saturation(b) - saturation(a) || adjacency[b].length - adjacency[a].length || tie;
      return tie;
    });
    const vertex = order[0];
    const color = [0, 1, 2].find((c) => adjacency[vertex].every((j) => colors[j] !== c));
    if (color === undefined) return colors;
    colors[vertex] = color;
  }
  return colors;
}

/** Fill only colors forced by two differently colored neighbors, to a fixed point.
 * Work on a copy so callers can keep manual choices separate from deductions.
 * A vertex seeing all three colors remains blank: that branch is contradictory.
 */
export function propagateColors(choices, edges) {
  const colors = [...choices];
  const nodeCount = colors.length;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < nodeCount; i++) {
      if (colors[i] >= 0) continue;
      const used = new Set(
        edges
          .flatMap(([a, b]) => (a === i ? [colors[b]] : b === i ? [colors[a]] : []))
          .filter((c) => c >= 0),
      );
      if (used.size === 2) {
        colors[i] = [0, 1, 2].find((c) => !used.has(c));
        changed = true;
      }
    }
  }
  return colors;
}

export function forcedColorCount(nodeCount, edges) {
  const choices = Array.from({ length: nodeCount }, (_, i) => (i < 2 ? i : -1));
  return propagateColors(choices, edges).filter((c) => c >= 0).length;
}

/** Deterministic initial layout using the same physics as the live view. */
export function springLayout(
  points,
  edges,
  { planar = false, iterations = 100, width = 700, height = 470 } = {},
) {
  const simulation = new SpringSimulation(points, edges, { planar, width, height });
  for (let step = 0; step < iterations; step++) simulation.step();
  return simulation.positions;
}
