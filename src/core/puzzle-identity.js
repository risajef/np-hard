import { MODES } from '../modes.js';

export const generatorVersion = (id) => (id === 'squares' ? 4 : 2);

/** Identity shared by progress, assistance, and personal records. */
export function puzzleIdentity({ id, version, seed, difficulty }) {
  return `${id}:${version}:${seed}:${difficulty}`;
}

export function validIdentity(key) {
  if (typeof key !== 'string') return false;
  const parts = key.split(':');
  return (
    parts.length === 4 &&
    MODES.some(({ id }) => id === parts[0]) &&
    /^[1-9]\d*$/.test(parts[1]) &&
    Number.isSafeInteger(Number(parts[1])) &&
    /^(0|[1-9]\d*)$/.test(parts[2]) &&
    Number(parts[2]) < 2 ** 32 &&
    /^[123]$/.test(parts[3])
  );
}
