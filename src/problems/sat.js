import { Problem } from './problem.js';

export class SatProblem extends Problem {
  id = 'sat';

  satisfied(clause, assignment) {
    return clause.some((literal) => Boolean(assignment & (1 << literal.v)) === literal.positive);
  }

  create(random, difficulty) {
    const n = 4 + difficulty;
    const target = random.int(1, (1 << n) - 2);
    const clauses = [];
    let remaining = Array.from({ length: 1 << n }, (_, i) => i);
    for (let attempt = 0; attempt < 300 && remaining.length > 1; attempt++) {
      const clause = random
        .shuffle(Array.from({ length: n }, (_, i) => i))
        .slice(0, 3)
        .map((v) => ({ v, positive: random.next() < 0.5 }));
      if (!this.satisfied(clause, target)) continue;
      const survivors = remaining.filter((assignment) => this.satisfied(clause, assignment));
      if (survivors.length === remaining.length) continue;
      clauses.push(clause);
      remaining = survivors;
    }
    if (remaining.length !== 1) return null;
    return { n, clauses };
  }

  solve(puzzle) {
    const solutions = Array.from({ length: 1 << puzzle.n }, (_, i) => i).filter((assignment) =>
      puzzle.clauses.every((clause) => this.satisfied(clause, assignment)),
    );
    return { best: 0, count: solutions.length, solution: solutions[0] };
  }

  baselines(puzzle) {
    const score = (assignment) =>
      puzzle.clauses.filter((clause) => this.satisfied(clause, assignment)).length;
    return [0, (1 << puzzle.n) - 1].flatMap((start) =>
      [false, true].map((reverse) => {
        let state = start;
        const order = Array.from({ length: puzzle.n }, (_, i) => i);
        if (reverse) order.reverse();
        for (;;) {
          let next = state;
          for (const i of order) if (score(state ^ (1 << i)) > score(next)) next = state ^ (1 << i);
          if (next === state) break;
          state = next;
        }
        return {
          name: `single-flip-${start === 0 ? 'false' : 'true'}${reverse ? '-reverse' : ''}`,
          state,
        };
      }),
    );
  }

  evaluate(puzzle, assignment) {
    const value = puzzle.clauses.filter((clause) => this.satisfied(clause, assignment)).length;
    const valid = value === puzzle.clauses.length;
    return { valid, optimal: valid, value };
  }
}
