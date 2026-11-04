import { GridCoverProblem } from './grid-cover.js';
import { gridVisible } from '../core/geometry.js';

export class ArtGalleryProblem extends GridCoverProblem {
  id = 'gallery';

  create(random, difficulty) {
    const grid = { columns: 9, rows: 6, cell: 62, x: 71, y: 49, floor: [] };
    const available = new Set();
    for (let i = 0; i < grid.columns * grid.rows; i++) if (random.next() < 0.68) available.add(i);
    // Keep one connected gallery, with a different silhouette and interior
    // obstacles for every candidate. No fixed U-shaped room or magic corners.
    let largest = [];
    while (available.size) {
      const component = [available.values().next().value];
      available.delete(component[0]);
      for (let j = 0; j < component.length; j++) {
        const current = component[j];
        const x = current % grid.columns;
        const y = Math.floor(current / grid.columns);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx,
            ny = y + dy;
          const index = ny * grid.columns + nx;
          if (nx >= 0 && nx < grid.columns && ny >= 0 && ny < grid.rows && available.delete(index))
            component.push(index);
        }
      }
      if (component.length > largest.length) largest = component;
    }
    if (largest.length < 25) return null;
    grid.floor = largest.sort((a, b) => a - b);
    const center = (index) => ({
      x: grid.x + ((index % grid.columns) + 0.5) * grid.cell,
      y: grid.y + (Math.floor(index / grid.columns) + 0.5) * grid.cell,
    });
    const guards = grid.floor.map(center);
    const targets = random
      .shuffle(grid.floor)
      .slice(0, 15 + difficulty * 3)
      .map((index) => {
        const point = center(index);
        return { x: point.x + random.int(-23, 23), y: point.y + random.int(-23, 23) };
      });
    const cover = guards.map((a) =>
      targets.reduce((mask, b, j) => (gridVisible(a, b, grid) ? mask | (1 << j) : mask), 0),
    );
    return { grid, guards, targets, cover };
  }
}
