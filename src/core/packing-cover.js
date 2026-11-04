/** BigInt target masks support dense clouds without the 30-point bitwise limit. */
export function countBits(mask) {
  let count = 0;
  while (mask) {
    let word = Number(mask & 0xffffffffn) >>> 0;
    word -= (word >>> 1) & 0x55555555;
    word = (word & 0x33333333) + ((word >>> 2) & 0x33333333);
    count += (((word + (word >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
    mask >>= 32n;
  }
  return count;
}

export function coverageMasks(coverage) {
  return coverage.map((indices) =>
    indices.reduce((mask, index) => mask | (1n << BigInt(index)), 0n),
  );
}

export function coverageUnion(coverage, selected) {
  return selected.reduce((mask, index) => mask | coverage[index], 0n);
}

/**
 * Exact, conflict-aware cover. The lower bound combines maximum coverage with
 * sets of targets that no single legal placement can cover together. Once that
 * bound is reached, two solutions suffice to reject uniqueness. A single
 * solution is returned only after every competitive branch has been explored.
 */
export function solvePacking(coverage, targetCount, conflicts, nodeLimit = 5000) {
  const full = (1n << BigInt(targetCount)) - 1n;
  const bits = coverage.map((_, i) => 1n << BigInt(i));
  const targetBits = Array.from({ length: targetCount }, (_, i) => 1n << BigInt(i));
  const choices = targetBits.map((bit) => coverage.flatMap((mask, i) => (mask & bit ? [i] : [])));
  if (choices.some((list) => !list.length))
    return { best: Infinity, solution: [], count: 0, aborted: false };
  const together = choices.map((list) => list.reduce((mask, i) => mask | coverage[i], 0n));
  const indices = Array.from({ length: targetCount }, (_, i) => i);
  const maxGain = Math.max(...coverage.map(countBits));
  let lowerBound = Math.ceil(targetCount / maxGain);
  for (const order of [
    indices,
    [...indices].reverse(),
    [...indices].sort((a, b) => countBits(together[a]) - countBits(together[b])),
  ]) {
    let excluded = 0n,
      count = 0;
    for (const i of order)
      if (!(excluded & targetBits[i])) {
        excluded |= together[i];
        count++;
      }
    lowerBound = Math.max(lowerBound, count);
  }
  let best = Infinity,
    count = 0,
    solution = [],
    visited = 0,
    aborted = false;
  const disprovedUniqueness = () => count >= 2 && best === lowerBound;

  function search(covered, selected, forbidden) {
    if (disprovedUniqueness()) return;
    if (++visited > nodeLimit) {
      aborted = true;
      return;
    }
    if (covered === full) {
      if (selected.length < best) {
        best = selected.length;
        count = 0;
      }
      if (selected.length === best) {
        solution = [...selected].sort((a, b) => a - b);
        count++;
      }
      return;
    }
    if (selected.length + Math.ceil(countBits(full & ~covered) / maxGain) > best) return;
    let options = null;
    for (let target = 0; target < targetCount; target++) {
      if (covered & targetBits[target]) continue;
      const possible = choices[target].filter((i) => !(forbidden & bits[i]));
      if (!possible.length) return;
      if (!options || possible.length < options.length) options = possible;
    }
    options.sort((a, b) => countBits(coverage[b] & ~covered) - countBits(coverage[a] & ~covered));
    let excluded = forbidden;
    for (const index of options) {
      if (aborted || disprovedUniqueness()) return;
      search(
        covered | coverage[index],
        [...selected, index],
        excluded | bits[index] | conflicts[index],
      );
      excluded |= bits[index];
    }
  }
  search(0n, [], 0n);
  return { best, count, solution, aborted };
}
