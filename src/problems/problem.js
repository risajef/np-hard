import { generatorVersion } from '../core/puzzle-identity.js';
import { Random } from '../core/random.js';

/** Each concrete problem owns generation, exact solving, state and heuristics. */
export class Problem {
  generate(seed, difficulty = 1) {
    const random = new Random(seed);
    for (let attempt = 0; attempt < 6000; attempt++) {
      const candidate = this.create(random, difficulty);
      if (!candidate) continue;
      const puzzle = {
        id: this.id,
        version: generatorVersion(this.id),
        seed,
        difficulty,
        ...candidate,
      };
      const exact = this.solve(puzzle);
      if (exact.aborted || exact.count !== 1 || !Number.isFinite(exact.best)) continue;
      Object.assign(puzzle, exact);
      if (!this.accept(puzzle)) continue;
      if (this.evaluate(puzzle, this.initial(puzzle)).optimal) continue;
      const baselines = this.baselines(puzzle);
      if (baselines.some((b) => this.evaluate(puzzle, b.state).optimal)) continue;
      puzzle.baselines = baselines.map(({ name, state }) => {
        const result = this.evaluate(puzzle, state);
        return {
          name,
          value: Number.isFinite(result.value) ? result.value : null,
          valid: result.valid,
          optimal: result.optimal,
        };
      });
      this.layout(puzzle);
      return puzzle;
    }
    throw new Error('Keine passende Aufgabe gefunden. Bitte noch einmal generieren.');
  }

  accept() {
    return true;
  }
  baselines() {
    return [];
  }
  layout() {}
  initial() {
    return 0;
  }
}
