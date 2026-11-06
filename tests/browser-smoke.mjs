import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const screenshotDirectory =
  process.env.NP_SCREENSHOT_DIR || (await fs.mkdtemp(join(tmpdir(), 'np-studio-ui-')));
const debuggingPort = Number(process.env.NP_CHROME_DEBUG_PORT || 9222);
import { generate, routeLength } from '../src/engine.js';
const tabs = await (await fetch(`http://127.0.0.1:${debuggingPort}/json`)).json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let n = 0;
const pending = new Map(),
  errors = [];
ws.addEventListener('message', (event) => {
  const d = JSON.parse(event.data);
  if (d.id) {
    const [resolve, reject] = pending.get(d.id);
    pending.delete(d.id);
    d.error ? reject(d.error) : resolve(d.result);
  }
  if (d.method === 'Runtime.exceptionThrown')
    errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
});
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++n;
    pending.set(id, [resolve, reject]);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const r = await command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
function check(ok, text) {
  if (!ok) throw Error(text);
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await js(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('Timeout ' + expression);
}
async function click(selector) {
  await js(
    `document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`,
  );
}
async function key(key, code = key, virtual = key === 'Enter' ? 13 : 32) {
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    text: key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined,
    key,
    code,
    windowsVirtualKeyCode: virtual,
  });
  await command('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode: virtual,
  });
}
async function focus(selector) {
  await js(`document.querySelector(${JSON.stringify(selector)}).focus()`);
}
async function focused(selector) {
  return js(`document.activeElement===document.querySelector(${JSON.stringify(selector)})`);
}
async function open(id) {
  await click(`[data-game="${id}"]`);
  await wait(`document.querySelector('.problems .active')?.dataset.game==='${id}'`);
  check(await js('document.documentElement.scrollWidth<=innerWidth'), id + ' overflow');
}
async function shot(name) {
  const r = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await fs.writeFile(join(screenshotDirectory, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function checkLiveGraph(id) {
  check(await js('!!document.querySelector(".live-graph-board")'), 'live SVG mounted');
  await js(`window.__graphTest = {
    node: [...document.querySelectorAll('[data-graph-node]')].find(n =>
      ${id === 'color' ? `Number(n.dataset.graphNode) >= 2 && n.querySelector('circle').getAttribute('fill') === '#fffef8'` : 'Number(n.dataset.graphNode) === 2'}),
    svg: document.querySelector('.live-graph-board svg'),
    paints: 0,
  };
  window.__graphObserver = new MutationObserver(() => window.__graphTest.paints++);
  window.__graphObserver.observe(window.__graphTest.node, {attributes: true, attributeFilter: ['transform']});`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  check(await js('window.__graphTest.paints > 5'), id + ' simulation keeps rendering');
  const initialScore = await js('document.querySelector(".score > strong").textContent.trim()');
  const start = await js(`(() => {
    const r = window.__graphTest.node.getBoundingClientRect();
    return {x: r.x + r.width / 2, y: r.y + r.height / 2};
  })()`);
  await command('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: start.x,
    y: start.y,
    button: 'left',
    clickCount: 1,
  });
  const before = await js('window.__graphTest.node.getAttribute("transform")');
  // A short gesture tests that crossing the drag threshold never toggles state.
  const destination = { x: start.x + (start.x < 700 ? 20 : -20), y: start.y + 14 };
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...destination, buttons: 1 });
  const held = await js('window.__graphTest.node.getAttribute("transform")');
  check(held !== before, id + ' node follows mouse');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check(
    (await js('window.__graphTest.node.getAttribute("transform")')) === held,
    id + ' held node stays pinned',
  );
  await command('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...destination,
    button: 'left',
    clickCount: 1,
  });
  check(
    (await js('document.querySelector(".score > strong").textContent.trim()')) === initialScore,
    id + ' dragging does not change answer',
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  check(
    (await js('window.__graphTest.node.getAttribute("transform")')) !== held,
    id + ' physics resumes on release',
  );
  // Logical re-renders keep the layout but dispose of the old animation loop.
  const oldPosition = await js('window.__graphTest.node.getAttribute("transform")');
  await click('[data-action="help"]');
  const resumed = await js(
    `document.querySelector('[data-graph-node="' + window.__graphTest.node.dataset.graphNode + '"]').getAttribute('transform')`,
  );
  const parse = (value) => value.match(/-?[\d.]+/g).map(Number);
  const a = parse(oldPosition),
    b = parse(resumed);
  check(Math.hypot(a[0] - b[0], a[1] - b[1]) < 15, id + ' layout survives UI render');
  const detached = await js('window.__graphTest.node.getAttribute("transform")');
  await new Promise((resolve) => setTimeout(resolve, 100));
  check(
    (await js('window.__graphTest.node.getAttribute("transform")')) === detached,
    id + ' detached loop stopped',
  );
  await js('window.__graphObserver.disconnect()');
  const clickPosition = await js(`(() => {
    const r = document.querySelector('[data-graph-node="' + window.__graphTest.node.dataset.graphNode + '"]').getBoundingClientRect();
    return {x: r.x + r.width / 2, y: r.y + r.height / 2};
  })()`);
  await command('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...clickPosition,
    button: 'left',
    clickCount: 1,
  });
  await command('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...clickPosition,
    button: 'left',
    clickCount: 1,
  });
  check(
    (await js('document.querySelector(".score > strong").textContent.trim()')) !== initialScore,
    id + ' native click changes answer once',
  );
  await click('[data-action="undo"]');
  check(
    (await js('document.querySelector(".score > strong").textContent.trim()')) === initialScore,
    id + ' one undo restores native click',
  );
}

