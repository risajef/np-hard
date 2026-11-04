import { html } from '../html.js';
import { icon } from '../icons.js';

export function knapsackBoard({ puzzle, state, evaluation }) {
  return html`
    <div class="knapsack-board">
      <div class="capacity">
        <div>
          <span>DEIN RUCKSACK</span>
          <strong class="${evaluation.weight > puzzle.capacity ? 'danger' : ''}">
            ${evaluation.weight}
            <small>/ ${puzzle.capacity} kg</small>
          </strong>
        </div>
        <div class="meter">
          <i
            style="width:${Math.min(100, (evaluation.weight / puzzle.capacity) * 100)}%;background:${evaluation.weight > puzzle.capacity ? '#b96350' : '#88a967'}"
          ></i>
        </div>
      </div>
      <div class="item-scale-legend">
        <span>↕ Höhe = Gewicht · 6 px / kg</span>
        <span>↔ Breite = Wert · 2 px / Wertpunkt</span>
      </div>
      <div class="cargo-items">
        ${puzzle.items
          .map(
            (item, i) => html`
              <button
                class="cargo-item ${state & (1 << i) ? 'packed' : ''}"
                data-node="${i}"
                aria-pressed="${Boolean(state & (1 << i))}"
                aria-label="${item.name}: ${item.weight} kg, Wert ${item.value}"
              >
                <span class="cargo-shape-space">
                  <span
                    class="cargo-shape"
                    style="width:${item.value * 2}px;height:${item.weight * 6}px"
                  >
                    <span>
                      ${icon(['route', 'square', 'logic', 'nodes', 'bag', 'pin', 'gallery', 'schedule', 'star'][i % 9])}
                    </span>
                  </span>
                </span>
                <span class="cargo-name">
                  ${item.name}
                  <b>${state & (1 << i) ? '✓' : '+'}</b>
                </span>
                <span class="cargo-dimensions">
                  ${item.weight} kg
                  <i>·</i>
                  ${item.value} Wert
                </span>
              </button>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}
