import { MODES } from '../modes.js';
import { icon } from './icons.js';
import { html } from './html.js';
function card(m, i, stats) {
  return html`
    <button
      class="puzzle-card"
      data-game="${m.id}"
      style="--card-color:${['#e8f0da', '#eae4f4', '#e0edf1', '#f6e7d8', '#e9eddb', '#e8e7f5', '#f4e5dc', '#dfece7', '#e8eaf1'][i]}"
    >
      <div class="card-top">
        <span class="card-icon">${icon(m.icon)}</span>
        <span class="category">${m.category}</span>
        <span class="card-number">0${i + 1}</span>
      </div>
      <h3>${m.name}</h3>
      <p>${m.description}</p>
      <div class="card-bottom">
        <span>
          <i class="tiny-dot"></i>
          ${stats[m.id]?.solved ? `${stats[m.id].solved} gelöst` : 'Bereit zum Knobeln'}
        </span>
        <span class="card-arrow">${icon('arrow')}</span>
      </div>
    </button>
  `;
}
function illustration() {
  return html`
    <svg class="hero-graph" viewBox="0 0 430 255" aria-hidden="true">
      <defs>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1" fill="#b5c6ac" opacity=".5" />
        </pattern>
      </defs>
      <rect width="430" height="255" fill="url(#dots)" />
      <path
        d="M76 155 116 60 260 46 350 123 283 214 158 203Z"
        fill="#d6e3be"
        fill-opacity=".28"
        stroke="#739649"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path
        d="m76 155 184-109m-144 14 167 154m67-91-192 80"
        fill="none"
        stroke="#a7b99b"
        stroke-dasharray="5 6"
      />
      ${[
        [76, 155, 'A'],
        [116, 60, 'B'],
        [260, 46, 'C'],
        [350, 123, 'D'],
        [283, 214, 'E'],
        [158, 203, 'F'],
      ].map(
        ([x, y, t]) => html`
          <circle cx="${x}" cy="${y}" r="13" fill="#fcfdf8" stroke="#647b51" stroke-width="1.5" />
          <text
            x="${x}"
            y="${y + 4}"
            text-anchor="middle"
            font-size="10"
            font-family="monospace"
            fill="#405537"
          >
            ${t}
          </text>
        `,
      )}
      <rect x="158" y="106" width="116" height="34" rx="17" fill="#fcfdf8" stroke="#d7dfcc" />
      <text
        x="216"
        y="127"
        text-anchor="middle"
        font-size="11"
        font-family="monospace"
        fill="#4c633a"
      >
        Dein nächster Zug?
      </text>
    </svg>
  `;
}
export function renderHome({ filter, query, stats, lastTsp }) {
  const shown = MODES.filter(
    (m) =>
      (filter === 'Alle' || m.category === filter) &&
      `${m.name} ${m.description} ${m.short}`.toLowerCase().includes(query.toLowerCase()),
  );
  return html`
    <section class="page-heading">
      <div>
        <span class="eyebrow">
          <span class="green-dot"></span>
          FÜR NEUGIERIGE KÖPFE
        </span>
        <h1>
          Schwer zu lösen.
          <br />
          <span>Leicht anzufangen.</span>
        </h1>
        <p>Die spannendsten Probleme der Informatik. Dein nächstes Puzzle.</p>
      </div>
      <div class="heading-note">
        <span class="note-stars">✳</span>
        <span>
          Ein guter Gedanke
          <br />
          beginnt mit Spielen.
        </span>
      </div>
    </section>
    <section class="feature">
      <div class="feature-copy">
        <span class="feature-label">
          DER PERFEKTE EINSTIEG
          <span>01 / 09</span>
        </span>
        <h2>
          Alle Wege führen irgendwohin.
          <br />
          Welcher ist der kürzeste?
        </h2>
        <p>
          Sechs Städte. Eine Rundreise. Entdecke das
          <br />
          Traveling-Salesperson-Problem Zug für Zug.
        </p>
        <button class="primary" data-game="tsp">
          ${lastTsp ? 'Rundreise fortsetzen' : 'Rundreise starten'} ${icon('arrow')}
        </button>
        <span class="feature-meta">
          ${icon('route')} TSP
          <i>·</i>
          ca. 3–5 Minuten
          <i>·</i>
          Einstieg
        </span>
      </div>
      <div class="feature-art">
        ${illustration()}
        <span class="art-caption">WENIGER STRECKE. MEHR AHA.</span>
      </div>
    </section>
    <section class="catalog">
      <div class="section-heading">
        <div>
          <h2>
            Ein Problem. Viele Möglichkeiten.
            <span class="count-badge">9</span>
          </h2>
          <p>Such dir eine Herausforderung aus. Den Weg findest du selbst.</p>
        </div>
        <label class="search">
          ${icon('search')}
          <input
            id="search"
            type="search"
            placeholder="Puzzle suchen …"
            aria-label="Puzzle suchen"
            value="${query
              .replaceAll('&', '&amp;')
              .replaceAll('"', '&quot;')
              .replaceAll(
                html`
                  <
                `,
                '&lt;',
              )}"
          />
        </label>
      </div>
      <div class="filters" role="group" aria-label="Problemkategorie">
        ${['Alle', 'Graphen', 'Routen', 'Logik', 'Optimierung', 'Planung', 'Geometrie'].map(
          (f) => html`
            <button class="filter ${f === filter ? 'selected' : ''}" data-filter="${f}">
              ${f}
            </button>
          `,
        )}
      </div>
      <div class="card-grid">
        ${
          shown.length
            ? shown.map((m) => card(m, MODES.indexOf(m), stats))
            : html`
                <div class="empty">
                  <h3>Kein Puzzle gefunden.</h3>
                  <p>Versuche einen anderen Suchbegriff.</p>
                </div>
              `
        }
      </div>
    </section>
    <div class="bottom-strip">
      <div>
        ${icon('refresh')}
        <span>
          <strong>Immer eine neue Herausforderung</strong>
          <small>Zufällig generiert. Niemals auswendig gelernt.</small>
        </span>
      </div>
      <div>
        ${icon('check')}
        <span>
          <strong>Genau eine optimale Lösung</strong>
          <small>Für jede Aufgabe vollständig geprüft.</small>
        </span>
      </div>
      <div>
        ${icon('star')}
        <span>
          <strong>Dein Tempo zählt</strong>
          <small>Ohne Countdown und ohne Druck.</small>
        </span>
      </div>
    </div>
  `;
}
export function renderProgress({ stats }) {
  return html`
    <section class="page-heading">
      <div>
        <span class="eyebrow">DEIN DENKRAUM</span>
        <h1>
          Jeder Versuch
          <br />
          <span>bringt dich weiter.</span>
        </h1>
        <p>Deine gelösten Aufgaben auf diesem Gerät.</p>
      </div>
    </section>
    <div class="stats-row">
      <div>
        <strong>${Object.values(stats).reduce((sum, item) => sum + (item.solved || 0), 0)}</strong>
        <span>Puzzles gelöst</span>
      </div>
      <div>
        <strong>${MODES.filter((m) => stats[m.id]?.solved).length} / 9</strong>
        <span>Problemtypen gemeistert</span>
      </div>
      <div>
        <strong>
          ${Math.round(MODES.reduce((n, m) => n + (stats[m.id]?.seconds || 0), 0) / 60)}
        </strong>
        <span>Minuten geknobelt</span>
      </div>
    </div>
    <div class="card-grid">${MODES.map((m, i) => card(m, i, stats))}</div>
  `;
}
