import { html } from '../html.js';
import { COLORS, label, node, svgBoard } from './common.js';

export function graphBoard({ puzzle, state, evaluation, graphPoints }) {
  const points = graphPoints ?? puzzle.points;
  const coloring = puzzle.id === 'color';
  let drawing = puzzle.edges
    .map(
      ([a, b], index) => html`
        <path
          data-graph-edge="${index}"
          d="M${points[a].x},${points[a].y} L${points[b].x},${points[b].y}"
          stroke="${coloring && state[a] >= 0 && state[a] === state[b] ? '#c36c58' : '#aebba4'}"
          stroke-width="2"
        />
      `,
    )
    .join('');
  drawing += points
    .map((point, i) => {
      const chosen = Boolean(state & (1 << i));
      const fill = coloring
        ? COLORS[state[i]] || '#fffef8'
        : chosen
          ? '#486b45'
          : evaluation.cover & (1 << i)
            ? '#dde9ce'
            : '#fffef8';
      return node(point, i, fill, coloring && i < 2 ? '●' : label(i), coloring && i < 2, {
        draggable: true,
      });
    })
    .join('');
  return svgBoard(
    puzzle,
    drawing,
    coloring
      ? 'Klicken zum Färben · Ziehen zum Verschieben · Erzwungene Farben werden automatisch ergänzt'
      : 'Klicken zum Auswählen · Ziehen zum Verschieben · Grün = abgedeckt',
    'live-graph-board',
  );
}
