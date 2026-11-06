import { MODES } from '../modes.js';
import { icon } from './icons.js';
import { html } from './html.js';
export function renderShell({ view, stats, modal }, content) {
  return html`
    <aside class="sidebar">
      <a class="brand" href="#" data-view="home">
        <span class="brand-mark">
          n
          <span>p</span>
        </span>
        <span>
          NP
          <span class="brand-light">studio</span>
          <small>DAS PUZZLE-LABOR</small>
        </span>
      </a>
      <div class="nav-caption">DEIN SPIELPLATZ</div>
      <nav>
        <button class="nav-item ${view === 'home' ? 'active' : ''}" data-view="home">
          ${icon('grid')}Entdecken
        </button>
        <button class="nav-item ${view === 'progress' ? 'active' : ''}" data-view="progress">
          ${icon('chart')}Mein Fortschritt
          <span class="nav-count">
            ${Object.values(stats).reduce((sum, item) => sum + (item.solved || 0), 0)}
          </span>
        </button>
      </nav>
      <div class="nav-caption problem-caption">
        DIE PROBLEME
        <span>09</span>
      </div>
      <nav class="problems">
        ${MODES.map(
          (m) => html`
            <button class="nav-item ${view === m.id ? 'active' : ''}" data-game="${m.id}">
              ${icon(m.icon)}${m.short}${
                stats[m.id]?.solved
                  ? html`
                      <span class="nav-dot"></span>
                    `
                  : ''
              }
            </button>
          `,
        )}
      </nav>
      <div class="sidebar-note">
        <span class="spark">✳</span>
        <strong>
          Ein bisschen grübeln.
          <br />
          Ein bisschen wachsen.
        </strong>
        <p>
          Keine Zeitlimits. Kein Druck.
          <br />
          Nur du und das Problem.
        </p>
      </div>
      <div class="sidebar-bottom">
        <span class="avatar">DU</span>
        <div>
          Dein Denkraum
          <small>Fortschritt auf diesem Gerät</small>
        </div>
        <span class="online-dot"></span>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb">
          Dein Denkraum
          <span>/</span>
          <strong>
            ${view === 'home' ? 'Entdecken' : view === 'progress' ? 'Mein Fortschritt' : MODES.find((m) => m.id === view)?.short}
          </strong>
        </div>
        <div class="top-right">
          <span class="local-label">
            <i></i>
            Lokal gespeichert
          </span>
          <button class="icon-button" data-action="about" aria-label="Über NP Studio">
            ${icon('help')}
          </button>
          <span class="avatar small">DU</span>
        </div>
      </header>
      <main>${content}</main>
      <footer>
        <span>
          NP studio
          <span class="footer-dot">·</span>
          Komplexe Probleme. Klare Köpfe.
        </span>
        <span>Mit Neugier gelöst. ${icon('star')}</span>
      </footer>
    </div>
    ${
      modal
        ? html`
            <div class="modal-shade">
              <section class="modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
                <span class="eyebrow">DAS PUZZLE-LABOR</span>
                <h2 id="about-title">Ein Spiel mit Komplexität.</h2>
                <p>
                  NP Studio macht neun schwierige Probleme greifbar. Kleine Instanzen werden im
                  Browser erzeugt und exakt gelöst. Nur Aufgaben mit eindeutigem Optimum werden
                  zugelassen. Zusätzlich müssen die für den Problemtyp festgelegten Greedy-Baselines
                  am Optimum scheitern.
                </p>
                <p>
                  TSP-Routen gelten bis auf Start und Richtung als gleich. Bei der 3-Färbung sind
                  zwei Farben vorgegeben. Job Shop nutzt kanonische Zeitpläne ohne freiwillige
                  Wartezeiten. In der Galerie und bei den Quadraten kannst du jede erlaubte
                  Rasterposition verwenden. Die Wände der Galerie wechseln mit der Aufgabe.
                </p>
                <p>
                  Fortschritt bleibt lokal in deinem Browser. Eine aufgedeckte Lösung zählt nicht
                  als selbst gelöst.
                </p>
                <button class="primary" data-action="close-modal">
                  Verstanden ${icon('check')}
                </button>
              </section>
            </div>
          `
        : ''
    }
  `;
}
