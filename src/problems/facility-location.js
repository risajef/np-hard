import { Problem } from './problem.js';
import { EPSILON, solveSubsets } from '../core/combinatorics.js';

export class FacilityLocationProblem extends Problem {
  id = 'facility';

  create(random, difficulty) {
    const facilities = random
      .points(5 + difficulty, 52)
      .map((point) => ({ ...point, cost: random.int(65, 240) }));
    const clients = random.points(7 + difficulty * 2, 20);
    const costs = facilities.map((a) =>
      clients.map((b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 10) / 10),
    );
    return { facilities, clients, costs };
  }

  cost(puzzle, mask) {
    if (!mask) return Infinity;
    const opening = puzzle.facilities.reduce(
      (sum, site, i) => sum + (mask & (1 << i) ? site.cost : 0),
      0,
    );
    return (
      opening +
      puzzle.clients.reduce(
        (sum, _, j) =>
          sum + Math.min(...puzzle.costs.map((cost, i) => (mask & (1 << i) ? cost[j] : Infinity))),
        0,
      )
    );
  }

  solve(puzzle) {
    return solveSubsets(puzzle.facilities.length, (mask) => this.cost(puzzle, mask));
  }

  baselines(puzzle) {
    const count = puzzle.facilities.length;
    const results = [];
    for (const reverse of [false, true]) {
      const indices = Array.from(puzzle.facilities.keys());
      if (reverse) indices.reverse();
      let forward = indices.reduce(
        (best, i) =>
          this.cost(puzzle, 1 << i) < this.cost(puzzle, best) - EPSILON ? 1 << i : best,
        0,
      );
      let changed = true;
      while (changed) {
        let next = forward;
        for (const i of indices) {
          const candidate = forward | (1 << i);
          if (this.cost(puzzle, candidate) < this.cost(puzzle, next) - EPSILON) next = candidate;
        }
        changed = next !== forward;
        forward = next;
      }
      let backward = (1 << count) - 1;
      changed = true;
      while (changed) {
        let next = backward;
        for (const i of indices) {
          const candidate = backward & ~(1 << i);
          if (this.cost(puzzle, candidate) < this.cost(puzzle, next) - EPSILON) next = candidate;
        }
        changed = next !== backward;
        backward = next;
      }
      results.push(
        { name: `greedy-opening${reverse ? '-reverse' : ''}`, state: forward },
        { name: `greedy-closing${reverse ? '-reverse' : ''}`, state: backward },
      );
    }
    return results;
  }

  evaluate(puzzle, mask) {
    const value = this.cost(puzzle, mask);
    return { valid: mask !== 0, value, optimal: Math.abs(value - puzzle.best) < EPSILON };
  }
}
