import { html } from '../html.js';

export const COLORS = ['#e2a197', '#8eb9d7', '#b6c982'];
export const JOB_COLORS = ['#aac5de', '#d2b4ca', '#b6ca8d'];
export const label = (index) =>
  String.fromCharCode(65 + (index % 26)) + (index >= 26 ? Math.floor(index / 26) : '');

export function node(
  point,
  index,
  fill,
  text = label(index),
  locked = false,
  { draggable = false } = {},
) {
  const position = draggable ? { x: 0, y: 0 } : point;
  return html`
    <g
      class="svg-control${draggable ? ' graph-node' : ''}"
      ${
        draggable
          ? html`
              data-graph-node="${index}" transform="translate(${point.x} ${point.y})"
            `
          : ''
      }
      role="button"
      tabindex="0"
      aria-label="Knoten ${label(index)}${locked ? ', vorgegeben' : ''}"
      aria-disabled="${locked}"
      data-node="${index}"
    >
      <circle
        cx="${position.x}"
        cy="${position.y}"
        r="19"
        fill="${fill}"
        stroke="#47624c"
        stroke-width="1.7"
      />
      <text
        x="${position.x}"
        y="${position.y + 5}"
        text-anchor="middle"
        fill="${fill === '#486b45' ? 'white' : '#324e3c'}"
        font-size="12"
        font-weight="600"
      >
        ${text}
      </text>
    </g>
  `;
}

export function svgBoard(puzzle, content, caption, extraClass = '') {
  const { width = 700, height = 470 } = puzzle.board ?? {};
  const scrollable = Boolean(puzzle.board);
  return html`
    <div class="canvas ${extraClass}">
      ${scrollable ? '<div class="graph-viewport" tabindex="0" aria-label="Großes Spielfeld, seitlich scrollbar">' : ''}
      <svg viewBox="0 0 ${width} ${height}" class="game-svg" aria-label="Interaktives Spielfeld">
        <defs>
          <pattern id="boarddots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" fill="#cdd5c5" />
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#boarddots)" />
        ${content}
      </svg>
      ${scrollable ? '</div><p class="graph-scroll-hint">↔ Auf der freien Fläche seitlich scrollen</p>' : ''}
      <div class="canvas-caption">
        <span>${caption}</span>
        <span>SEED ${puzzle.seed.toString(16).toUpperCase()}</span>
      </div>
    </div>
  `;
}
