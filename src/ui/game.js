import { MODES } from '../modes.js';
import { evaluate } from '../engine.js';
import { icon } from './icons.js';
import { html } from './html.js';
import { renderBoard } from './board.js';

const fmt = (number) =>
  Number.isFinite(number)
    ? new Intl.NumberFormat('de-CH', { maximumFractionDigits: 1 }).format(number)
    : '—';

export function formatTime(seconds) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function renderTspRecord(evaluation, best, improvement) {
  const delta = best && evaluation.valid ? evaluation.value - best.value : null;
  return html`
    <section class="personal-best" aria-label="Deine beste Rundreise">
      <span>DEINE BESTE RUNDREISE</span>
      <strong>${best ? fmt(best.value) : 'Noch keine'}</strong>
      ${
        best
          ? html`
              <p>
                ${delta === null ? 'Bleibt auch beim Zurücksetzen gespeichert.' : Math.abs(delta) < 1e-7 ? 'Diese Route entspricht deinem Bestwert.' : `${fmt(delta)} länger als dein Bestwert.`}
              </p>
              <button class="text-button" data-action="restore-best">Beste Route laden ↗</button>
            `
          : html`
              <p>Eine vollständige Rundreise wird automatisch gespeichert.</p>
            `
      }
      ${
        improvement !== null && improvement !== undefined
          ? html`
              <p class="new-record" role="status">Neue Bestleistung! ${fmt(improvement)} kürzer.</p>
            `
          : ''
      }
    </section>
  `;
}

