import { validIndices } from '../core/state-validation.js';
import { Problem } from './problem.js';
import { bitCount, coveredBy, greedyCover, solveCover, pruneCover } from '../core/combinatorics.js';

/** Shared finite-grid placement mechanics; concrete classes define geometry. */
export class GridCoverProblem extends Problem {
  initial() {
    return [];
  }

  solve(puzzle) {
    return solveCover(puzzle.cover, puzzle.targets?.length ?? puzzle.points.length);
  }

  accept(puzzle) {
    return puzzle.best >= 3;
  }

  baselines(puzzle) {
    const count = puzzle.targets?.length ?? puzzle.points.length;
    return [false, true].flatMap((reverse) => {
      const state = greedyCover(puzzle.cover, count, reverse);
      return [
        { name: `max-new-coverage${reverse ? '-reverse' : ''}`, state },
        ...[false, true].map((pruneReverse) => ({
          name: `max-new-coverage-${reverse ? 'reverse-' : ''}pruned${pruneReverse ? '-reverse' : ''}`,
          state: pruneCover(puzzle.cover, state, count, pruneReverse),
        })),
      ];
    });
  }

  evaluate(puzzle, selected) {
    const count = puzzle.targets?.length ?? puzzle.points.length;
    const legal = validIndices(selected, puzzle.cover.length);
    const unique = legal ? selected : [];
    const cover = legal ? coveredBy(puzzle.cover, unique) : 0;
    const valid = legal && cover === (1 << count) - 1;
    return {
      valid,
      optimal: valid && unique.length === puzzle.best,
      value: unique.length,
      cover,
      covered: bitCount(cover),
      total: count,
    };
  }
}