await command('Runtime.enable');
await command('Page.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});
await command('Page.navigate', { url: process.env.NP_TEST_URL || 'http://127.0.0.1:4173' });
await wait('document.querySelectorAll(".puzzle-card").length===9');
await js(
  "localStorage.removeItem('np-studio-last-tsp-v2');localStorage.removeItem('np-studio-tsp-records-v2');localStorage.removeItem('np-studio-stats');localStorage.removeItem('np-studio-awarded-v2')",
);
await command('Page.reload');
await wait('document.querySelectorAll(".puzzle-card").length===9');
await open('tsp');
const seed = await js(
  'parseInt(document.querySelector(".canvas-caption span:last-child").textContent.replace("SEED ",""),16)',
);
const puzzle = generate('tsp', seed, 1);
let route = [0, 1, 2, 3, 4, 5];
if (Math.abs(routeLength(puzzle.points, route) - puzzle.best) < 1e-7) route = [0, 2, 1, 3, 4, 5];
for (const i of route) await click(`[data-node="${i}"]`);
const first = await js('JSON.parse(localStorage.getItem("np-studio-tsp-records-v2"))');
check(Object.values(first).length === 1, 'record saved');
const old = Object.values(first)[0].value;
await click('[data-action="reset"]');
check(await js('!!document.querySelector(".personal-best strong")'), 'record remains after reset');
for (const i of puzzle.solution) await click(`[data-node="${i}"]`);
check(await js('!!document.querySelector(".new-record")'), 'record improvement visible');
const best = await js(
  'Object.values(JSON.parse(localStorage.getItem("np-studio-tsp-records-v2")))[0].value',
);
check(best < old, 'best improved');
await shot('tsp-record');
await command('Page.reload');
await wait('document.querySelectorAll(".puzzle-card").length===9');
await open('tsp');
check(
  await js('document.querySelector(".canvas-caption").textContent.includes("6 / 6")'),
  'best resumes after reload',
);
for (const id of ['color', 'dom', 'sat', 'knapsack', 'job', 'facility', 'gallery', 'squares']) {
  await open(id);
  if (id === 'color' || id === 'dom') {
    await checkLiveGraph(id);
    if (id === 'color') {
      await focus('[data-color="1"]');
      await key('Enter');
      check(await focused('[data-color="1"]'), 'palette retains focus');
    }
  }
  if (id === 'sat') {
    const v = await js('document.querySelector(".literal-button").dataset.node');
    const before = await js(
      `document.querySelector('.variable-chip[data-node="${v}"]').textContent`,
    );
    await click(`.literal-button[data-node="${v}"]`);
    check(
      (await js(`document.querySelector('.variable-chip[data-node="${v}"]').textContent`)) !==
        before,
      'literal updates shared variable',
    );
    await focus('.literal-button');
    await key('Enter');
    check(await focused('.literal-button'), 'SAT keyboard activation retains exact literal');
  }
  if (id === 'knapsack') {
    const dims = await js(
      '[...document.querySelectorAll(".cargo-shape")].map(el=>[el.style.width,el.style.height])',
    );
    check(new Set(dims.map((d) => d.join())).size > 1, 'proportional items');
    await focus('.cargo-item');
    await key('Enter');
    check(await focused('.cargo-item'), 'native item activation retains focus');
    check(
      await js('document.querySelectorAll(".cargo-item.packed").length===1'),
      'native Enter packs item',
    );
    await key(' ', 'Space');
    check(await focused('.cargo-item'), 'native Space retains focus');
    check(
      await js('document.querySelectorAll(".cargo-item.packed").length===0'),
      'native Space unpacks item',
    );
    await focus('[data-action="help"]');
    await key('Enter');
    check(await focused('[data-action="help"]'), 'hint toggle retains focus');
    await focus('[data-action="reset"]');
    await key('Enter');
    check(await focused('[data-action="reset"]'), 'reset retains focus');
  }
  if (id === 'job') {
    const positions = await js(
      '[...document.querySelector(".machine-order").querySelectorAll(".draggable-op")].map(el=>{const r=el.getBoundingClientRect();return {op:el.dataset.op,x:r.x+r.width/2,y:r.y+r.height/2}})',
    );
    await command('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: positions[0].x,
      y: positions[0].y,
      button: 'left',
      clickCount: 1,
    });
    await command('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: positions[2].x + 20,
      y: positions[2].y,
      buttons: 1,
    });
    await command('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: positions[2].x + 20,
      y: positions[2].y,
      button: 'left',
      clickCount: 1,
    });
    const after = await js(
      '[...document.querySelector(".machine-order").querySelectorAll(".draggable-op")].map(el=>el.dataset.op)',
    );
    check(after.at(-1) === positions[0].op, 'pointer drag reordered');
    await click('[data-action="undo"]');
    check(
      (await js('document.querySelector(".machine-order .draggable-op").dataset.op')) ===
        positions[0].op,
      'undo drag',
    );
  }
  if (id === 'gallery') {
    check(
      (await js('document.querySelectorAll(".grid-position circle").length')) === 0,
      'empty gallery cells have no center marker',
    );
  }
  if (id === 'squares') {
    check(
      (await js('document.querySelectorAll(".square-position").length')) === 551,
      'dense square placement grid',
    );
  }
  if (id === 'gallery' || id === 'squares') {
    const index = await js('[...document.querySelectorAll("[data-node]")].at(-1).dataset.node');
    await click(`[data-node="${index}"]`);
    check(
      (await js('document.querySelector(".score>strong").textContent.trim()')) === '1',
      'grid position added',
    );
    if (id === 'gallery') {
      check(
        (await js('document.querySelectorAll(".grid-position circle").length')) === 1,
        'only a placed guard has a center marker',
      );
    } else {
      const blocked = await js(
        'document.querySelector(".square-position.is-blocked").dataset.node',
      );
      check(
        (await js(
          'document.querySelector(".is-blocked .square-preview").getAttribute("stroke")',
        )) === '#b86a57',
        'blocked placement has red preview',
      );
      await click(`[data-node="${blocked}"]`);
      check(
        (await js('document.querySelector(".score>strong").textContent.trim()')) === '1',
        'overlapping square was not placed',
      );
      check(await js('!!document.querySelector(".feedback.error")'), 'overlap feedback');
    }
    await click(`[data-node="${index}"]`);
    check(
      (await js('document.querySelector(".score>strong").textContent.trim()')) === '0',
      'grid position removed',
    );
  }
  await shot(id);
  await command('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  check(await js('document.documentElement.scrollWidth<=innerWidth'), id + ' mobile overflow');
  await shot(id + '-mobile');
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await click('[data-action="reveal"]');
  await click('[data-action="check"]');
  check(await js('!!document.querySelector(".feedback.success")'), id + ' exact solution UI');
  console.log('PASS', id);
}
// Exercise the actual advanced palette/propagation/undo flow, not only reveal.
await open('color');
await js(`document.querySelector('#difficulty').value='3';
  document.querySelector('#difficulty').dispatchEvent(new Event('change', {bubbles:true}));`);
