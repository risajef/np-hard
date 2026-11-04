import { html } from '../html.js';
import { svgBoard } from './common.js';
import { squaresOverlap } from '../../problems/enclosing-squares.js';

export function squaresBoard({ puzzle, state, evaluation }) {
  const { grid, side } = puzzle;
  let drawing = html`
    <defs>
      <pattern
        id="square-placement-grid"
        width="${grid.cell}"
        height="${grid.cell}"
        x="${grid.x - grid.cell / 2}"
        y="${grid.y - grid.cell / 2}"
        patternUnits="userSpaceOnUse"
      >
        <path d="M${grid.cell} 0 H0 V${grid.cell}" fill="none" stroke="#dce3d2" stroke-width=".6" />
      </pattern>
    </defs>
    <rect width="700" height="470" fill="#f5f7ef" />
    <rect
      x="${grid.x - grid.cell / 2}"
      y="${grid.y - grid.cell / 2}"
      width="${grid.columns * grid.cell}"
      height="${grid.rows * grid.cell}"
      fill="url(#square-placement-grid)"
    />
  `;
  drawing += state
    .map((index) => {
      const square = puzzle.squares[index];
      return html`
        <rect
          class="placed-square"
          x="${square.x - side / 2}"
          y="${square.y - side / 2}"
          width="${side}"
          height="${side}"
          fill="#b9cc9c"
          fill-opacity=".23"
          stroke="#6d8c4d"
          stroke-width="2"
          pointer-events="none"
        />
      `;
    })
    .join('');
  drawing += puzzle.points
    .map(
      (point, i) => html`
        <circle
          cx="${point.x}"
          cy="${point.y}"
          r="5"
          fill="${evaluation.coveredPoints[i] ? '#567b43' : '#b08558'}"
          stroke="#fafbf5"
          stroke-width="1.5"
          pointer-events="none"
        />
      `,
    )
    .join('');
  drawing += puzzle.squares
    .map((square, i) => {
      const selected = state.includes(i);
      const blocked =
        !selected && state.some((index) => squaresOverlap(square, puzzle.squares[index], side));
      return html`
        <g
          class="svg-control grid-position square-position${blocked ? ' is-blocked' : ''}"
          role="button"
          tabindex="0"
          data-node="${i}"
          data-blocked="${blocked}"
          aria-disabled="${blocked}"
          aria-label="Quadrat an Rasterposition ${i + 1}${selected ? ' entfernen' : blocked ? ': durch Überlappung blockiert' : ' setzen'}"
        >
          <rect
            x="${square.x - grid.cell / 2}"
            y="${square.y - grid.cell / 2}"
            width="${grid.cell}"
            height="${grid.cell}"
            fill="transparent"
          />
          ${
            selected
              ? html`
                  <path
                    d="M${square.x - 4},${square.y} h8 M${square.x},${square.y - 4} v8"
                    stroke="#46663d"
                    stroke-width="2"
                    pointer-events="none"
                  />
                `
              : ''
          }
          <rect
            class="square-preview"
            x="${square.x - side / 2}"
            y="${square.y - side / 2}"
            width="${side}"
            height="${side}"
            fill="none"
            stroke="${blocked ? '#b86a57' : '#829866'}"
            stroke-dasharray="5 4"
            pointer-events="none"
          />
        </g>
      `;
    })
    .join('');
  return svgBoard(
    puzzle,
    drawing,
    `${puzzle.squares.length} Rasterpositionen · Keine Überlappung · Rot = blockiert`,
    'placement-board',
  );
}
