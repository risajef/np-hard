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
  const puzzle = { version: 2, seed: 42, difficulty: 2 };
  const records = new PlayerRecords(store);
  const first = [0, 2, 1];
  records.remember(puzzle, first, { valid: true, value: 130 }, false);
  first[0] = 9;
  assert.deepEqual(records.best(puzzle).route, [0, 2, 1], 'Must clone the route');
  assert.equal(records.remember(puzzle, [0, 1, 2], { valid: false, value: 40 }, false), null);
  assert.equal(records.remember(puzzle, [0, 1, 2], { valid: true, value: 150 }, false), null);
  assert.equal(records.remember(puzzle, [0, 1, 2], { valid: true, value: 90 }, true), null);
  const improved = records.remember(puzzle, [0, 1, 2], { valid: true, value: 100 }, false);
  assert.equal(improved.improvement, 30);
  const reloaded = new PlayerRecords(store);
  assert.equal(reloaded.best(puzzle).value, 100);
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
  const puzzle = { version: 2, seed: 1, difficulty: 1 };
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
