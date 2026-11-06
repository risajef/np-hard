const abortError = () => new DOMException('Aufgabenerzeugung abgebrochen.', 'AbortError');

/** Each request owns its worker so cancellation interrupts synchronous searches. */
export class PuzzleGenerator {
  constructor({
    workerFactory = () =>
      new Worker(new URL('../generation-worker.js', import.meta.url), { type: 'module' }),
    timeoutMs = 60000,
  } = {}) {
    this.workerFactory = workerFactory;
    this.timeoutMs = timeoutMs;
    this.active = new Set();
    this.nextRequest = 0;
  }

  generate(id, seed, difficulty, { signal } = {}) {
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      let worker;
      let timer;
      let settled = false;
      const finish = (error, puzzle) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        worker?.terminate();
        this.active.delete(cancel);
        if (error) reject(error);
        else resolve(puzzle);
      };
      const cancel = () => finish(abortError());
      this.active.add(cancel);
      signal?.addEventListener('abort', cancel, { once: true });
      try {
        worker = this.workerFactory();
        const request = ++this.nextRequest;
        worker.addEventListener('message', ({ data }) => {
          if (data?.request !== request) return;
          if (data.error) finish(new Error(data.error));
          else if (!data.puzzle || data.puzzle.id !== id)
            finish(new Error('Ungültige Antwort des Aufgaben-Generators.'));
          else finish(null, data.puzzle);
        });
        worker.addEventListener('error', () =>
          finish(new Error('Der Aufgaben-Generator konnte nicht ausgeführt werden.')),
        );
        worker.addEventListener('messageerror', () =>
          finish(new Error('Die erzeugte Aufgabe konnte nicht gelesen werden.')),
        );
        timer = setTimeout(
          () => finish(new Error('Die Aufgabenerzeugung dauert zu lange. Bitte erneut versuchen.')),
          this.timeoutMs,
        );
        worker.postMessage({ request, id, seed, difficulty });
      } catch (error) {
        finish(error);
      }
    });
  }

  dispose() {
    for (const cancel of this.active) cancel();
  }
}

const generator = new PuzzleGenerator();
export const generatePuzzle = (...args) => generator.generate(...args);
