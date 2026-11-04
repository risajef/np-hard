import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, initial, evaluate, problems, MODES, jobSchedule } from '../src/engine.js';
import { solveCover, coveredBy } from '../src/core/combinatorics.js';
import { certifyColoringClicks } from '../src/core/coloring-challenges.js';
import { forcedColorCount } from '../src/core/graph.js';
import { gridVisible } from '../src/core/geometry.js';
import { Random } from '../src/core/random.js';

const SEEDS = [1, 7, 42, 137, 2026];

for (const { id } of MODES) {
  test(`${id}: unique exact optimum and all declared heuristics fail`, () => {
    for (const difficulty of [1, 2, 3]) {
      for (const seed of SEEDS) {
        const puzzle = generate(id, seed, difficulty);
        const problem = problems.get(id);
        assert.equal(puzzle.count, 1, `${seed}/${difficulty}: uniqueness`);
        assert.equal(evaluate(puzzle, puzzle.solution).optimal, true);
        assert.equal(
          evaluate(puzzle, initial(puzzle)).optimal,
          false,
          'The initial board must require a move',
        );
        for (const baseline of problem.baselines(puzzle)) {
          assert.equal(evaluate(puzzle, baseline.state).optimal, false, baseline.name);
        }
        assert.ok(puzzle.baselines.every((baseline) => !baseline.optimal));
        if (['knapsack', 'sat', 'facility'].includes(id)) {
          // Independent enumeration checks the generated objective and ties.
          const count =
            puzzle.n ?? puzzle.items?.length ?? puzzle.facilities?.length ?? puzzle.points.length;
          let optimalCount = 0;
          for (let mask = 0; mask < 2 ** count; mask++) {
            let value;
            let valid;
            if (id === 'knapsack') {
              let weight = 0;
              value = 0;
              puzzle.items.forEach((item, i) => {
                if (mask & (1 << i)) {
                  weight += item.weight;
                  value += item.value;
                }
              });
              valid = weight <= puzzle.capacity;
              if (valid) assert.ok(value <= -puzzle.best);
              if (valid && value === -puzzle.best) optimalCount++;
            } else if (id === 'sat') {
              valid = puzzle.clauses.every((clause) =>
                clause.some((l) => Boolean(mask & (1 << l.v)) === l.positive),
              );
              if (valid) optimalCount++;
            } else if (mask) {
              const selected = puzzle.facilities.flatMap((_, i) => (mask & (1 << i) ? [i] : []));
              value =
                selected.reduce((sum, i) => sum + puzzle.facilities[i].cost, 0) +
                puzzle.clients.reduce(
                  (sum, _, j) => sum + Math.min(...selected.map((i) => puzzle.costs[i][j])),
                  0,
                );
              assert.ok(value >= puzzle.best - 1e-7);
              if (Math.abs(value - puzzle.best) < 1e-7) optimalCount++;
            }
          }
          assert.equal(optimalCount, 1);
        }
        if (id === 'dom') {
          assert.ok(puzzle.best >= [1, 5, 6][difficulty - 1]);
          assertDominatingOptimum(puzzle);
        }
        if (id === 'color') {
          assert.ok(puzzle.points.length >= 20);
          assert.ok(forcedColorCount(puzzle.points.length, puzzle.edges) < puzzle.points.length);
          assertNoCrossings(puzzle.points, puzzle.edges);
          if (difficulty >= 2) {
            assert.equal(certifyColoringClicks(puzzle).minimum, difficulty === 3 ? 10 : 6);
            assert.ok(
              initial(puzzle).filter((c) => c >= 0).length <= Math.ceil(puzzle.points.length / 5),
            );
          } else assert.ok(forcedColorCount(puzzle.points.length, puzzle.edges) <= 4);
        }
        if (id === 'gallery') {
          assert.equal(
            puzzle.guards.length,
            puzzle.grid.floor.length,
            'Every floor cell is a legal guard position',
          );
          assert.ok(puzzle.best >= 3, 'Two fixed guards cannot solve the gallery');
          for (let i = 0; i < puzzle.guards.length; i++) {
            for (let j = i + 1; j < puzzle.guards.length; j++) {
              assert.notEqual(puzzle.cover[i] | puzzle.cover[j], (1 << puzzle.targets.length) - 1);
            }
          }
        }
        if (id === 'squares') {
          assert.equal(puzzle.squares.length, puzzle.grid.columns * puzzle.grid.rows);
          assert.equal(evaluate(puzzle, puzzle.solution).covered, puzzle.points.length);
        }
      }
    }
  });
}

