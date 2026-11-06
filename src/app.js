import { SpringSimulation } from './core/spring-simulation.js';
import { GraphController } from './ui/graph-controller.js';
import { initial, evaluate, problems } from './engine.js';
import { generatePuzzle } from './core/puzzle-generator.js';
import { PlayerRecords } from './core/player-records.js';
import { renderShell } from './ui/shell.js';
import { renderHome, renderProgress } from './ui/catalog.js';
import { renderGame, formatTime } from './ui/game.js';
import { JobDragController, reorderOperations } from './ui/job-drag.js';

export class PuzzleApp {
  constructor(root, storage) {
    this.root = root;
    this.records = new PlayerRecords(storage);
    this.stats = this.records.stats();
    this.lastTsp = this.records.lastTsp();
    this.awardedPuzzles = this.records.awarded();
    this.sessions = new Map();
    this.view = 'home';
    this.filter = 'Alle';
    this.query = '';
    this.difficulty = 1;
    this.color = 2;
    this.modal = false;
    this.busy = false;
    this.timer = setInterval(() => this.tick(), 1000);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal) {
        this.modal = false;
        this.render();
      }
    });
    this.render();
  }

  get session() {
    return this.sessions.get(this.view);
  }

  async openProblem(id, { fresh = false, difficulty, seed } = {}) {
    if (this.busy) return;
    if (!fresh && seed === undefined && this.sessions.has(id)) {
      this.view = id;
      this.render();
      return;
    }
    this.busy = true;
    this.root.setAttribute('aria-busy', 'true');
    const toast = document.createElement('div');
    toast.className = 'generation-notice';
    toast.setAttribute('role', 'status');
    toast.textContent = 'Neue Aufgabe wird erzeugt und geprüft …';
    document.body.append(toast);
    // Give the browser one paint before the bounded exact generator runs.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    try {
      const resume = !fresh && id === 'tsp' ? this.lastTsp : null;
      const chosenDifficulty = difficulty ?? resume?.difficulty ?? this.difficulty;
      const chosenSeed = seed ?? resume?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
      const puzzle = await generatePuzzle(id, chosenSeed, chosenDifficulty);
      const best = id === 'tsp' ? this.records.best(puzzle) : null;
      const state = best ? [...best.route] : initial(puzzle);
      this.difficulty = chosenDifficulty;
      this.sessions.set(id, {
        puzzle,
        graphSimulation: ['color', 'dom'].includes(id)
          ? new SpringSimulation(puzzle.points, puzzle.edges, {
              ...puzzle.board,
              planar: id === 'color',
            })
          : null,
        state,
        colorChoices: id === 'color' ? problems.get(id).manualColors(puzzle) : null,
        history: [],
        message: null,
        help: false,
        revealed: false,
        assisted: false,
        awarded: this.awardedPuzzles.has(`${id}:${chosenSeed}:${chosenDifficulty}`),
        seconds: 0,
        started: Date.now(),
        improvement: null,
      });
      this.view = id;
      if (id === 'tsp') {
        this.lastTsp = { seed: chosenSeed, difficulty: chosenDifficulty };
        this.records.write('np-studio-last-tsp-v2', this.lastTsp);
      }
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.textContent = error.message;
      toast.classList.add('generation-error');
      setTimeout(() => toast.remove(), 6000);
    } finally {
      this.busy = false;
      this.root.removeAttribute('aria-busy');
      if (!toast.classList.contains('generation-error')) toast.remove();
    }
  }

  render() {
    this.dragController?.cancel();
    this.graphController?.destroy();
    this.graphController = null;
    let content;
    if (this.view === 'home') content = renderHome(this);
    else if (this.view === 'progress') content = renderProgress(this);
    else {
      const session = this.session;
      content = renderGame({
        ...session,
        graphPoints: session.graphSimulation?.positions,
        difficulty: this.difficulty,
        color: this.color,
        best: session.puzzle.id === 'tsp' ? this.records.best(session.puzzle) : null,
      });
    }
    this.root.innerHTML = renderShell(this, content);
    this.bind();
  }

  bind() {
    const all = (selector) => this.root.querySelectorAll(selector);
    all('[data-view]').forEach(
      (element) =>
        (element.onclick = (event) => {
          event.preventDefault();
          this.view = element.dataset.view;
          this.render();
          window.scrollTo(0, 0);
        }),
    );
    all('[data-game]').forEach(
      (element) => (element.onclick = () => this.openProblem(element.dataset.game)),
    );
    all('[data-filter]').forEach(
      (element) =>
        (element.onclick = () => {
          this.filter = element.dataset.filter;
          this.render();
        }),
    );
    this.root.querySelector('#search')?.addEventListener('input', (event) => {
      const position = event.target.selectionStart;
      this.query = event.target.value;
      this.render();
      const search = this.root.querySelector('#search');
      search.focus();
      try {
        search.setSelectionRange(position, position);
      } catch {
        /* search inputs may not support ranges */
      }
    });
    all('[data-node]').forEach((element) => {
      const activate = () => this.choose(Number(element.dataset.node));
      element.onclick = activate;
      if (element.tagName.toLowerCase() === 'g')
        element.onkeydown = (event) => {
          if (['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            const variable = element.dataset.node;
            activate();
            this.root.querySelector(`[data-node="${variable}"]`)?.focus();
          }
        };
    });
    all('[data-color]').forEach(
      (element) =>
        (element.onclick = () => {
          this.color = Number(element.dataset.color);
          this.render();
        }),
    );
    this.root
      .querySelector('#difficulty')
      ?.addEventListener('change', (event) =>
        this.openProblem(this.view, { fresh: true, difficulty: Number(event.target.value) }),
      );
    all('[data-action]').forEach(
      (element) => (element.onclick = () => this.action(element.dataset.action)),
    );
    const graph = this.root.querySelector('.live-graph-board .game-svg');
    if (graph && this.session?.graphSimulation) {
      this.graphController = new GraphController(graph, this.session.graphSimulation, (index) =>
        this.choose(index),
      );
    }
    if (this.view === 'job' && !this.session.revealed) {
      this.dragController = new JobDragController(this.root, (machine, source, insertion) => {
        if (insertion === source || insertion === source + 1) return;
        this.commit(reorderOperations(this.session.state, machine, source, insertion));
      });
    }
  }

  choose(index) {
    const session = this.session;
    if (!session || session.revealed) return;
    const { puzzle, state } = session;
    if (puzzle.id === 'color') {
      if (index < 2) return;
      const choices = [...session.colorChoices];
      choices[index] = this.color;
      this.commit(problems.get('color').propagate(puzzle, choices), choices);
    } else if (puzzle.id === 'tsp') {
      if (state.includes(index)) return;
      this.commit([...state, index]);
    } else if (['gallery', 'squares'].includes(puzzle.id)) {
      const next = state.includes(index) ? state.filter((i) => i !== index) : [...state, index];
      if (puzzle.id === 'squares' && evaluate(puzzle, next).overlapping) {
        session.message = {
          type: 'error',
          text: 'Hier würde sich das Quadrat mit einem gesetzten Quadrat überschneiden. Entferne es zuerst oder wähle eine andere Position.',
        };
        this.render();
        return;
      }
      this.commit(next);
    } else this.commit(state ^ (1 << index));
  }

  commit(next, colorChoices = this.session.colorChoices) {
    const session = this.session;
    session.history.push(
      structuredClone({ state: session.state, colorChoices: session.colorChoices }),
    );
    session.state = next;
    session.colorChoices = colorChoices;
    session.message = null;
    session.improvement = null;
    if (session.puzzle.id === 'tsp') {
      const record = this.records.remember(
        session.puzzle,
        next,
        evaluate(session.puzzle, next),
        session.assisted,
      );
      if (record) session.improvement = record.improvement;
    }
    this.render();
  }

  action(action) {
    if (action === 'about' || action === 'close-modal') {
      this.modal = action === 'about';
      this.render();
      this.root.querySelector('.modal button')?.focus();
      return;
    }
    const session = this.session;
    if (!session) return;
    if (action === 'new') return this.openProblem(this.view, { fresh: true });
    if (action === 'help') session.help = !session.help;
    if (action === 'undo' && session.history.length) {
      Object.assign(session, session.history.pop());
      session.message = null;
      session.improvement = null;
    }
    if (action === 'reset') {
      session.state = initial(session.puzzle);
      if (session.puzzle.id === 'color')
        session.colorChoices = problems.get('color').manualColors(session.puzzle);
      session.history = [];
      session.message = null;
      session.improvement = null;
      session.revealed = false;
    }
    if (action === 'restore-best' && !session.revealed) {
      const best = this.records.best(session.puzzle);
      if (best) return this.commit([...best.route]);
    }
    if (action === 'reveal') {
      session.revealed = true;
      session.assisted = true;
      session.improvement = null;
      session.state = structuredClone(session.puzzle.solution);
      session.message = {
        type: 'info',
        text: 'Hier ist die optimale Lösung. Mit „Neues Puzzle“ kannst du selbst weiterknobeln.',
      };
    }
    if (action === 'check') this.check();
    this.render();
  }

  check() {
    const session = this.session;
    const result = evaluate(session.puzzle, session.state);
    if (result.optimal) {
      if (!session.awarded && !session.assisted) {
        session.awarded = true;
        const previous = this.stats[session.puzzle.id] || { solved: 0, seconds: 0 };
        this.stats[session.puzzle.id] = {
          solved: previous.solved + 1,
          seconds: previous.seconds + session.seconds,
        };
        this.records.write('np-studio-stats', this.stats);
        this.awardedPuzzles.add(
          `${session.puzzle.id}:${session.puzzle.seed}:${session.puzzle.difficulty}`,
        );
        this.records.write('np-studio-awarded-v2', [...this.awardedPuzzles]);
      }
      session.message = {
        type: 'success',
        text: session.assisted
          ? 'Optimale Lösung. Nach dem Aufdecken zählt diese Aufgabe als Übung.'
          : 'Geschafft! Du hast die eindeutige optimale Lösung gefunden.',
      };
    } else {
      const invalid = {
        knapsack: 'Dein Rucksack ist zu schwer. Nimm etwas heraus.',
        tsp: 'Verbinde zuerst alle Städte zu einer Rundreise.',
        job: 'Die Maschinen warten im Kreis aufeinander. Ändere eine Reihenfolge.',
      };
      session.message = {
        type: result.valid ? 'info' : 'error',
        text: result.valid
          ? 'Deine Lösung ist gültig. Es gibt noch eine bessere — probiere weiter!'
          : invalid[session.puzzle.id] ||
            'Noch nicht alle Bedingungen sind erfüllt. Probiere weiter!',
      };
    }
  }

  tick() {
    const session = this.session;
    if (!session || session.awarded || session.revealed) return;
    session.seconds = Math.floor((Date.now() - session.started) / 1000);
    const timer = this.root.querySelector('#timer');
    if (timer) timer.textContent = formatTime(session.seconds);
  }
}
