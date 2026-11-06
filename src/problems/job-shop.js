import { validIndices } from '../core/state-validation.js';
import { Problem } from './problem.js';
import { permutations } from '../core/combinatorics.js';

/** Earliest-start schedule for job precedence and the chosen machine orders. */
export function jobSchedule(puzzle, orders) {
  const count = puzzle.ops.length;
  if (
    !Array.isArray(orders) ||
    orders.length !== puzzle.machines.length ||
    !Array.from(orders).every(
      (order, machine) =>
        validIndices(order, count) &&
        order.length === puzzle.machines[machine].length &&
        order.every((index) => puzzle.machines[machine].includes(index)),
    )
  ) {
    return { valid: false, start: Array(count).fill(0), makespan: Infinity };
  }
  const edges = Array.from({ length: count }, () => new Set());
  const degree = Array(count).fill(0);
  for (const order of [...puzzle.jobs, ...orders]) {
    for (let i = 1; i < order.length; i++) edges[order[i - 1]].add(order[i]);
  }
  edges.forEach((neighbors) => neighbors.forEach((b) => degree[b]++));
  const queue = degree.flatMap((d, i) => (d === 0 ? [i] : []));
  const start = Array(count).fill(0);
  let seen = 0;
  while (queue.length) {
    const a = queue.shift();
    seen++;
    for (const b of edges[a]) {
      start[b] = Math.max(start[b], start[a] + puzzle.ops[a].duration);
      if (--degree[b] === 0) queue.push(b);
    }
  }
  const valid = seen === count;
  const makespan = valid ? Math.max(...start.map((s, i) => s + puzzle.ops[i].duration)) : Infinity;
  return { valid, start, makespan };
}

export class JobShopProblem extends Problem {
  id = 'job';

  create(random, difficulty) {
    const ops = [];
    const jobs = Array.from({ length: 3 }, (_, job) => {
      const machines = random.shuffle([0, 1]);
      return machines.map((machine, step) => {
        const index = ops.length;
        ops.push({ job, step, machine, duration: random.int(1, 5 + difficulty) });
        return index;
      });
    });
    const machines = [0, 1].map((m) => ops.flatMap((op, i) => (op.machine === m ? [i] : [])));
    return { ops, jobs, machines };
  }

  solve(puzzle) {
    let best = Infinity;
    let count = 0;
    let solution;
    for (const first of permutations(puzzle.machines[0])) {
      for (const second of permutations(puzzle.machines[1])) {
        const orders = [first, second];
        const value = jobSchedule(puzzle, orders).makespan;
        if (value < best) {
          best = value;
          count = 1;
          solution = orders;
        } else if (value === best) count++;
      }
    }
    return { best, count, solution };
  }

  initial(puzzle) {
    return puzzle.machines.map((order) => [...order]);
  }

  evaluate(puzzle, orders) {
    const result = jobSchedule(puzzle, orders);
    return {
      ...result,
      value: result.makespan,
      optimal: result.valid && result.makespan === puzzle.best,
    };
  }
}
