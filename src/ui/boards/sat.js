import { html } from '../html.js';

export function satBoard({ puzzle, state, evaluation }) {
  const columns = 3;
  const width = 780;
  const rowHeight = 104;
  const height = Math.ceil(puzzle.clauses.length / columns) * rowHeight + 22;
  const positions = puzzle.clauses.map((_, i) => ({
    x: 14 + (i % columns) * 255,
    y: 16 + Math.floor(i / columns) * rowHeight,
  }));
  // Connect successive occurrences of a variable. Every pill toggles the same
  // shared Boolean, including negated occurrences in other clause nodes.
  const last = new Map();
  let edges = '';
  puzzle.clauses.forEach((clause, i) =>
    clause.forEach((literal) => {
      const previous = last.get(literal.v);
      if (previous !== undefined) {
        const a = positions[previous],
          b = positions[i];
        edges += html`
          <path
            d="M${a.x + 117},${a.y + 37} Q${(a.x + b.x) / 2 + 117},${(a.y + b.y) / 2 + 65} ${b.x + 117},${b.y + 37}"
            class="clause-edge"
          />
        `;
      }
      last.set(literal.v, i);
    }),
  );
  const nodes = puzzle.clauses
    .map((clause, i) => {
      const position = positions[i];
      const ok = clause.some((l) => Boolean(state & (1 << l.v)) === l.positive);
      return html`
        <g
          class="clause-node ${ok ? 'satisfied' : ''}"
          transform="translate(${position.x},${position.y})"
        >
          <rect width="234" height="76" rx="12" class="clause-box" />
          <text x="12" y="17" class="clause-number">KLAUSEL ${i + 1}</text>
          <text x="214" y="17" class="clause-status">${ok ? '✓' : '○'}</text>
          ${clause
            .map((literal, j) => {
              const truth = Boolean(state & (1 << literal.v));
              const active = truth === literal.positive;
              return html`
                <g
                  class="literal-button ${active ? 'literal-active' : ''}"
                  role="button"
                  tabindex="0"
                  data-node="${literal.v}"
                  aria-label="Variable x${literal.v + 1} umschalten, derzeit ${truth ? 'wahr' : 'falsch'}"
                  transform="translate(${10 + j * 75},27)"
                >
                  <rect width="65" height="35" rx="7" />
                  <text x="32.5" y="22" text-anchor="middle">
                    ${literal.positive ? '' : '¬'}x${literal.v + 1}
                  </text>
                </g>
              `;
            })
            .join('')}
        </g>
      `;
    })
    .join('');
  return html`
    <div class="sat-graph-board">
      <div class="board-label">
        EIN KNOTEN = EINE ODER-KLAUSEL
        <span>${evaluation.value} / ${puzzle.clauses.length} erfüllt</span>
      </div>
      <div class="variable-legend">
        ${Array.from(
          { length: puzzle.n },
          (_, i) => html`
            <button data-node="${i}" class="variable-chip ${state & (1 << i) ? 'is-true' : ''}">
              x${i + 1}
              <span>${state & (1 << i) ? 'wahr' : 'falsch'}</span>
            </button>
          `,
        ).join('')}
      </div>
      <p class="board-explanation">
        Klicke ein Literal an. Alle Vorkommen derselben Variable ändern sich gemeinsam. Grün
        bedeutet: dieses Literal ist erfüllt.
      </p>
      <div class="clause-scroll">
        <svg viewBox="0 0 ${width} ${height}" class="clause-graph" aria-label="Klauselgraph">
          ${edges}${nodes}
        </svg>
      </div>
    </div>
  `;
}
