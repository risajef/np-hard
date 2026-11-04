import { generate } from './engine.js';

self.addEventListener('message', ({ data }) => {
  const { request, id, seed, difficulty } = data;
  try {
    self.postMessage({ request, puzzle: generate(id, seed, difficulty) });
  } catch (error) {
    self.postMessage({ request, error: error.message });
  }
});
