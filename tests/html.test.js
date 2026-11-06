import test from 'node:test';
import assert from 'node:assert/strict';
import { html } from '../src/ui/html.js';
import { renderShell } from '../src/ui/shell.js';
import { renderHome } from '../src/ui/catalog.js';
import { renderGame } from '../src/ui/game.js';
import { generate, initial, MODES } from '../src/engine.js';

test('templates escape text and quoted attributes while composing nested fragments', () => {
  const attack = '\"><img src=x onerror=alert(1)> & \' ';
  const output = String(html`
    <div title="${attack}">
      ${[
        html`
          <b>${attack}</b>
        `,
        attack,
      ]}
    </div>
  `);
  assert.ok(output.includes('<b>&quot;&gt;&lt;img'));
  assert.ok(!output.includes('<img'));
  assert.ok(!output.includes('&amp;quot;'));
  assert.equal(
    String(html`
      ${{ toString: () => '<script>' }}
    `).trim(),
    '&lt;script&gt;',
  );
});

test('unchecked statistics and search text cannot introduce markup', () => {
  const attack = '<img src=x onerror=alert(1)>';
  const shell = String(
    renderShell(
      { view: 'home', stats: { tsp: { solved: attack } } },
      html`
        <p>content</p>
      `,
    ),
  );
  assert.ok(!shell.includes(attack));
  assert.ok(shell.includes('&lt;img'));
  assert.ok(shell.includes('<p>content</p>'));
  const home = String(renderHome({ filter: 'Alle', query: attack, stats: {}, lastTsp: null }));
  assert.ok(!home.includes(attack));
  assert.ok(home.includes('class="empty"'));
});

test('all boards preserve SVG and nested markup through safe composition', () => {
  for (const { id } of MODES) {
    const puzzle = generate(id, 42, 1);
    const markup = String(
      renderGame({
        puzzle,
        state: initial(puzzle),
        difficulty: 1,
        color: 2,
        history: [],
        seconds: 0,
      }),
    );
    assert.ok(markup.includes('class="check-button"') || markup.includes('check-button'), id);
    assert.ok(!/&lt;(svg|path|rect|button|div|small|span)\b/.test(markup), id);
    assert.ok(!markup.includes('[object Object]'), id);
    assert.ok(markup.includes('<svg'), id);
  }
});
