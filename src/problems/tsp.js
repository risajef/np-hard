import { Problem } from './problem.js';
import { EPSILON, permutations } from '../core/combinatorics.js';

export function routeLength(points, route) {
  if (route.length < 2) return 0;
  return route.reduce((sum, a, i) => {
    const b = route[(i + 1) % route.length];
    return sum + Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
  }, 0);
}

export class TspProblem extends Problem {
  id = 'tsp';

  create(random, difficulty) {
    return { points: random.points(5 + difficulty, 55) };
  }

  solve(puzzle) {
    let best = Infinity;
    let count = 0;
    let solution;
    const remaining = Array.from({ length: puzzle.points.length - 1 }, (_, i) => i + 1);
    for (const tail of permutations(remaining)) {
      if (tail[0] > tail.at(-1)) continue;
      const route = [0, ...tail];
      const distance = routeLength(puzzle.points, route);
      if (distance < best - EPSILON) {
        best = distance;
        count = 1;
        solution = route;
      } else if (Math.abs(distance - best) < EPSILON) count++;
    }
    return { best, count, solution };
  }

  initial() {
    return [];
  }

  evaluate(puzzle, route) {
    const valid =
      Array.isArray(route) &&
      route.length === puzzle.points.length &&
      new Set(route).size === route.length &&
      route.every((i) => Number.isInteger(i) && i >= 0 && i < puzzle.points.length);
    const value = routeLength(puzzle.points, route);
    return { valid, value, optimal: valid && Math.abs(value - puzzle.best) < EPSILON };
  }
}
