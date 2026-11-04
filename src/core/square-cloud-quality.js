import { coverageMasks } from './packing-cover.js';

/** Detect the old visual shortcut and require interacting placement decisions. */
export function analyzeSquareCloud(puzzle) {
  const masks = coverageMasks(puzzle.cover);
  let cornerQuartets = 0,
    coupledSquares = 0;
  const groups = puzzle.solution.map((index) => masks[index]);
  for (const index of puzzle.solution) {
    const center = puzzle.squares[index];
    const corners = new Set();
    for (const target of puzzle.cover[index]) {
      const point = puzzle.points[target];
      const dx = point.x - center.x,
        dy = point.y - center.y;
      if (Math.abs(dx) >= puzzle.side * 0.3 && Math.abs(dy) >= puzzle.side * 0.3) {
        corners.add(`${dx < 0}:${dy < 0}`);
      }
    }
    if (corners.size === 4) cornerQuartets++;
    // A square is coupled when its own points alone permit several positions:
    // only the neighboring squares resolve where it can actually go.
    if (masks.filter((mask) => (mask & masks[index]) === masks[index]).length > 1) coupledSquares++;
  }
  const mixedPlacements = masks.filter(
    (mask) => groups.filter((group) => Boolean(mask & group)).length > 1,
  ).length;
  const reached = new Set([0]),
    queue = [0];
  for (let i = 0; i < queue.length; i++) {
    const a = puzzle.points[queue[i]];
    puzzle.points.forEach((b, j) => {
      if (!reached.has(j) && Math.hypot(a.x - b.x, a.y - b.y) <= puzzle.side * 0.65) {
        reached.add(j);
        queue.push(j);
      }
    });
  }
  return {
    cornerQuartets,
    coupledSquares,
    mixedPlacements,
    connected: reached.size === puzzle.points.length,
  };
}
