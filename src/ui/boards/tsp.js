import { html } from '../html.js';
import { node, svgBoard } from './common.js';

export function tspBoard({ puzzle, state }) {
  let drawing = '';
  if (state.length > 1) {
    const path = state.map((i) => `${puzzle.points[i].x},${puzzle.points[i].y}`).join(' L');
    drawing += html`
      <path
        d="M${path}${state.length === puzzle.points.length ? ' Z' : ''}"
        fill="none"
        stroke="#6c8b4f"
        stroke-width="3"
      />
    `;
  }
  drawing += puzzle.points
    .map(
      (point, i) =>
        node(point, i, state.includes(i) ? '#486b45' : '#fffef8') +
        (state.includes(i)
          ? html`
              <text x="${point.x + 24}" y="${point.y - 21}" fill="#70816d" font-size="12">
                ${state.indexOf(i) + 1}
              </text>
            `
          : ''),
    )
    .join('');
  return svgBoard(puzzle, drawing, `${state.length} / ${puzzle.points.length} Städte verbunden`);
}