// Independently enumerate every subset of size <= best. Larger subsets cannot
// improve or tie the objective; deriving coverage from edges also checks p.cover.
function assertDominatingOptimum(puzzle) {
  const count = puzzle.points.length;
  const neighborhoods = Array.from({ length: count }, (_, i) => 1 << i);
  for (const [a, b] of puzzle.edges) {
    neighborhoods[a] |= 1 << b;
    neighborhoods[b] |= 1 << a;
  }
  let optimalCount = 0;
  function visit(start, size, covered) {
    if (covered === (1 << count) - 1) {
      assert.equal(size, puzzle.best, 'No smaller dominating set may exist');
      optimalCount++;
      return;
    }
    if (size === puzzle.best) return;
    for (let i = start; i < count; i++) visit(i + 1, size + 1, covered | neighborhoods[i]);
  }
  visit(0, 0, 0);
  assert.equal(optimalCount, 1, 'Independent enumeration confirms uniqueness');
}

function assertNoCrossings(points, edges) {
  const orientation = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (const [a, b] of edges)
    for (const [c, d] of edges) {
      if (new Set([a, b, c, d]).size < 4) continue;
      const crossing =
        orientation(points[a], points[b], points[c]) *
          orientation(points[a], points[b], points[d]) <
          -1e-6 &&
        orientation(points[c], points[d], points[a]) *
          orientation(points[c], points[d], points[b]) <
          -1e-6;
      assert.equal(crossing, false, 'Spring relaxation must preserve the planar embedding');
    }
}

test('exact set-cover search agrees with independent exhaustive subsets, including ties', () => {
  const random = new Random(2026);
  for (let instance = 0; instance < 150; instance++) {
    const targets = random.int(3, 8);
    const cover = Array.from({ length: random.int(4, 10) }, () =>
      random.int(0, (1 << targets) - 1),
    );
    let best = Infinity;
    let count = 0;
    for (let mask = 1; mask < 1 << cover.length; mask++) {
      const selected = cover.flatMap((_, i) => (mask & (1 << i) ? [i] : []));
      if (coveredBy(cover, selected) !== (1 << targets) - 1) continue;
      if (selected.length < best) {
        best = selected.length;
        count = 1;
      } else if (selected.length === best) count++;
    }
    const exact = solveCover(cover, targets);
    assert.equal(exact.aborted, false);
    assert.equal(exact.best, best);
    assert.equal(exact.count, count);
  }
});

test('set-cover supports more than 32 legal placements and reports aborted search', () => {
  const cover = Array(40).fill(0);
  cover[35] = 1;
  cover[39] = 2;
  assert.deepEqual(solveCover(cover, 2).solution, [35, 39]);
  assert.equal(solveCover([1, 2], 2, 0).aborted, true);
});

test('grid walls block sight while open floor permits it', () => {
  const grid = { x: 0, y: 0, cell: 10, columns: 3, rows: 2, floor: [0, 1, 2, 3, 5] };
  assert.equal(gridVisible({ x: 5, y: 15 }, { x: 25, y: 15 }, grid), false);
  assert.equal(gridVisible({ x: 5, y: 5 }, { x: 25, y: 5 }, grid), true);
  assert.equal(gridVisible({ x: 5, y: 15 }, { x: 5, y: 5 }, grid), true);
});

test('seeds reproduce puzzles; room geometries and color graphs vary', () => {
  for (const id of ['gallery', 'squares', 'color']) {
    assert.deepEqual(generate(id, 42, 2), generate(id, 42, 2));
    const first = generate(id, 7, 2),
      second = generate(id, 42, 2);
    if (id === 'gallery') assert.notDeepEqual(first.grid.floor, second.grid.floor);
    if (id === 'color') assert.notDeepEqual(first.edges, second.edges);
  }
});

test('TSP rejects duplicate cities and job schedules reject precedence cycles', () => {
  const puzzle = generate('tsp', 42);
  assert.equal(evaluate(puzzle, Array(puzzle.points.length).fill(0)).valid, false);
  const job = {
    ops: Array.from({ length: 4 }, () => ({ duration: 2 })),
    jobs: [
      [0, 1],
      [2, 3],
    ],
  };
  assert.equal(
    jobSchedule(job, [
      [1, 2],
      [3, 0],
    ]).valid,
    false,
  );
});
