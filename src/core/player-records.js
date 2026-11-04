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

  key(puzzle) {
    return `${puzzle.version}:${puzzle.seed}:${puzzle.difficulty}`;
  }

  best(puzzle) {
    const record = this.records[this.key(puzzle)];
    return record && Number.isFinite(record.value) && Array.isArray(record.route) ? record : null;
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
