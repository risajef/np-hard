import { renderGame } from '../src/ui/game.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/engine.js';
import { puzzleIdentity } from '../src/core/puzzle-identity.js';
import { makeApp, memoryStorage, installSession, withBrowser } from './app-fixture.js';

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

test('cached sessions and new-puzzle actions retain their own difficulty', async () => {
  const app = makeApp();
  const easy = generate('tsp', 42, 1);
  installSession(app, easy);
  installSession(app, generate('knapsack', 42, 3));
  await app.openProblem('tsp');
  assert.equal(app.session.puzzle.difficulty, 1);
  const markup = String(renderGame({ ...app.session, difficulty: 3 }));
  assert.match(markup, /value="1" selected/);
  let request;
  app.openProblem = (id, options) => {
    request = { id, ...options };
  };
  app.action('new');
  assert.deepEqual(request, { id: 'tsp', fresh: true, difficulty: 1 });
});

test('navigation cancels generation and ignores a late result', async () => {
  await withBrowser(async () => {
    let resolve, signal;
    const app = makeApp(undefined, {
      generate: (...args) => {
        signal = args[3].signal;
        return new Promise((done) => {
          resolve = done;
        });
      },
    });
    const opening = app.openProblem('tsp', { seed: 42 });
    assert.equal(app.busy, true);
    app.navigate('progress');
    assert.equal(signal.aborted, true);
    resolve(generate('tsp', 42, 1));
    await opening;
    assert.equal(app.view, 'progress');
    assert.equal(app.busy, false);
    assert.equal(app.sessions.size, 0);
  });
});

test('a superseding request wins and stale cleanup cannot clear its busy state', async () => {
  await withBrowser(async () => {
    const pending = [];
    const app = makeApp(undefined, {
      generate: () => new Promise((resolve) => pending.push(resolve)),
    });
    const first = app.openProblem('tsp', { seed: 42 });
    const second = app.openProblem('knapsack', { seed: 42, difficulty: 3 });
    pending[0](generate('tsp', 42, 1));
    await first;
    assert.equal(app.busy, true);
    pending[1](generate('knapsack', 42, 3));
    await second;
    assert.equal(app.view, 'knapsack');
    assert.equal(app.session.puzzle.difficulty, 3);
    assert.equal(app.busy, false);
  });
});

test('application startup tolerates malformed persisted collections and preserves healthy stats', () => {
  const storage = memoryStorage();
  storage.setItem('np-studio-awarded-v2', '{}');
  storage.setItem('np-studio-assisted-v3', '42');
  storage.setItem('np-studio-last-tsp-v2', '{"seed":"42","difficulty":1}');
  storage.setItem(
    'np-studio-stats',
    JSON.stringify({ sat: { solved: 2, seconds: 30 }, tsp: null }),
  );
  const app = makeApp(storage);
  assert.deepEqual(app.stats, { sat: { solved: 2, seconds: 30 } });
  assert.equal(app.awardedPuzzles.size, 0);
  assert.equal(app.assistedPuzzles.size, 0);
  assert.equal(app.lastTsp, null);
});

test('disposing the application cancels work and ignores late completion', async () => {
  await withBrowser(async () => {
    let resolve, signal;
    const app = makeApp(undefined, {
      generate: (...args) => {
        signal = args[3].signal;
        return new Promise((done) => {
          resolve = done;
        });
      },
    });
    const opening = app.openProblem('tsp', { seed: 42 });
    app.dispose();
    assert.equal(signal.aborted, true);
    resolve(generate('tsp', 42, 1));
    await opening;
    assert.equal(app.sessions.size, 0);
    assert.equal(app.busy, false);
  });
});

test('display solution remains a complete valid coloring after Undo and repeated reveal', () => {
  for (const difficulty of [1, 2, 3]) {
    const app = makeApp();
    const puzzle = generate('color', 42, difficulty);
    installSession(app, puzzle);
    app.color = 2;
    app.choose(puzzle.decisionSeeds?.[0] ?? 2);
    assert.equal(app.session.history.length, 1);
    app.action('reveal');
    app.action('undo');
    assert.deepEqual(app.session.state, puzzle.solution);
    for (const [a, b] of puzzle.edges) assert.notEqual(app.session.state[a], app.session.state[b]);
    app.action('reveal');
    assert.deepEqual(app.session.state, puzzle.solution);
    const markup = String(renderGame(app.session));
    assert.match(markup, /data-action="undo"\s+disabled/);
    app.action('reset');
    assert.equal(app.session.revealed, false);
    assert.equal(app.session.history.length, 0);
  }
});
