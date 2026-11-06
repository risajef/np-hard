export const EPSILON = 1e-7;
export const MAX_MASK_BITS = 30;

function maskCount(count) {
  if (!Number.isInteger(count) || count < 0 || count > MAX_MASK_BITS)
    throw new RangeError(
      `Small masks support 0–${MAX_MASK_BITS} bits; use BigInt for larger problems.`,
    );
}

function coverMasks(cover, count = MAX_MASK_BITS) {
  maskCount(count);
  const full = 2 ** count - 1;
  if (
    !Array.isArray(cover) ||
    !Array.from(cover).every((mask) => Number.isInteger(mask) && mask >= 0 && mask <= full)
  )
    throw new RangeError('Coverage masks must be nonnegative integers within the target range.');
}

export function bitCount(mask) {
  if (!Number.isInteger(mask) || mask < 0 || mask > 0xffffffff)
    throw new RangeError('bitCount requires an unsigned 32-bit integer.');
  let count = 0;
  for (; mask; mask >>>= 1) count += mask & 1;
  return count;
}

export function* permutations(values) {
  if (!values.length) {
    yield [];
    return;
  }
  for (let i = 0; i < values.length; i++) {
    for (const tail of permutations(values.filter((_, j) => i !== j))) {
      yield [values[i], ...tail];
    }
  }
}

/** Minimize a score over every nonempty subset. Infinite scores are infeasible. */
export function solveSubsets(count, score) {
  maskCount(count);
  let best = Infinity;
  let solution = 0;
  let ties = 0;
  for (let mask = 1; mask < 2 ** count; mask++) {
    const value = score(mask);
    if (value < best - EPSILON) {
      best = value;
      solution = mask;
      ties = 1;
    } else if (Number.isFinite(value) && Math.abs(value - best) < EPSILON) {
      ties++;
    }
  }
  return { best, solution, count: ties };
}

export function coveredBy(cover, selected) {
  coverMasks(cover);
  if (
    !Array.isArray(selected) ||
    !Array.from(selected).every(
      (index) => Number.isInteger(index) && index >= 0 && index < cover.length,
    )
  )
    throw new RangeError('Selected coverage indices are out of range.');
  return selected.reduce((mask, index) => mask | cover[index], 0);
}

/** Standard maximum-new-coverage heuristic with explicit tie breaking. */
export function greedyCover(cover, targetCount, reverse = false) {
  coverMasks(cover, targetCount);
  const full = (1 << targetCount) - 1;
  let covered = 0;
  const chosen = [];
  while (covered !== full) {
    let best = -1;
    let gain = 0;
    const indices = Array.from(cover.keys());
    if (reverse) indices.reverse();
    for (const i of indices) {
      const improvement = bitCount(cover[i] & ~covered);
      if (improvement > gain) {
        gain = improvement;
        best = i;
      }
    }
    if (best < 0) return [];
    chosen.push(best);
    covered |= cover[best];
  }
  return chosen;
}

/**
 * Exact finite set cover. Branch on the most constrained uncovered target.
 * The forbidden mask assigns each solution to one branch, so permutations of
 * the same set are never counted as different solutions. BigInt indexes allow
 * more than 32 placement cells; target masks remain at most 30 bits. Optional
 * conflict masks forbid incompatible placements. A valid incumbent bounds the
 * search; uniqueness is still established by visiting every competitive set.
 */
export function solveCover(
  cover,
  targetCount,
  nodeLimit = 100000,
  { conflicts = [], incumbent = null } = {},
) {
  coverMasks(cover, targetCount);
  const full = (1 << targetCount) - 1;
  const candidates = Array.from({ length: targetCount }, (_, target) =>
    cover.flatMap((mask, i) => (mask & (1 << target) ? [i] : [])),
  );
  const validIncumbent =
    incumbent &&
    new Set(incumbent).size === incumbent.length &&
    incumbent.every((i) => Number.isInteger(i) && i >= 0 && i < cover.length) &&
    coveredBy(cover, incumbent) === full &&
    incumbent.every((a, i) =>
      incumbent.slice(i + 1).every((b) => !((conflicts[a] ?? 0n) & (1n << BigInt(b)))),
    );
  let best = validIncumbent ? incumbent.length : Infinity;
  let solution = [];
  let count = 0;
  let visited = 0;
  let aborted = false;

  function search(covered, chosen, forbidden) {
    if (++visited > nodeLimit) {
      aborted = true;
      return;
    }
    if (covered === full) {
      if (chosen.length < best) {
        best = chosen.length;
        solution = [...chosen].sort((a, b) => a - b);
        count = 1;
      } else if (chosen.length === best) {
        if (!count) solution = [...chosen].sort((a, b) => a - b);
        count++;
      }
      return;
    }
    if (chosen.length >= best) return;
    let options = null;
    for (let target = 0; target < targetCount; target++) {
      if (covered & (1 << target)) continue;
      const possible = candidates[target].filter((i) => !(forbidden & (1n << BigInt(i))));
      if (!possible.length) return;
      if (!options || possible.length < options.length) options = possible;
    }
    let maxGain = 0;
    for (let i = 0; i < cover.length; i++) {
      if (!(forbidden & (1n << BigInt(i))))
        maxGain = Math.max(maxGain, bitCount(cover[i] & ~covered));
    }
    if (chosen.length + Math.ceil(bitCount(full & ~covered) / maxGain) > best) return;
    options.sort((a, b) => bitCount(cover[b] & ~covered) - bitCount(cover[a] & ~covered));
    let excluded = forbidden;
    for (const index of options) {
      if (aborted) return;
      const bit = 1n << BigInt(index);
      search(covered | cover[index], [...chosen, index], excluded | bit | (conflicts[index] ?? 0n));
      excluded |= bit;
    }
  }
  search(0, [], 0n);
  return { best, solution, count, aborted };
}

/** Delete redundant choices after greedy selection, in either deletion order. */
export function pruneCover(cover, selected, targetCount, reverse = false) {
  coverMasks(cover, targetCount);
  coveredBy(cover, selected);
  let result = [...selected];
  const order = reverse ? [...selected].reverse() : [...selected];
  const full = (1 << targetCount) - 1;
  for (const index of order) {
    const candidate = result.filter((i) => i !== index);
    if (coveredBy(cover, candidate) === full) result = candidate;
  }
  return result;
}
