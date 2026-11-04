import { Problem } from './problem.js';
import { solveSubsets } from '../core/combinatorics.js';

const NAMES = [
  'Kompass',
  'Kamera',
  'Feldbuch',
  'Fernglas',
  'Proviant',
  'Funkgerät',
  'Zelt',
  'Werkzeug',
  'Schlafsack',
  'Seil',
  'Lampe',
  'Kocher',
  'Wasser',
];

export class KnapsackProblem extends Problem {
  id = 'knapsack';

  create(random, difficulty) {
    const items = NAMES.slice(0, 7 + difficulty * 2).map((name) => ({
      name,
      weight: random.int(2, 16),
      value: random.int(9, 85),
    }));
    const capacity = Math.floor(
      items.reduce((sum, item) => sum + item.weight, 0) * (0.32 + random.next() * 0.2),
    );
    return { items, capacity };
  }

  totals(puzzle, mask) {
    return puzzle.items.reduce(
      (result, item, index) => {
        if (mask & (1 << index)) {
          result.weight += item.weight;
          result.value += item.value;
        }
        return result;
      },
      { weight: 0, value: 0 },
    );
  }

  solve(puzzle) {
    return solveSubsets(puzzle.items.length, (mask) => {
      const { weight, value } = this.totals(puzzle, mask);
      return weight <= puzzle.capacity ? -value : Infinity;
    });
  }

  baselines(puzzle) {
    const strategies = {
      'highest-value': (item) => -item.value,
      'highest-density': (item) => -item.value / item.weight,
      'lightest-first': (item) => item.weight,
      'heaviest-first': (item) => -item.weight,
    };
    return Object.entries(strategies).flatMap(([name, score]) =>
      [false, true].map((reverse) => {
        const order = Array.from(puzzle.items.keys()).sort(
          (a, b) => score(puzzle.items[a]) - score(puzzle.items[b]) || (reverse ? b - a : a - b),
        );
        let weight = 0;
        let state = 0;
        for (const i of order) {
          if (weight + puzzle.items[i].weight > puzzle.capacity) continue;
          weight += puzzle.items[i].weight;
          state |= 1 << i;
        }
        return { name: `${name}${reverse ? '-reverse' : ''}`, state };
      }),
    );
  }

  evaluate(puzzle, mask) {
    const { weight, value } = this.totals(puzzle, mask);
    const valid = weight <= puzzle.capacity;
    return { valid, weight, value, optimal: valid && value === -puzzle.best };
  }
}
