import { randomInt } from 'node:crypto';
import { generate, MODES } from '../src/engine.js';
const args = process.argv.slice(2),
  value = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
  };
if (args.includes('--help')) {
  console.log(
    'node scripts/generate.mjs --type tsp --seed 42 --difficulty 1 --count 1 [--include-solution]\nTypes: ' +
      MODES.map((m) => m.id).join(', '),
  );
  process.exit(0);
}
try {
  const type = value('--type', 'tsp'),
    seed = Number(value('--seed', randomInt(0, 2 ** 32))),
    difficulty = Number(value('--difficulty', 1)),
    count = Number(value('--count', 1));
  if (!MODES.some((m) => m.id === type)) throw new Error('Unknown puzzle type. Use --help.');
  if (!Number.isSafeInteger(seed) || seed < 0 || seed >= 2 ** 32)
    throw new Error('Seed must be an unsigned 32-bit integer.');
  if (![1, 2, 3].includes(difficulty)) throw new Error('Difficulty must be 1, 2 or 3.');
  if (!Number.isInteger(count) || count < 1 || count > 1000)
    throw new Error('Count must be between 1 and 1000.');
  const puzzles = Array.from({ length: count }, (_, i) => {
    const p = generate(type, (seed + i) >>> 0, difficulty);
    if (!args.includes('--include-solution')) {
      delete p.solution;
      delete p.best;
    }
    return p;
  });
  console.log(JSON.stringify(count === 1 ? puzzles[0] : puzzles, null, 2));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
