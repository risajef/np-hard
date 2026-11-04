/** Reorder machine operations with mouse, touch, pen or keyboard. */
export function reorderOperations(orders, machine, source, insertion) {
  const result = orders.map((order) => [...order]);
  const [operation] = result[machine].splice(source, 1);
  const destination = insertion > source ? insertion - 1 : insertion;
  result[machine].splice(destination, 0, operation);
  return result;
}

export class JobDragController {
  constructor(root, onDrop) {
    this.root = root;
    this.onDrop = onDrop;
    this.drag = null;
    for (const element of root.querySelectorAll('.draggable-op')) {
      element.addEventListener('pointerdown', (event) => this.pickUp(event, element));
      element.addEventListener('pointermove', (event) => this.move(event));
      element.addEventListener('pointerup', (event) => this.drop(event));
      element.addEventListener('pointercancel', () => this.cancel());
      element.addEventListener('keydown', (event) => this.keyboard(event, element));
    }
  }

  pickUp(event, element) {
    if (event.button !== 0) return;
    const row = element.closest('.machine-order');
    this.drag = {
      element,
      row,
      machine: Number(element.dataset.machine),
      source: Number(element.dataset.position),
      insertion: Number(element.dataset.position),
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
    element.setPointerCapture(event.pointerId);
  }

  move(event) {
    if (!this.drag || this.drag.keyboard) return;
    const drag = this.drag;
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
    if (!drag.active) {
      drag.active = true;
      drag.element.classList.add('dragging');
      this.ghost = drag.element.cloneNode(true);
      this.ghost.className = 'op drag-ghost';
      this.ghost.style.width = `${drag.element.getBoundingClientRect().width}px`;
      document.body.append(this.ghost);
    }
    this.ghost.style.left = `${event.clientX + 14}px`;
    this.ghost.style.top = `${event.clientY + 14}px`;
    const bounds = drag.row.getBoundingClientRect();
    if (event.clientY < bounds.top - 25 || event.clientY > bounds.bottom + 25) {
      drag.valid = false;
      this.clearMarkers();
      return;
    }
    drag.valid = true;
    const operations = [...drag.row.querySelectorAll('.draggable-op')];
    drag.insertion = operations.findIndex(
      (element) =>
        event.clientX <
        element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2,
    );
    if (drag.insertion < 0) drag.insertion = operations.length;
    this.clearMarkers();
    if (drag.insertion < operations.length) operations[drag.insertion].classList.add('drop-before');
    else operations.at(-1).classList.add('drop-after');
  }

  drop() {
    if (!this.drag || this.drag.keyboard) return;
    const { active, valid, machine, source, insertion } = this.drag;
    this.cancel();
    if (active && valid) this.onDrop(machine, source, insertion);
  }

  keyboard(event, element) {
    if ((event.key === ' ' || event.key === 'Enter') && !this.drag) {
      event.preventDefault();
      this.drag = {
        keyboard: true,
        element,
        row: element.closest('.machine-order'),
        machine: Number(element.dataset.machine),
        source: Number(element.dataset.position),
        destination: Number(element.dataset.position),
      };
      element.classList.add('dragging');
      element.setAttribute('aria-pressed', 'true');
      this.announce('Schritt aufgenommen. Mit den Pfeiltasten verschieben.');
      return;
    }
    if (!this.drag?.keyboard || this.drag.element !== element) return;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const operations = [...this.drag.row.querySelectorAll('.draggable-op')];
      this.drag.destination = Math.max(
        0,
        Math.min(
          operations.length - 1,
          this.drag.destination + (event.key === 'ArrowRight' ? 1 : -1),
        ),
      );
      this.clearMarkers();
      operations[this.drag.destination].classList.add('drop-before');
      this.announce(`Zielposition ${this.drag.destination + 1}. Enter zum Ablegen.`);
    } else if ([' ', 'Enter'].includes(event.key)) {
      event.preventDefault();
      const { machine, source, destination } = this.drag;
      const operation = element.dataset.op;
      this.cancel();
      this.onDrop(machine, source, destination > source ? destination + 1 : destination);
      this.root.querySelector(`[data-op="${operation}"]`)?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  }

  announce(text) {
    const status = this.root.querySelector('#drag-status');
    if (status) status.textContent = text;
  }

  clearMarkers() {
    this.root
      .querySelectorAll('.drop-before,.drop-after')
      .forEach((element) => element.classList.remove('drop-before', 'drop-after'));
  }

  cancel() {
    this.drag?.element.classList.remove('dragging');
    this.drag?.element.removeAttribute('aria-pressed');
    this.clearMarkers();
    this.ghost?.remove();
    this.ghost = null;
    this.drag = null;
  }
}
