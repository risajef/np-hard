import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/engine.js';
import { puzzleIdentity } from '../src/core/puzzle-identity.js';
import { makeApp, memoryStorage, installSession } from './app-fixture.js';

test('revealed puzzles remain assisted after reset and reload, without awards or records', () => {
  const storage = memoryStorage();
  const puzzle = generate('tsp', 42, 1);
  const app = makeApp(storage);
  installSession(app, puzzle);
  app.action('reveal');
  app.action('reset');
  assert.equal(app.session.assisted, true);
  const reloaded = makeApp(storage);
  installSession(reloaded, puzzle);
  assert.equal(reloaded.session.assisted, true);
  reloaded.commit([...puzzle.solution]);
  reloaded.check();
  assert.equal(reloaded.stats.tsp, undefined);
  assert.equal(reloaded.records.best(puzzle), null);
  assert.equal(reloaded.awardedPuzzles.size, 0);
  installSession(reloaded, generate('tsp', 43, 1));
  assert.equal(reloaded.session.assisted, false);
  installSession(reloaded, { ...puzzle, version: puzzle.version + 1 });
  assert.equal(reloaded.session.assisted, false);
});

test('legacy awards migrate once and new awards use versioned identities', () => {
  const storage = memoryStorage();
  storage.setItem(
    'np-studio-awarded-v2',
    JSON.stringify(['tsp:42:1', 'squares:7:3', {}, 'tsp:1:1:extra']),
  );
  const app = makeApp(storage);
  const puzzle = generate('tsp', 42, 1);
  installSession(app, puzzle);
  assert.equal(app.session.awarded, true);
  assert.ok(app.awardedPuzzles.has('squares:4:7:3'));
  installSession(app, { ...puzzle, version: 3 });
  assert.equal(app.session.awarded, false);
  app.commit([...puzzle.solution]);
  app.check();
  const reloaded = makeApp(storage);
  assert.ok(reloaded.awardedPuzzles.has(puzzleIdentity({ ...puzzle, version: 3 })));
});