export function renderGame({
  puzzle: p,
  state: s,
  difficulty,
  color,
  history,
  message,
  help,
  revealed,
  seconds,
  best,
  improvement,
  graphPoints,
}) {
  const m = MODES.find((m) => m.id === p.id),
    e = evaluate(p, s),
    metric =
      p.id === 'tsp'
        ? 'Streckenlänge'
        : p.id === 'knapsack'
          ? 'Gesamtwert'
          : p.id === 'sat'
            ? 'Erfüllte Klauseln'
            : p.id === 'color'
              ? 'Gefärbte Knoten'
              : p.id === 'job'
                ? 'Gesamtdauer'
                : p.id === 'facility'
                  ? 'Gesamtkosten'
                  : 'Ausgewählt';
  return html`
    <div class="game-heading">
      <div>
        <button class="back-link" data-view="home">← Alle Puzzles</button>
        <div class="game-title">
          <span class="game-title-icon">${icon(m.icon)}</span>
          <div>
            <span class="eyebrow">
              ${m.category.toUpperCase()}
              <span>/</span>
              PUZZLE 0${MODES.indexOf(m) + 1}
            </span>
            <h1>${m.name}</h1>
          </div>
        </div>
        <p>${m.description}</p>
      </div>
      <button class="secondary new-puzzle" data-action="new">
        ${icon('refresh')} Neues Puzzle
      </button>
    </div>
    <div class="game-layout">
      <section class="play-panel">
        <div class="board-toolbar">
          <span class="verified">
            ${icon('check')}
            ${p.baselines.length ? 'Eindeutig · Greedy-geprüft' : 'Eindeutig geprüft'}
          </span>
          <label class="difficulty">
            Niveau
            <select id="difficulty" aria-label="Schwierigkeitsgrad">
              <option value="1" ${difficulty === 1 ? 'selected' : ''}>Entspannt</option>
              <option value="2" ${difficulty === 2 ? 'selected' : ''}>Knifflig</option>
              <option value="3" ${difficulty === 3 ? 'selected' : ''}>Anspruchsvoll</option>
            </select>
          </label>
          <span class="timer">
            ◷
            <span id="timer">${formatTime(seconds)}</span>
          </span>
        </div>
        ${
          p.id === 'color'
            ? html`
                <div class="palette">
                  Deine Farbe
                  ${['Koralle', 'Blau', 'Grün']
                    .map(
                      (c, i) => html`
                        <button
                          data-color="${i}"
                          class="${color === i ? 'chosen' : ''}"
                          style="background:${['#e2a197', '#8eb9d7', '#b6c982'][i]}"
                          aria-label="${c}"
                          aria-pressed="${color === i}"
                        >
                          ${color === i ? '✓' : ''}
                        </button>
                      `,
                    )
                    .join('')}
                </div>
              `
            : ''
        }${renderBoard({ puzzle: p, state: s, evaluation: e, graphPoints })}
        <div class="board-bottom">
          <button class="text-button" data-action="undo" ${!history.length ? 'disabled' : ''}>
            ↶ Rückgängig
          </button>
          <button class="text-button" data-action="reset">Zurücksetzen</button>
          <span>
            ${p.id === 'job' ? 'Reihenfolge ändern, Zeitplan optimieren.' : 'Dein nächster Zug zählt.'}
          </span>
        </div>
      </section>
      <aside class="mission">
        <div class="mission-top">
          <span class="eyebrow">DEINE MISSION</span>
          <h2>
            ${p.id === 'sat' ? 'Alles auf wahr.' : p.id === 'color' ? 'Bring Farbe ins Spiel.' : p.id === 'knapsack' ? 'Mach mehr aus weniger.' : 'Finde das Optimum.'}
          </h2>
          <p>${m.goal}</p>
        </div>
        <div class="score">
          <span>${metric}</span>
          <strong>
            ${fmt(e.value)}${
              p.id === 'sat'
                ? html`
                    <small>/ ${p.clauses.length}</small>
                  `
                : p.id === 'color'
                  ? html`
                      <small>/ ${p.points.length}</small>
                    `
                  : p.id === 'facility'
                    ? '<small> €</small>'
                    : p.id === 'job'
                      ? '<small> ZE</small>'
                      : ''
            }
          </strong>
          ${
            e.covered !== undefined
              ? html`
                  <div class="coverage">
                    <span>Abgedeckt</span>
                    <span>${e.covered} / ${e.total}</span>
                  </div>
                  <div class="meter"><i style="width:${(e.covered / e.total) * 100}%"></i></div>
                `
              : ''
          }${
            p.id === 'knapsack'
              ? html`
                  <div class="coverage">
                    <span>Gewicht</span>
                    <span>${e.weight} / ${p.capacity} kg</span>
                  </div>
                `
              : ''
          }
        </div>
        ${p.id === 'tsp' ? renderTspRecord(e, best, improvement) : ''}
        <button class="primary check-button" data-action="check">
          Lösung prüfen ${icon('check')}
        </button>
        ${
          message
            ? html`
                <div class="feedback ${message.type}" role="status">${message.text}</div>
              `
            : '<p class="check-hint">Bereit für deinen Aha-Moment?</p>'
        }
        <div class="instructions">
          <strong>${icon('help')} So funktioniert’s</strong>
          <p>${m.action}</p>
        </div>
        <button class="hint-button" data-action="help">${help ? '−' : '+'} Ein Denkanstoß</button>
        ${
          help
            ? html`
                <p class="hint-copy">${hints[p.id]}</p>
              `
            : ''
        }
        <button class="reveal-button" data-action="reveal">
          ${revealed ? 'Lösung angezeigt' : 'Lösung aufdecken'}
        </button>
        <p class="unique-note">
          ${icon('check')} Exakt gelöst und auf Eindeutigkeit geprüft.
          ${p.id === 'tsp' ? 'Bis auf Start und Laufrichtung.' : p.id === 'color' ? 'Mit zwei vorgegebenen Farben.' : ''}
          ${p.minimumClicks ? `Mindestens ${p.minimumClicks} eigene Farbsetzungen nötig.` : ''}
        </p>
      </aside>
    </div>
  `;
}
const hints = {
  tsp: 'Kreuzen sich zwei Strecken? Bei euklidischen Distanzen wird eine Rundreise durch das Entkreuzen kürzer.',
  color:
    'Farben nur an direkten Nachbarn zu prüfen reicht hier nicht immer. Verfolge eine Vermutung über mehrere Knoten und gehe bei einem Widerspruch zurück.',
  dom: 'Ein Knoten mit vielen Nachbarn ist ein guter Anfang. Prüfe aber auch, wie stark sich die abgedeckten Bereiche überlappen.',
  sat: 'Suche Klauseln, in denen gerade nur ein Literal wahr ist. Wenn du dieses umschaltest, musst du ein anderes Literal retten.',
  knapsack:
    'Ein hohes Verhältnis von Wert zu Gewicht hilft bei der Suche, garantiert aber noch kein optimales Gesamtpaket.',
  job: 'Die längste Maschinenbelegung ist eine untere Schranke. Suche Wartezeiten, die sich durch eine andere Reihenfolge vermeiden lassen.',
  facility:
    'Ein neuer Standort lohnt sich, wenn die eingesparten Kundendistanzen seine Eröffnungskosten übersteigen.',
  gallery:
    'Achte zuerst auf Kunstwerke hinter den einspringenden Ecken. Welche Rasterfelder haben freie Sicht? Die dunklen Felder sind Wände und blockieren Sichtlinien.',
  squares:
    'Beginne mit den Randpunkten, die von besonders wenigen Rasterpositionen überdeckt werden.',
};
