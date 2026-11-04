/** Runs one animation loop per visible graph and updates only SVG geometry. */
export class GraphController {
  constructor(svg, simulation, onActivate) {
    this.svg = svg;
    this.simulation = simulation;
    this.onActivate = onActivate;
    this.nodes = [...svg.querySelectorAll('[data-graph-node]')];
    this.edges = [...svg.querySelectorAll('[data-graph-edge]')];
    this.events = new AbortController();
    this.drag = null;
    this.lastFrame = null;
    const options = { signal: this.events.signal };
    svg.addEventListener('pointerdown', (event) => this.pickUp(event), options);
    svg.addEventListener('pointermove', (event) => this.move(event), options);
    svg.addEventListener('pointerup', (event) => this.drop(event), options);
    svg.addEventListener('pointercancel', () => this.cancelDrag(), options);
    svg.addEventListener('lostpointercapture', () => this.cancelDrag(), options);
    svg.addEventListener('click', (event) => this.filterClick(event), {
      ...options,
      capture: true,
    });
    this.paint();
    this.frame = requestAnimationFrame((time) => this.animate(time));
  }

  animate(time) {
    const elapsed = this.lastFrame === null ? 1 / 60 : (time - this.lastFrame) / 1000;
    this.lastFrame = time;
    this.simulation.step(elapsed);
    this.paint();
    this.frame = requestAnimationFrame((next) => this.animate(next));
  }

  paint() {
    const positions = this.simulation.positions;
    for (const node of this.nodes) {
      const point = positions[Number(node.dataset.graphNode)];
      node.setAttribute('transform', `translate(${point.x} ${point.y})`);
    }
    this.edges.forEach((edge, index) => {
      const [a, b] = this.simulation.edges[index];
      edge.setAttribute(
        'd',
        `M${positions[a].x},${positions[a].y} L${positions[b].x},${positions[b].y}`,
      );
    });
  }

  pickUp(event) {
    const element = event.target.closest('[data-graph-node]');
    if (!element || event.button !== 0 || this.drag) return;
    const index = Number(element.dataset.graphNode);
    const point = this.pointerPosition(event);
    const position = this.simulation.positions[index];
    this.drag = {
      element,
      index,
      pointer: event.pointerId,
      moved: false,
      start: { x: event.clientX, y: event.clientY },
      offset: { x: point.x - position.x, y: point.y - position.y },
    };
    this.simulation.pin(index);
    // Capture on the stable SVG root. Capturing a <g> whose transform changes
    // can lose capture in Chromium while the simulation is painting.
    this.svg.setPointerCapture(event.pointerId);
  }

  move(event) {
    if (!this.drag || this.drag.pointer !== event.pointerId) return;
    const drag = this.drag;
    if (!drag.moved && Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) < 4)
      return;
    event.preventDefault();
    drag.moved = true;
    drag.element.classList.add('is-dragging');
    const point = this.pointerPosition(event);
    this.simulation.movePinned({ x: point.x - drag.offset.x, y: point.y - drag.offset.y });
    this.paint();
  }

  pointerPosition(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(
      this.svg.getScreenCTM().inverse(),
    );
  }

  drop(event) {
    if (!this.drag || this.drag.pointer !== event.pointerId) return;
    const { moved, index } = this.drag;
    this.cancelDrag();
    if (!moved) this.onActivate(index);
  }

  cancelDrag() {
    const drag = this.drag;
    this.drag = null;
    this.simulation.release();
    drag?.element.classList.remove('is-dragging');
    if (drag && this.svg.hasPointerCapture(drag.pointer))
      this.svg.releasePointerCapture(drag.pointer);
  }

  filterClick(event) {
    // Pointer clicks are handled on pointerup because root capture changes the
    // native click target. Keyboard / assistive and programmatic clicks remain
    // on the node handlers; dragging must never toggle a puzzle answer.
    if (event.detail > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.events.abort();
    this.cancelDrag();
  }
}