await wait('document.querySelectorAll("[data-graph-node]").length===61');
const advancedSeed = await js(
  'parseInt(document.querySelector(".canvas-caption span:last-child").textContent.replace("SEED ",""),16)',
);
const advanced = generate('color', advancedSeed, 3);
check(
  await js('parseInt(document.querySelector(".score > strong").textContent)===11'),
  'advanced starts mostly blank',
);
check(
  await js('document.querySelector(".unique-note").textContent.includes("Mindestens 10")'),
  'advanced click minimum visible',
);
check(
  await js(
    `document.querySelector('.live-graph-board svg').getAttribute('viewBox')==='0 0 ${advanced.board.width} ${advanced.board.height}'`,
  ),
  'larger graph canvas',
);
await shot('color-advanced');
await command('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
check(await js('document.documentElement.scrollWidth<=innerWidth'), 'advanced mobile overflow');
check(
  await js(`(() => {
  const viewport = document.querySelector('.graph-viewport');
  if (viewport.scrollWidth <= viewport.clientWidth) return false;
  viewport.scrollLeft = 150;
  const scrolled = viewport.scrollLeft > 0;
  viewport.scrollLeft = 0;
  return scrolled;
})()`),
  'large mobile graph can be panned without shrinking the nodes',
);
await shot('color-advanced-mobile');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});
for (const [step, vertex] of advanced.decisionSeeds.entries()) {
  await click(`[data-color="${advanced.solution[vertex]}"]`);
  await click(`[data-node="${vertex}"]`);
  check(
    (await js('parseInt(document.querySelector(".score > strong").textContent)')) ===
      11 + (step + 1) * 5,
    'one decision resolves only its region',
  );
  if (step === 8) {
    await click('[data-action="check"]');
    check(
      await js('!document.querySelector(".feedback.success")'),
      'nine clicks do not solve advanced puzzle',
    );
  }
}
await click('[data-action="check"]');
check(
  await js('!!document.querySelector(".feedback.success")'),
  'ten correct clicks solve advanced puzzle',
);
await click('[data-action="undo"]');
check(
  await js('parseInt(document.querySelector(".score > strong").textContent)===56'),
  'advanced undo restores whole last region',
);
await click('[data-action="reset"]');
check(
  await js('parseInt(document.querySelector(".score > strong").textContent)===11'),
  'advanced reset restores startup closure',
);
console.log(
  'PASS advanced coloring: ten decisions, bounded propagation, undo/reset and mobile layout',
);
check(errors.length === 0, errors.join('\n'));
console.log('PASS all UI scenarios; no JavaScript errors.');
ws.close();
