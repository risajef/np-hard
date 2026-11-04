import { analyzeSquareCloud } from '../src/core/square-cloud-quality.js';
import { solvePacking, countBits } from '../src/core/packing-cover.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { solveCover, coveredBy } from '../src/core/combinatorics.js';
import { Random } from '../src/core/random.js';
import { generate, evaluate, problems } from '../src/engine.js';
import { squaresOverlap } from '../src/problems/enclosing-squares.js';

test('conflict-aware cover agrees with exhaustive independent enumeration', () => {
  const random = new Random(841);
  for (let trial = 0; trial < 150; trial++) {
    const targets = random.int(3, 6);
    const covers = Array.from({ length: random.int(4, 9) }, () =>
      random.int(1, (1 << targets) - 1),
    );
    const conflicts = covers.map(() => 0n);
    for (let a = 0; a < covers.length; a++)
      for (let b = a + 1; b < covers.length; b++) {
        if (random.next() < 0.25) {
          conflicts[a] |= 1n << BigInt(b);
          conflicts[b] |= 1n << BigInt(a);
        }
      }
    let best = Infinity,
      count = 0,
      incumbent = null;
    for (let mask = 1; mask < 1 << covers.length; mask++) {
      const chosen = covers.flatMap((_, i) => (mask & (1 << i) ? [i] : []));
      const compatible = chosen.every((a, i) =>
        chosen.slice(i + 1).every((b) => !(conflicts[a] & (1n << BigInt(b)))),
      );
      if (!compatible || coveredBy(covers, chosen) !== (1 << targets) - 1) continue;
      incumbent ??= chosen;
      if (chosen.length < best) {
        best = chosen.length;
        count = 1;
      } else if (chosen.length === best) count++;
    }
    for (const bound of [null, incumbent, [0]]) {
      const result = solveCover(covers, targets, 100000, { conflicts, incumbent: bound });
      assert.equal(result.aborted, false);
      assert.equal(result.best, best);
      assert.equal(
        result.count,
        count,
        'An upper bound must not hide alternative optimal packings',
      );
    }
  }
});

test('dense cloud has a unique coupled packing without visible square-corner quartets', () => {
  for (const difficulty of [1, 2, 3]) {
    const puzzle = generate('squares', 42, difficulty);
    assert.equal(puzzle.squares.length, 551);
    assert.equal(puzzle.grid.cell, 18);
    for (const position of puzzle.squares) {
      assert.ok(position.x - puzzle.side / 2 >= 0 && position.x + puzzle.side / 2 <= 700);
      assert.ok(position.y - puzzle.side / 2 >= 0 && position.y + puzzle.side / 2 <= 470);
    }
    for (let i = 0; i < puzzle.solution.length; i++)
      for (let j = i + 1; j < puzzle.solution.length; j++) {
        const a = puzzle.squares[puzzle.solution[i]],
          b = puzzle.squares[puzzle.solution[j]];
        assert.equal(squaresOverlap(a, b, puzzle.side), false);
      }
    const quality = analyzeSquareCloud(puzzle);
    assert.equal(quality.cornerQuartets, 0);
    assert.equal(quality.connected, true);
    assert.ok(quality.coupledSquares >= Math.max(2, Math.floor(puzzle.best / 2)));
    assert.ok(puzzle.points.length > 30, 'The cloud must not be a handful of support points');
    // Re-solve a JSON export from the point cloud alone.
    const exact = problems.get('squares').solve(JSON.parse(JSON.stringify(puzzle)));
    assert.equal(exact.aborted, false);
    assert.equal(exact.count, 1);
    assert.equal(exact.best, puzzle.best);
    assert.deepEqual(exact.solution, puzzle.solution);
  }
});

test('overlap is rejected even when every point is covered; edge contact is allowed', () => {
  assert.equal(squaresOverlap({ x: 0, y: 0 }, { x: 100, y: 0 }, 100), false);
  assert.equal(squaresOverlap({ x: 0, y: 0 }, { x: 99, y: 99 }, 100), true);
  const puzzle = {
    id: 'squares',
    side: 100,
    points: [{}, {}],
    squares: [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ],
    cover: [[0], [1]],
    best: 2,
  };
  const result = evaluate(puzzle, [0, 1]);
  assert.equal(result.covered, 2);
  assert.equal(result.overlapping, true);
  assert.equal(result.valid, false);
  assert.equal(result.optimal, false);
});

test('the former four-corners-and-center recipe is explicitly rejected', () => {
  const puzzle = generate('squares', 42, 1);
  const positions = [3 + 3 * 29, 19 + 3 * 29, 3 + 13 * 29, 19 + 13 * 29];
  const points = positions.flatMap((index) => {
    const { x, y } = puzzle.squares[index];
    return [
      { x: x - 68, y: y - 68 },
      { x: x + 68, y: y - 68 },
      { x: x - 68, y: y + 68 },
      { x: x + 68, y: y + 68 },
      { x, y },
    ];
  });
  const legacy = { ...puzzle, points, solution: positions, best: positions.length };
  legacy.cover = legacy.squares.map((a) =>
    points.flatMap((b, i) => (Math.abs(a.x - b.x) <= 72 && Math.abs(a.y - b.y) <= 72 ? [i] : [])),
  );
  assert.equal(analyzeSquareCloud(legacy).cornerQuartets, 4);
  assert.equal(problems.get('squares').accept(legacy), false);
});

test('dense-cloud packing solver matches independent exhaustive enumeration', () => {
  const random = new Random(4801);
  for (let trial = 0; trial < 120; trial++) {
    const targets = random.int(3, 8);
    const covers = Array.from({ length: random.int(4, 10) }, () =>
      random.int(1, (1 << targets) - 1),
    );
    const conflicts = covers.map(() => 0n);
    for (let a = 0; a < covers.length; a++)
      for (let b = a + 1; b < covers.length; b++)
        if (random.next() < 0.25) {
          conflicts[a] |= 1n << BigInt(b);
          conflicts[b] |= 1n << BigInt(a);
        }
    const reference = solveCover(covers, targets, 100000, { conflicts });
    const result = solvePacking(covers.map(BigInt), targets, conflicts, 100000);
    assert.equal(result.aborted, false);
    assert.equal(result.best, reference.best);
    assert.equal(Math.min(result.count, 2), Math.min(reference.count, 2));
  }
  assert.equal(countBits((1n << 90n) - 1n), 90);
  const result = solvePacking([(1n << 64n) - 1n, ((1n << 90n) - 1n) ^ ((1n << 64n) - 1n)], 90, [
    1n,
    2n,
  ]);
  assert.equal(result.best, 2);
  assert.equal(result.count, 1);
});
