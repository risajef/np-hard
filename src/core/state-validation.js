/** Player states are small masks or dense arrays of distinct legal indices. */
export function validMask(value, count) {
  return Number.isInteger(value) && value >= 0 && value < 2 ** count;
}

export function validIndices(value, count) {
  return (
    Array.isArray(value) &&
    new Set(value).size === value.length &&
    Array.from(value).every((index) => Number.isInteger(index) && index >= 0 && index < count)
  );
}
