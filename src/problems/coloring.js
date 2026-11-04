import { createColoringChallenge, certifyColoringClicks } from '../core/coloring-challenges.js';
import { Problem } from './problem.js';
import {
  solveColoring,
  greedyColoring,
  forcedColorCount,
  propagateColors,
  springLayout,
} from '../core/graph.js';

export class ColoringProblem extends Problem {
  id = 'color';

  create(random, difficulty) {
    if (difficulty >= 2) return createColoringChallenge(random, difficulty === 3 ? 10 : 6);
    const width = 5;
    const height = 4;
    const count = width * height;
    const points = [];
    const edges = [];
    // A triangular lattice is planar. Removing edges preserves its embedding,
    // while gaps in the triangles prevent simple color propagation.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        points.push({ x: 65 + (x * 570) / (width - 1), y: 55 + (y * 360) / (height - 1) });
        if (x + 1 < width) edges.push([index, index + 1]);
        if (y + 1 < height) edges.push([index, index + width]);
        if (x + 1 < width && y + 1 < height) edges.push([index, index + width + 1]);
      }
    }
    const retained = edges.filter(() => random.next() > 0.05 + random.next() * 0.2);
    if (retained.length < 2 * count - 3) return null;
    const anchors = retained[random.int(0, retained.length - 1)];
    const order = [
      ...anchors,
      ...random.shuffle(Array.from(points.keys())).filter((i) => !anchors.includes(i)),
    ];
    const mapped = retained.map((edge) => edge.map((i) => order.indexOf(i)));
    return { points: order.map((i) => points[i]), edges: mapped };
  }

  solve(puzzle) {
    return solveColoring(puzzle.points.length, puzzle.edges);
  }

  accept(puzzle) {
    if (puzzle.difficulty >= 2) {
      const certificate = certifyColoringClicks(puzzle);
      if (!certificate || certificate.minimum < (puzzle.difficulty === 3 ? 10 : 6)) return false;
      puzzle.minimumClicks = certificate.minimum;
      return certificate.initiallyColored <= Math.ceil(puzzle.points.length / 5);
    }
    return forcedColorCount(puzzle.points.length, puzzle.edges) <= 4;
  }

  baselines(puzzle) {
    return ['index', 'degree', 'saturation'].flatMap((strategy) =>
      [false, true].map((reverse) => ({
        name: `${strategy}${reverse ? '-reverse' : ''}`,
        state: greedyColoring(puzzle.points.length, puzzle.edges, strategy, reverse),
      })),
    );
  }

  layout(puzzle) {
    puzzle.points = springLayout(puzzle.points, puzzle.edges, {
      ...puzzle.board,
      planar: true,
      iterations: 100,
    });
  }

  manualColors(puzzle) {
    return puzzle.points.map((_, i) => (i < 2 ? i : -1));
  }

  initial(puzzle) {
    return this.propagate(puzzle, this.manualColors(puzzle));
  }

  propagate(puzzle, choices) {
    return propagateColors(choices, puzzle.edges);
  }

  evaluate(puzzle, colors) {
    const valid =
      colors.length === puzzle.points.length &&
      colors[0] === 0 &&
      colors[1] === 1 &&
      colors.every((c) => [0, 1, 2].includes(c)) &&
      puzzle.edges.every(([a, b]) => colors[a] !== colors[b]);
    return { valid, optimal: valid, value: colors.filter((c) => c >= 0).length };
  }
}
