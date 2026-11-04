import { Problem } from './problem.js';
import { bitCount, solveCover, greedyCover, pruneCover } from '../core/combinatorics.js';
import { springLayout } from '../core/graph.js';

export class DominatingSetProblem extends Problem {
  id = 'dom';

  create(random, difficulty) {
    const count = [10, 20, 24][difficulty - 1];
    const points = random.points(count, 45);
    const edges = [];
    const order = random.shuffle(Array.from(points.keys()));
    for (let i = 1; i < count; i++) edges.push([order[i], order[random.int(0, i - 1)]]);
    for (let a = 0; a < count; a++) {
      for (let b = a + 1; b < count; b++) {
        if (
          random.next() < (difficulty === 1 ? 0.16 : 0.035) &&
          !edges.some(([u, v]) => (u === a && v === b) || (u === b && v === a))
        )
          edges.push([a, b]);
      }
    }
    const cover = points.map((_, i) =>
      edges.reduce(
        (mask, [a, b]) => (a === i ? mask | (1 << b) : b === i ? mask | (1 << a) : mask),
        1 << i,
      ),
    );
    return { points, edges, cover };
  }

  solve(puzzle) {
    const exact = solveCover(puzzle.cover, puzzle.points.length);
    return { ...exact, solution: exact.solution.reduce((mask, i) => mask | (1 << i), 0) };
  }

  accept(puzzle) {
    return puzzle.best >= [1, 5, 6][puzzle.difficulty - 1];
  }

  baselines(puzzle) {
    return [false, true].flatMap((reverse) => {
      const dynamic = greedyCover(puzzle.cover, puzzle.points.length, reverse);
      const order = Array.from(puzzle.cover.keys()).sort(
        (a, b) =>
          bitCount(puzzle.cover[b]) - bitCount(puzzle.cover[a]) || (reverse ? b - a : a - b),
      );
      let covered = 0;
      let mask = 0;
      for (const index of order) {
        if (covered === (1 << puzzle.points.length) - 1) break;
        if ((puzzle.cover[index] & ~covered) === 0) continue;
        mask |= 1 << index;
        covered |= puzzle.cover[index];
      }
      const masks = (choices) => choices.reduce((value, i) => value | (1 << i), 0);
      return [
        {
          name: `max-new-coverage${reverse ? '-reverse' : ''}`,
          state: dynamic.reduce((m, i) => m | (1 << i), 0),
        },
        ...[false, true].map((pruneReverse) => ({
          name: `max-new-coverage-${reverse ? 'reverse-' : ''}pruned${pruneReverse ? '-reverse' : ''}`,
          state: masks(pruneCover(puzzle.cover, dynamic, puzzle.points.length, pruneReverse)),
        })),
        { name: `highest-degree${reverse ? '-reverse' : ''}`, state: mask },
      ];
    });
  }

  layout(puzzle) {
    puzzle.points = springLayout(puzzle.points, puzzle.edges);
  }

  evaluate(puzzle, mask) {
    const cover = puzzle.cover.reduce((value, c, i) => (mask & (1 << i) ? value | c : value), 0);
    const total = puzzle.points.length;
    const valid = cover === (1 << total) - 1;
    const value = bitCount(mask);
    return {
      valid,
      value,
      optimal: valid && value === puzzle.best,
      cover,
      total,
      covered: bitCount(cover),
    };
  }
}
