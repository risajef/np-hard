import { html } from '../html.js';
import { svgBoard } from './common.js';

export function galleryBoard({ puzzle, state, evaluation }) {
  const { grid } = puzzle;
  let drawing = html`
    <rect
      x="${grid.x}"
      y="${grid.y}"
      width="${grid.columns * grid.cell}"
      height="${grid.rows * grid.cell}"
      rx="3"
      fill="#65725e"
    />
  `;
  drawing += grid.floor
    .map((index) => {
      const x = grid.x + (index % grid.columns) * grid.cell;
      const y = grid.y + Math.floor(index / grid.columns) * grid.cell;
      return html`
        <rect
          x="${x}"
          y="${y}"
          width="${grid.cell}"
          height="${grid.cell}"
          fill="#edeadd"
          stroke="#d6d4c5"
          stroke-width="1"
        />
      `;
    })
    .join('');
  for (const index of state) {
    const guard = puzzle.guards[index];
    drawing += puzzle.targets
      .map((target, j) =>
        puzzle.cover[index] & (1 << j)
          ? html`
              <path
                d="M${guard.x},${guard.y} ${target.x},${target.y}"
                stroke="#8cab76"
                opacity=".5"
                pointer-events="none"
              />
            `
          : '',
      )
      .join('');
  }
  drawing += puzzle.targets
    .map(
      (target, i) => html`
        <path
          d="m${target.x} ${target.y - 5} 5 5-5 5-5-5Z"
          fill="${evaluation.cover & (1 << i) ? '#598151' : '#c58a47'}"
          pointer-events="none"
        />
      `,
    )
    .join('');
  drawing += puzzle.guards
    .map(
      (guard, i) => html`
        <g
          class="svg-control grid-position"
          role="button"
          tabindex="0"
          data-node="${i}"
          aria-label="Wache in Rasterfeld ${grid.floor[i] + 1}${state.includes(i) ? ' entfernen' : ' setzen'}"
        >
          <rect
            x="${guard.x - grid.cell / 2}"
            y="${guard.y - grid.cell / 2}"
            width="${grid.cell}"
            height="${grid.cell}"
            fill="transparent"
          />

          ${
            state.includes(i)
              ? html`
                  <circle cx="${guard.x}" cy="${guard.y}" r="13" fill="#486b45" />
                  <text
                    x="${guard.x}"
                    y="${guard.y + 4}"
                    text-anchor="middle"
                    fill="white"
                    font-size="12"
                  >
                    W
                  </text>
                `
              : ''
          }
        </g>
      `,
    )
    .join('');
  return svgBoard(
    puzzle,
    drawing,
    'Klicke auf ein beliebiges Bodenfeld · ◆ Kunstwerk · Dunkel = Wand',
    'placement-board',
  );
}
