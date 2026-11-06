import test from 'node:test';
import assert from 'node:assert/strict';
import { PuzzleGenerator } from '../src/core/puzzle-generator.js';

function setup(timeoutMs = 1000) {
  const workers = [];
  const generator = new PuzzleGenerator({
    timeoutMs,
    workerFactory: () => {
      const worker = {
        listeners: {},
        terminated: false,
        addEventListener(type, callback) {
          this.listeners[type] = callback;
        },
        postMessage(data) {
          this.request = data.request;
        },
        terminate() {
          this.terminated = true;
        },
        emit(type, data) {
          this.listeners[type]({ data });
        },
      };
      workers.push(worker);
      return worker;
    },
  });
  return { generator, workers };
}

test('generation cancellation terminates work; later requests recover', async () => {
  const { generator, workers } = setup();
  const controller = new AbortController();
  const pending = generator.generate('tsp', 42, 1, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(workers[0].terminated, true);
  const next = generator.generate('tsp', 43, 1);
  workers[1].emit('message', { request: workers[1].request, puzzle: { id: 'tsp', seed: 43 } });
  assert.equal((await next).seed, 43);
  assert.equal(generator.active.size, 0);
  assert.equal(workers[1].terminated, true);
});

test('nonresponding workers time out and release pending state', async () => {
  const { generator, workers } = setup(10);
  await assert.rejects(generator.generate('tsp', 42, 1), /dauert zu lange/);
  assert.equal(workers[0].terminated, true);
  assert.equal(generator.active.size, 0);
});

test('worker failures, unreadable messages, postMessage errors and disposal reject cleanly', async () => {
  for (const event of ['error', 'messageerror']) {
    const { generator, workers } = setup();
    const pending = generator.generate('tsp', 42, 1);
    workers[0].emit(event);
    await assert.rejects(pending);
    assert.equal(generator.active.size, 0);
    assert.equal(workers[0].terminated, true);
  }
  const { generator, workers } = setup();
  const pending = generator.generate('tsp', 42, 1);
  generator.dispose();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(workers[0].terminated, true);
  const failing = new PuzzleGenerator({
    workerFactory: () => {
      throw Error('cannot create');
    },
  });
  await assert.rejects(failing.generate('tsp', 42, 1), /cannot create/);
  assert.equal(failing.active.size, 0);
  const throwing = setup();
  throwing.generator.workerFactory = () => ({
    terminate() {},
    addEventListener() {},
    postMessage() {
      throw Error('cannot send');
    },
  });
  await assert.rejects(throwing.generator.generate('tsp', 42, 1), /cannot send/);
  assert.equal(throwing.generator.active.size, 0);
});
