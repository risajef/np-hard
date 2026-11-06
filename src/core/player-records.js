import { generatorVersion, puzzleIdentity, validIdentity } from './puzzle-identity.js';
import { MODES } from '../modes.js';
import { routeLength } from '../problems/tsp.js';

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0;

/** Browser persistence is optional: private mode or a full quota must not break play. */
export class PlayerRecords {
  constructor(storage) {
    this.storage = storage;
    this.records = this.read('np-studio-tsp-records-v2', {});
    if (!this.records || typeof this.records !== 'object' || Array.isArray(this.records))
      this.records = {};
  }

  read(key, fallback) {
    try {
      return JSON.parse(this.storage?.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  }

  write(key, value) {
    try {
      this.storage?.setItem(key, JSON.stringify(value));
    } catch {
      /* The session remains playable without persistent storage. */
    }
  }

  stats() {
    const stored = this.read('np-studio-stats', {});
    if (!object(stored)) return {};
    return Object.fromEntries(
      MODES.flatMap(({ id }) => {
        const entry = stored[id];
        return object(entry) && nonnegative(entry.solved) && nonnegative(entry.seconds)
          ? [[id, { solved: entry.solved, seconds: entry.seconds }]]
          : [];
      }),
    );
  }

  lastTsp() {
    const value = this.read('np-studio-last-tsp-v2', null);
    return object(value) &&
      nonnegative(value.seed) &&
      value.seed < 2 ** 32 &&
      [1, 2, 3].includes(value.difficulty) &&
      (value.version ?? 2) === generatorVersion('tsp')
      ? { seed: value.seed, difficulty: value.difficulty, version: generatorVersion('tsp') }
      : null;
  }

  identities(key) {
    const value = this.read(key, []);
    return new Set(Array.isArray(value) ? value.filter(validIdentity) : []);
  }

  awarded() {
    if (this.read('np-studio-awarded-v3', null) !== null)
      return this.identities('np-studio-awarded-v3');
    const legacy = this.read('np-studio-awarded-v2', []);
    const migrated = new Set();
    for (const key of Array.isArray(legacy) ? legacy : []) {
      if (typeof key !== 'string') continue;
      const [id, seed, difficulty] = key.split(':');
      const identity = `${id}:${generatorVersion(id)}:${seed}:${difficulty}`;
      if (key.split(':').length === 3 && validIdentity(identity)) migrated.add(identity);
    }
    this.write('np-studio-awarded-v3', [...migrated]);
    return migrated;
  }

  key(puzzle) {
    return puzzleIdentity(puzzle);
  }

  best(puzzle) {
    const record =
      this.records[this.key(puzzle)] ??
      this.records[`${puzzle.version}:${puzzle.seed}:${puzzle.difficulty}`];
    if (
      !object(record) ||
      !Array.isArray(record.route) ||
      record.route.length !== puzzle.points.length ||
      new Set(record.route).size !== record.route.length ||
      !record.route.every(
        (index) => Number.isInteger(index) && index >= 0 && index < puzzle.points.length,
      )
    ) {
      delete this.records[this.key(puzzle)];
      return null;
    }
    // Stored scores are a cache, never authoritative over the regenerated geometry.
    return { route: [...record.route], value: routeLength(puzzle.points, record.route) };
  }

  remember(puzzle, route, evaluation, assisted) {
    if (assisted || !evaluation.valid) return null;
    const previous = this.best(puzzle);
    if (previous && evaluation.value >= previous.value - 1e-7) return null;
    const record = { value: evaluation.value, route: [...route] };
    this.records[this.key(puzzle)] = record;
    this.write('np-studio-tsp-records-v2', this.records);
    return { record, improvement: previous ? previous.value - evaluation.value : null };
  }
}
