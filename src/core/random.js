/** Reproducible randomness shared by the browser and the JSON generator. */
export class Random {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    this.state += 0x6d2b79f5;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  points(count, separation = 0) {
    const result = [];
    for (let attempt = 0; result.length < count && attempt < 3000; attempt++) {
      const point = { x: this.int(65, 635), y: this.int(65, 405) };
      if (result.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= separation)) {
        result.push(point);
      }
    }
    if (result.length !== count) throw new Error('Punkte konnten nicht verteilt werden.');
    return result;
  }
}

export function rng(seed) {
  const random = new Random(seed);
  return () => random.next();
}
