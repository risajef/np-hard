import { validIndices } from '../core/state-validation.js';
import { Problem } from './problem.js';
import { countBits, coverageMasks, coverageUnion, solvePacking } from '../core/packing-cover.js';
import { analyzeSquareCloud } from '../core/square-cloud-quality.js';

export function squaresOverlap(a, b, side) {
  return Math.abs(a.x - b.x) < side && Math.abs(a.y - b.y) < side;
}

const GRID = { columns: 29, rows: 19, cell: 18, x: 98, y: 72 };
const SIDE = 144;
const POSITIONS = Array.from({ length: GRID.columns * GRID.rows }, (_, i) => ({
  x: GRID.x + (i % GRID.columns) * GRID.cell,
  y: GRID.y + Math.floor(i / GRID.columns) * GRID.cell,
}));
const BITS = POSITIONS.map((_, i) => 1n << BigInt(i));
const CONFLICTS = POSITIONS.map((a) =>
  POSITIONS.reduce((mask, b, j) => (squaresOverlap(a, b, SIDE) ? mask | BITS[j] : mask), 0n),
);

export class EnclosingSquaresProblem extends Problem {
  id = 'squares';

  initial() {
    return [];
  }

  create(random, difficulty) {
    // A connected sampling region keeps the cloud feasible without creating
    // separate point groups or prescribing corners, centers, or support points.
    // The region is discarded. The solver receives only the sampled cloud.
    const region = [random.int(8, 20) + random.int(6, 12) * GRID.columns];
    const regionSize = 3 + difficulty;
    for (let count = 1; count < regionSize; count++) {
      const options = new Set();
      for (const index of region) {
        const x = index % GRID.columns,
          y = Math.floor(index / GRID.columns);
        const offsets = [
          [8, random.int(-5, 5)],
          [-8, random.int(-5, 5)],
          [random.int(-5, 5), 8],
          [random.int(-5, 5), -8],
        ];
        for (const [dx, dy] of offsets) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= GRID.columns || ny < 0 || ny >= GRID.rows) continue;
          const next = ny * GRID.columns + nx;
          if (region.every((i) => !squaresOverlap(POSITIONS[i], POSITIONS[next], SIDE)))
            options.add(next);
        }
      }
      if (!options.size) return null;
      const choices = [...options];
      region.push(choices[random.int(0, choices.length - 1)]);
    }
    const points = [],
      targetCount = regionSize * 14;
    for (let tries = 0; points.length < targetCount && tries < 15000; tries++) {
      // Half-pixel coordinates never lie on grid-aligned square boundaries.
      const point = { x: random.int(27, 672) + 0.5, y: random.int(1, 466) + 0.5 };
      if (
        region.some(
          (i) =>
            Math.abs(POSITIONS[i].x - point.x) < SIDE / 2 &&
            Math.abs(POSITIONS[i].y - point.y) < SIDE / 2,
        ) &&
        points.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= 12)
      )
        points.push(point);
    }
    if (points.length !== targetCount) return null;
    const squares = POSITIONS.map((point) => ({ ...point }));
    const cover = squares.map((square) =>
      points.flatMap((point, i) =>
        Math.abs(square.x - point.x) < SIDE / 2 && Math.abs(square.y - point.y) < SIDE / 2
          ? [i]
          : [],
      ),
    );
    return { grid: { ...GRID }, squares, side: SIDE, points, cover };
  }

  conflicts(puzzle) {
    if (
      puzzle.squares.length === POSITIONS.length &&
      puzzle.side === SIDE &&
      puzzle.squares.every((point, i) => point.x === POSITIONS[i].x && point.y === POSITIONS[i].y)
    )
      return CONFLICTS;
    return puzzle.squares.map((a) =>
      puzzle.squares.reduce(
        (mask, b, j) => (squaresOverlap(a, b, puzzle.side) ? mask | (1n << BigInt(j)) : mask),
        0n,
      ),
    );
  }

  solve(puzzle) {
    return solvePacking(coverageMasks(puzzle.cover), puzzle.points.length, this.conflicts(puzzle));
  }

  accept(puzzle) {
    const quality = analyzeSquareCloud(puzzle);
    return (
      puzzle.best >= 3 &&
      quality.cornerQuartets === 0 &&
      quality.connected &&
      quality.coupledSquares >= Math.max(2, Math.floor(puzzle.best / 2)) &&
      quality.mixedPlacements >= puzzle.best * 2
    );
  }

  baselines(puzzle) {
    const coverage = coverageMasks(puzzle.cover);
    const full = (1n << BigInt(puzzle.points.length)) - 1n;
    const conflicts = this.conflicts(puzzle);
    const results = [false, true].flatMap((reverse) => {
      const indices = Array.from(puzzle.squares.keys());
      if (reverse) indices.reverse();
      let covered = 0n,
        forbidden = 0n;
      const state = [];
      while (covered !== full) {
        let best = -1,
          gain = 0;
        for (const index of indices) {
          if (forbidden & (1n << BigInt(index))) continue;
          const improvement = countBits(coverage[index] & ~covered);
          if (improvement > gain) {
            best = index;
            gain = improvement;
          }
        }
        if (best < 0) break;
        state.push(best);
        covered |= coverage[best];
        forbidden |= conflicts[best] | (1n << BigInt(best));
      }
      return [
        { name: `non-overlapping-max-coverage${reverse ? '-reverse' : ''}`, state },
        ...[false, true].map((pruneReverse) => {
          let pruned = [...state];
          for (const index of pruneReverse ? [...state].reverse() : state) {
            const next = pruned.filter((i) => i !== index);
            if (coverageUnion(coverage, next) === full) pruned = next;
          }
          return { name: `non-overlapping-pruned-${reverse}-${pruneReverse}`, state: pruned };
        }),
      ];
    });
    // Human shortcut: simply tile the bounding region with a regular lattice.
    // Test every horizontal and vertical phase available on the fine grid.
    const stride = puzzle.side / puzzle.grid.cell;
    let aligned = [];
    for (let x = 0; x < stride; x++)
      for (let y = 0; y < stride; y++) {
        const state = puzzle.squares.flatMap((_, i) =>
          (i % puzzle.grid.columns) % stride === x &&
          Math.floor(i / puzzle.grid.columns) % stride === y &&
          coverage[i]
            ? [i]
            : [],
        );
        if (
          coverageUnion(coverage, state) === full &&
          (!aligned.length || state.length < aligned.length)
        )
          aligned = state;
      }
    results.push({ name: 'best-aligned-tiling', state: aligned });
    return results;
  }

  evaluate(puzzle, state) {
    const legal = validIndices(state, puzzle.squares.length);
    const coveredPoints = Array(puzzle.points.length).fill(false);
    if (legal)
      for (const index of state)
        for (const target of puzzle.cover[index]) coveredPoints[target] = true;
    const overlapping =
      legal &&
      state.some((index, i) =>
        state
          .slice(i + 1)
          .some((other) =>
            squaresOverlap(puzzle.squares[index], puzzle.squares[other], puzzle.side),
          ),
      );
    const covered = coveredPoints.filter(Boolean).length;
    const valid = legal && !overlapping && covered === puzzle.points.length;
    return {
      valid,
      optimal: valid && state.length === puzzle.best,
      value: legal ? state.length : Infinity,
      overlapping,
      coveredPoints,
      covered,
      total: puzzle.points.length,
    };
  }
}
