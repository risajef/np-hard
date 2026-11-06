import { PuzzleApp } from '../src/app.js';
export function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
export function makeApp(storage = memoryStorage()) {
  const previous = { document: globalThis.document, setInterval: globalThis.setInterval };
  globalThis.document = { addEventListener() {} };
  globalThis.setInterval = () => 0;
  try {
    return new (class extends PuzzleApp {
      render() {}
    })({}, storage);
  } finally {
    Object.assign(globalThis, previous);
  }
}
export function installSession(app, puzzle) {
  app.sessions.set(puzzle.id, app.createSession(puzzle));
  app.view = puzzle.id;
  return app.session;
}
