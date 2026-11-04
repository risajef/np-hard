import { TspProblem } from './problems/tsp.js';
import { ColoringProblem } from './problems/coloring.js';
import { DominatingSetProblem } from './problems/dominating-set.js';
import { SatProblem } from './problems/sat.js';
import { KnapsackProblem } from './problems/knapsack.js';
import { JobShopProblem } from './problems/job-shop.js';
import { FacilityLocationProblem } from './problems/facility-location.js';
import { ArtGalleryProblem } from './problems/art-gallery.js';
import { EnclosingSquaresProblem } from './problems/enclosing-squares.js';

export { MODES } from './modes.js';
export { routeLength } from './problems/tsp.js';
export { jobSchedule } from './problems/job-shop.js';
export { inside, visible } from './core/geometry.js';
export { rng } from './core/random.js';

export const problems = new Map(
  [
    new TspProblem(),
    new ColoringProblem(),
    new DominatingSetProblem(),
    new SatProblem(),
    new KnapsackProblem(),
    new JobShopProblem(),
    new FacilityLocationProblem(),
    new ArtGalleryProblem(),
    new EnclosingSquaresProblem(),
  ].map((problem) => [problem.id, problem]),
);

export function generate(id, seed = Date.now() >>> 0, difficulty = 1) {
  const problem = problems.get(id);
  if (!problem) throw new Error(`Unbekannter Problemtyp: ${id}`);
  if (![1, 2, 3].includes(difficulty)) throw new Error('Schwierigkeit muss 1, 2 oder 3 sein.');
  if (!Number.isInteger(seed) || seed < 0 || seed >= 2 ** 32)
    throw new Error('Seed muss eine vorzeichenlose 32-Bit-Ganzzahl sein.');
  return problem.generate(seed, difficulty);
}

export function initial(puzzle) {
  return problems.get(puzzle.id).initial(puzzle);
}

export function evaluate(puzzle, state) {
  return problems.get(puzzle.id).evaluate(puzzle, state);
}
