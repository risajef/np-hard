import { PuzzleApp } from '../src/app.js';
export function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
export function makeApp(storage = memoryStorage(), options) {
  const previous = { document: globalThis.document, setInterval: globalThis.setInterval };
  globalThis.document = { addEventListener() {} };
  globalThis.setInterval = () => 0;
  try {
    return new (class extends PuzzleApp {
      render() {}
    })({ setAttribute() {}, removeAttribute() {} }, storage, options);
  } finally {
    Object.assign(globalThis, previous);
  }
}
export function installSession(app, puzzle) {
  app.sessions.set(puzzle.id, app.createSession(puzzle));
  app.view = puzzle.id;
  return app.session;
}

export async function withBrowser(callback) {
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = {
    addEventListener() {},
    removeEventListener() {},
    body: { append() {} },
    createElement() {
      const classes = new Set();
      return {
        setAttribute() {},
        remove() {},
        classList: { add: (value) => classes.add(value), contains: (value) => classes.has(value) },
      };
    },
  };
  globalThis.window = { scrollTo() {} };
  try {
    return await callback();
  } finally {
    Object.assign(globalThis, previous);
  }
}
