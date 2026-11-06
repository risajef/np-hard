import { html } from '../html.js';
import { JOB_COLORS, label } from './common.js';

export function jobBoard({ puzzle, state, evaluation }) {
  const schedule = evaluation;
  return html`
    <div class="job-board">
      <div class="board-label">AUFTRÄGE · FESTE REIHENFOLGE</div>
      <div class="job-legend">
        ${puzzle.jobs.map(
          (job, i) => html`
            <div>
              <span style="background:${JOB_COLORS[i]}">${label(i)}</span>
              ${job.map((k) => `M${puzzle.ops[k].machine + 1} (${puzzle.ops[k].duration})`).join(' → ')}
            </div>
          `,
        )}
      </div>
      <div class="board-label">ZIEHE DIE SCHRITTE IN DIE GEWÜNSCHTE REIHENFOLGE</div>
      ${state.map(
        (order, machine) => html`
          <div class="machine-order" data-machine="${machine}">
            <strong>M${machine + 1}</strong>
            ${order.map(
              (index, position) => html`
                <div
                  class="op draggable-op"
                  style="--op-color:${JOB_COLORS[puzzle.ops[index].job]}"
                  data-op="${index}"
                  data-position="${position}"
                  data-machine="${machine}"
                  role="button"
                  tabindex="0"
                  aria-label="${label(puzzle.ops[index].job)}${puzzle.ops[index].step + 1}, Maschine ${machine + 1}, Position ${position + 1}. Leertaste zum Aufnehmen, Pfeiltasten zum Verschieben."
                >
                  <span>
                    <b class="drag-handle">⠿</b>
                    ${label(puzzle.ops[index].job)}${puzzle.ops[index].step + 1}
                    <small>${puzzle.ops[index].duration} ZE</small>
                  </span>
                </div>
              `,
            )}
          </div>
        `,
      )}
      <p class="board-explanation">
        Innerhalb einer Maschine ziehen. Tastatur: Leertaste aufnehmen, ← / → verschieben, Enter
        ablegen, Esc abbrechen.
      </p>
      <div class="board-label">DEIN ZEITPLAN</div>
      ${
        schedule.valid
          ? html`
              <div class="gantt">
                ${state.map(
                  (order, machine) => html`
                    <div class="gantt-row">
                      <span>M${machine + 1}</span>
                      <div>
                        ${order.map(
                          (index) => html`
                            <div
                              style="left:${(schedule.start[index] / schedule.makespan) * 100}%;width:${(puzzle.ops[index].duration / schedule.makespan) * 100}%;background:${JOB_COLORS[puzzle.ops[index].job]}"
                              title="${schedule.start[index]}–${schedule.start[index] + puzzle.ops[index].duration}"
                            >
                              ${label(puzzle.ops[index].job)}${puzzle.ops[index].step + 1}
                            </div>
                          `,
                        )}
                      </div>
                    </div>
                  `,
                )}
                <div class="gantt-axis">
                  <span>0</span>
                  <span>${schedule.makespan} Zeiteinheiten</span>
                </div>
              </div>
            `
          : html`
              <div class="cycle-warning">
                Diese Reihenfolge erzeugt einen Zyklus. Verschiebe einen Schritt, um die Blockade
                aufzulösen.
              </div>
            `
      }
      <div class="sr-only" role="status" id="drag-status"></div>
    </div>
  `;
}
