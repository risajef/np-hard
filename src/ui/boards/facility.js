import { html } from '../html.js';
import { label, svgBoard } from './common.js';

export function facilityBoard({ puzzle, state }) {
  const drawing = [];
  puzzle.clients.forEach((client, j) => {
    const nearest = puzzle.facilities.reduce(
      (best, _, i) =>
        state & (1 << i) && (best < 0 || puzzle.costs[i][j] < puzzle.costs[best][j]) ? i : best,
      -1,
    );
    if (nearest >= 0)
      drawing.push(html`
        <path
          d="M${client.x},${client.y} ${puzzle.facilities[nearest].x},${puzzle.facilities[nearest].y}"
          stroke="#b3c4a5"
          stroke-dasharray="4 4"
        />
      `);
    drawing.push(html`
      <circle cx="${client.x}" cy="${client.y}" r="6" fill="#b7a98f" />
      <text x="${client.x + 10}" y="${client.y + 4}" font-size="11" fill="#827764">K${j + 1}</text>
    `);
  });
  drawing.push(
    puzzle.facilities.map(
      (site, i) => html`
        <g
          class="svg-control"
          role="button"
          tabindex="0"
          aria-label="Standort ${label(i)}, Kosten ${site.cost}"
          data-node="${i}"
        >
          <rect
            x="${site.x - 18}"
            y="${site.y - 18}"
            width="36"
            height="36"
            rx="8"
            fill="${state & (1 << i) ? '#486b45' : '#fffef8'}"
            stroke="#62765b"
            stroke-width="1.8"
          />
          <text
            x="${site.x}"
            y="${site.y + 4}"
            text-anchor="middle"
            fill="${state & (1 << i) ? 'white' : '#405337'}"
            font-size="12"
          >
            ${label(i)}
          </text>
          <text x="${site.x}" y="${site.y + 36}" text-anchor="middle" fill="#6b7662" font-size="11">
            ${site.cost} €
          </text>
        </g>
      `,
    ),
  );
  return svgBoard(puzzle, drawing, '■ Standort · ● Kunde');
}
