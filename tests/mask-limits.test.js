import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solveCover,
  greedyCover,
  pruneCover,
  coveredBy,
  solveSubsets,
  bitCount,
} from '../src/core/combinatorics.js';

test('small-mask algorithms reject unsupported counts before shifting or enumerating', () => {
  for (const count of [-1, 0.5, 31, 32, 64, NaN, Infinity]) {
    assert.throws(() => solveCover([0], count), RangeError);
    assert.throws(() => greedyCover([0], count), RangeError);
    assert.throws(() => pruneCover([0], [], count), RangeError);
    assert.throws(() => solveSubsets(count, () => 0), RangeError);
  }
  assert.deepEqual(solveCover([0], 0), { best: 0, solution: [], count: 1, aborted: false });
  const full = 2 ** 30 - 1;
  assert.deepEqual(solveCover([full], 30).solution, [0]);
  assert.deepEqual(greedyCover([full], 30), [0]);
  assert.equal(bitCount(full), 30);
});

test('malformed and out-of-range coverage masks fail explicitly', () => {
  for (const mask of [-1, 0.5, 4, 2 ** 32, NaN, Infinity]) {
    assert.throws(() => solveCover([mask], 2), RangeError);
    assert.throws(() => greedyCover([mask], 2), RangeError);
    assert.throws(() => pruneCover([mask], [], 2), RangeError);
  }
  assert.throws(() => coveredBy([2 ** 30], [0]), RangeError);
  assert.throws(() => coveredBy([1], [2]), RangeError);
  assert.throws(() => solveCover(Array(2), 2), RangeError);
  assert.throws(() => bitCount(-1), RangeError);
  assert.throws(() => bitCount(2 ** 32), RangeError);
});
