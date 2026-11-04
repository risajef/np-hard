import test from 'node:test';
import assert from 'node:assert/strict';
import { SpringSimulation, segmentsIntersect } from '../src/core/spring-simulation.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('spring state is separate from puzzle coordinates and remains finite in long runs', () => {
  const points = [
    { x: 80, y: 80 },
    { x: 600, y: 80 },
    { x: 350, y: 410 },
  ];
  const original = structuredClone(points);
  const simulation = new SpringSimulation(points, [
    [0, 1],
    [1, 2],
    [2, 0],
  ]);
  for (let step = 0; step < 2000; step++) simulation.step(1 / 60);
  assert.deepEqual(points, original, 'Animation must not mutate puzzle data');
  assert.ok(simulation.positions.some((point, i) => distance(point, original[i]) > 10));
  for (const point of simulation.positions) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(point.x >= 30 && point.x <= 670 && point.y >= 30 && point.y <= 440);
  }
});

test('drag pins a node; release resumes physics even after the layout has settled', () => {
  const simulation = new SpringSimulation(
    [
      { x: 180, y: 160 },
      { x: 500, y: 250 },
    ],
    [[0, 1]],
  );
  for (let i = 0; i < 2000; i++) simulation.step();
  simulation.pin(0);
  simulation.movePinned({ x: 140, y: 100 });
  const held = { ...simulation.positions[0] };
  for (let i = 0; i < 120; i++) simulation.step();
  assert.deepEqual(
    simulation.positions[0],
    held,
    'Pinned node must follow the pointer, not forces',
  );
  simulation.release();
  for (let i = 0; i < 120; i++) simulation.step();
  assert.ok(
    distance(simulation.positions[0], held) > 10,
    'Physics must resume without restarting or reheating',
  );
});

test('planar animation and long pointer jumps preserve non-crossing edges', () => {
  const points = [
    { x: 140, y: 90 },
    { x: 560, y: 90 },
    { x: 560, y: 380 },
    { x: 140, y: 380 },
    { x: 350, y: 220 },
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
  ];
  const simulation = new SpringSimulation(points, edges, { planar: true });
  const assertPlanar = () => {
    for (const [a, b] of edges)
      for (const [c, d] of edges) {
        if (new Set([a, b, c, d]).size === 4)
          assert.equal(
            segmentsIntersect(
              simulation.positions[a],
              simulation.positions[b],
              simulation.positions[c],
              simulation.positions[d],
            ),
            false,
          );
      }
  };
  simulation.pin(4);
  simulation.movePinned({ x: 350, y: 35 });
  assertPlanar();
  simulation.movePinned({ x: 650, y: 430 });
  assertPlanar();
  simulation.release();
  for (let i = 0; i < 600; i++) {
    simulation.step();
    assertPlanar();
  }
});

test('dragging respects node spacing and board boundaries', () => {
  const simulation = new SpringSimulation(
    [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ],
    [[0, 1]],
  );
  simulation.pin(0);
  simulation.movePinned({ x: 200, y: 100 });
  assert.ok(distance(simulation.positions[0], simulation.positions[1]) >= 44);
  simulation.movePinned({ x: -1000, y: -1000 });
  assert.ok(simulation.positions[0].x >= 30 && simulation.positions[0].y >= 30);
  simulation.release();
  simulation.step(999);
  assert.ok(
    simulation.positions.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
  );
});
