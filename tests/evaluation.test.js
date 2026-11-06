import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, evaluate, initial, MODES } from '../src/engine.js';

test('all evaluators reject malformed states without throwing or reporting optimal', () => {
  for (const { id } of MODES) {
    const puzzle = generate(id, 42, 1);
    for (const value of [null, undefined, {}, '0', -1, 0.5, NaN, Infinity, [999, 0], Array(100)]) {
      const result = evaluate(puzzle, value);
      assert.equal(result.valid, false, `${id}: ${String(value)}`);
      assert.equal(result.optimal, false, id);
    }
    assert.equal(evaluate(puzzle, puzzle.solution).optimal, true, id);
    assert.equal(evaluate(puzzle, initial(puzzle)).optimal, false, id);
  }
});

test('legal incomplete TSP routes retain meaningful distance', () => {
  const puzzle = generate('tsp', 42, 1);
  assert.equal(evaluate(puzzle, []).value, 0);
  const result = evaluate(puzzle, [0, 1]);
  assert.equal(result.valid, false);
  assert.ok(result.value > 0 && Number.isFinite(result.value));
});

test('job orders must be exact permutations of the assigned machine operations', () => {
  const puzzle = generate('job', 42, 1);
  for (const orders of [
    [],
    [[], []],
    [puzzle.machines[0]],
    [puzzle.machines[1], puzzle.machines[0]],
    [[...puzzle.machines[0], puzzle.machines[0][0]], puzzle.machines[1]],
    [Array(puzzle.machines[0].length), puzzle.machines[1]],
  ]) {
    const result = evaluate(puzzle, orders);
    assert.equal(result.valid, false);
    assert.equal(result.value, Infinity);
    assert.equal(result.optimal, false);
  }
});
