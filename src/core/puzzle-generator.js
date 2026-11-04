let worker;
let nextRequest = 0;
const pending = new Map();

function generatorWorker() {
  if (!worker) {
    worker = new Worker(new URL('../generation-worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', ({ data }) => {
      const promise = pending.get(data.request);
      if (!promise) return;
      pending.delete(data.request);
      if (data.error) promise.reject(new Error(data.error));
      else promise.resolve(data.puzzle);
    });
    worker.addEventListener('error', () => {
      for (const promise of pending.values())
        promise.reject(new Error('Der Aufgaben-Generator konnte nicht ausgeführt werden.'));
      pending.clear();
      worker.terminate();
      worker = null;
    });
  }
  return worker;
}

/** Exact generation runs off the UI thread, so denser searches never freeze play. */
export function generatePuzzle(id, seed, difficulty) {
  return new Promise((resolve, reject) => {
    const generator = generatorWorker();
    const request = ++nextRequest;
    pending.set(request, { resolve, reject });
    generator.postMessage({ request, id, seed, difficulty });
  });
}
