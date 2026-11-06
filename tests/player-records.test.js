import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerRecords } from '../src/core/player-records.js';
import { reorderOperations } from '../src/ui/job-drag.js';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('TSP keeps the best complete unassisted route across reset and reload', () => {
  const store = storage();
  const puzzle = {
    id: 'tsp',
    version: 2,
    seed: 42,
    difficulty: 2,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  };
  const records = new PlayerRecords(store);
  const first = [0, 2, 1, 3];
  records.remember(puzzle, first, { valid: true, value: 20 + 20 * Math.SQRT2 }, false);
  first[0] = 9;
  assert.deepEqual(records.best(puzzle).route, [0, 2, 1, 3], 'Must clone the route');
  assert.equal(records.remember(puzzle, [0, 1, 2, 3], { valid: false, value: 40 }, false), null);
  assert.equal(records.remember(puzzle, [0, 1, 2, 3], { valid: true, value: 60 }, false), null);
  assert.equal(records.remember(puzzle, [0, 1, 2, 3], { valid: true, value: 90 }, true), null);
  const improved = records.remember(puzzle, [0, 1, 2, 3], { valid: true, value: 40 }, false);
  assert.ok(Math.abs(improved.improvement - (20 * Math.SQRT2 - 20)) < 1e-7);
  const reloaded = new PlayerRecords(store);
  assert.equal(reloaded.best(puzzle).value, 40);
  assert.equal(reloaded.best({ ...puzzle, seed: 43 }), null);
  assert.equal(reloaded.best({ ...puzzle, difficulty: 3 }), null);
});

test('unavailable storage does not break best-route tracking', () => {
  const store = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  const records = new PlayerRecords(store);
  const puzzle = {
    id: 'tsp',
    version: 2,
    seed: 1,
    difficulty: 1,
    points: [
      { x: 0, y: 0 },
      { x: 2.5, y: 0 },
    ],
  };
  records.remember(puzzle, [0, 1], { valid: true, value: 5 }, false);
  assert.equal(records.best(puzzle).value, 5);
});

test('drag insertion preserves all operations and their assigned machine', () => {
  const original = [
    [0, 2, 4],
    [1, 3, 5],
  ];
  assert.deepEqual(reorderOperations(original, 0, 0, 3), [
    [2, 4, 0],
    [1, 3, 5],
  ]);
  assert.deepEqual(reorderOperations(original, 0, 2, 0), [
    [4, 0, 2],
    [1, 3, 5],
  ]);
  assert.deepEqual(reorderOperations(original, 0, 1, 2), original);
  assert.deepEqual(
    original,
    [
      [0, 2, 4],
      [1, 3, 5],
    ],
    'Undo needs an unchanged prior state',
  );
});

test('valid JSON with invalid shapes is rejected without discarding healthy entries', () => {
  const store = storage();
  store.setItem('np-studio-awarded-v2', '{}');
  store.setItem('np-studio-last-tsp-v2', '{"seed":-1,"difficulty":1}');
  store.setItem(
    'np-studio-stats',
    JSON.stringify({
      tsp: { solved: 2, seconds: 30 },
      sat: null,
      job: { solved: '<img>', seconds: 0 },
    }),
  );
  const records = new PlayerRecords(store);
  assert.deepEqual([...records.awarded()], []);
  assert.equal(records.lastTsp(), null);
  assert.deepEqual(records.stats(), { tsp: { solved: 2, seconds: 30 } });
  store.setItem('np-studio-awarded-v3', 'null');
  store.setItem(
    'np-studio-awarded-v2',
    JSON.stringify(['tsp:42:1', 'bad:42:1', 'tsp:4294967296:1', null]),
  );
  assert.deepEqual([...records.awarded()], ['tsp:2:42:1']);
});

test('saved routes are checked against geometry and scores are recomputed', () => {
  const store = storage();
  const puzzle = {
    id: 'tsp',
    version: 2,
    seed: 42,
    difficulty: 1,
    points: [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 4 },
    ],
  };
  for (const route of [[999, 0], [0, 0, 1], [0, 1, 3], null]) {
    store.setItem('np-studio-tsp-records-v2', JSON.stringify({ '2:42:1': { value: 1, route } }));
    assert.equal(new PlayerRecords(store).best(puzzle), null);
  }
  store.setItem(
    'np-studio-tsp-records-v2',
    JSON.stringify({ '2:42:1': { value: 1, route: [0, 1, 2] } }),
  );
  assert.equal(new PlayerRecords(store).best(puzzle).value, 12);
});
