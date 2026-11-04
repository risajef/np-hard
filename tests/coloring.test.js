import test from 'node:test';
import assert from 'node:assert/strict';
import { propagateColors } from '../src/core/graph.js';
import { ColoringProblem } from '../src/problems/coloring.js';
import { PuzzleApp } from '../src/app.js';

const puzzle = {
  id: 'color',
  points: Array.from({ length: 7 }, () => ({ x: 0, y: 0 })),
  edges: [
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 3],
    [0, 4],
    [3, 4],
    [4, 5],
    [0, 5],
    [5, 6],
    [4, 6],
  ],
};
const problem = new ColoringProblem();

test('coloring fills forced colors at startup and cascades without consulting the solution', () => {
  assert.deepEqual(problem.initial(puzzle), [0, 1, 2, -1, -1, -1, -1]);
  const choices = problem.manualColors(puzzle);
  choices[3] = 1;
  assert.deepEqual(problem.propagate(puzzle, choices), [0, 1, 2, 1, 2, 1, 0]);
  assert.deepEqual(choices, [0, 1, -1, 1, -1, -1, -1], 'Manual input is not mutated');
  assert.deepEqual(
    propagateColors(
      [-1, -1, 0, 1],
      [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
      ],
    ),
    [2, 1, 0, 1],
    'Repeat until stable, including vertices earlier in the array',
  );
});

test('color propagation leaves ambiguous and contradictory vertices blank', () => {
  assert.deepEqual(propagateColors([0, -1], [[0, 1]]), [0, -1]);
  assert.deepEqual(
    propagateColors(
      [0, 1, 2, -1],
      [
        [0, 3],
        [1, 3],
        [2, 3],
      ],
    ),
    [0, 1, 2, -1],
  );
});

test('recoloring rebuilds deductions; undo and reset restore manual choices and the whole chain', () => {
  const session = {
    puzzle,
    state: problem.initial(puzzle),
    colorChoices: problem.manualColors(puzzle),
    history: [],
  };
  const app = Object.create(PuzzleApp.prototype);
  app.sessions = new Map([['color', session]]);
  app.view = 'color';
  app.render = () => {};
  app.color = 1;
  app.choose(3);
  assert.deepEqual(session.state, [0, 1, 2, 1, 2, 1, 0]);
  assert.equal(session.history.length, 1, 'One click and all deductions form one undo step');
  app.color = 0;
  app.choose(3);
  assert.deepEqual(session.state, [0, 1, 2, 0, -1, -1, -1], 'Old automatic colors disappear');
  app.action('undo');
  assert.deepEqual(session.state, [0, 1, 2, 1, 2, 1, 0]);
  assert.equal(session.colorChoices[3], 1);
  app.action('undo');
  assert.deepEqual(session.state, problem.initial(puzzle));
  assert.deepEqual(session.colorChoices, problem.manualColors(puzzle));
  app.choose(0);
  assert.equal(session.history.length, 0, 'Anchors stay fixed');
  app.color = 1;
  app.choose(3);
  app.action('reset');
  assert.deepEqual(session.state, problem.initial(puzzle));
  assert.deepEqual(session.colorChoices, problem.manualColors(puzzle));
  assert.equal(session.history.length, 0);
});

test('advanced puzzles need ten manual decisions in any order, with only small automatic cascades', async () => {
  const { generate, evaluate } = await import('../src/engine.js');
  const challenge = generate('color', 42, 3);
  assert.equal(challenge.minimumClicks, 10);
  assert.equal(challenge.points.length, 61);
  const start = problem.initial(challenge);
  assert.equal(start.filter((c) => c >= 0).length, 11);
  // Independently check the lower bound even when the entire outside is solved.
  const allMembers = new Set();
  for (const region of challenge.decisionRegions) {
    const members = new Set(region);
    assert.equal(region.length, 5);
    for (const i of region) {
      assert.ok(!allMembers.has(i));
      allMembers.add(i);
    }
    const outsideSolved = challenge.solution.map((c, i) => (members.has(i) ? -1 : c));
    assert.deepEqual(
      problem.propagate(challenge, outsideSolved),
      outsideSolved,
      'A region cannot start itself, regardless of progress outside it',
    );
  }
  for (const order of [challenge.decisionSeeds, [...challenge.decisionSeeds].reverse()]) {
    const choices = problem.manualColors(challenge);
    for (const [step, vertex] of order.entries()) {
      choices[vertex] = challenge.solution[vertex];
      const state = problem.propagate(challenge, choices);
      assert.equal(
        evaluate(challenge, state).optimal,
        step === 9,
        'Nine correct clicks cannot finish',
      );
      assert.equal(state.filter((c) => c >= 0).length, 11 + (step + 1) * 5);
    }
  }
  for (let vertex = 2; vertex < start.length; vertex++) {
    if (start[vertex] >= 0) continue;
    const choices = problem.manualColors(challenge);
    choices[vertex] = challenge.solution[vertex];
    assert.ok(
      problem.propagate(challenge, choices).filter((c) => c >= 0).length <= 16,
      'Even the best first click cannot trigger a huge cascade',
    );
  }
});

test('click certificates reject overlapping regions, outside forcing and missing moves', async () => {
  const { generate } = await import('../src/engine.js');
  const { certifyColoringClicks } = await import('../src/core/coloring-challenges.js');
  const challenge = generate('color', 7, 3);
  assert.equal(certifyColoringClicks(challenge).minimum, 10);
  const overlap = structuredClone(challenge);
  overlap.decisionRegions[1].push(overlap.decisionRegions[0][0]);
  assert.equal(certifyColoringClicks(overlap), null);
  const forcing = structuredClone(challenge);
  const vertex = forcing.decisionRegions[0][0];
  const members = new Set(forcing.decisionRegions[0]);
  // Give this vertex neighbors of both other solution colors outside its region.
  for (const color of [0, 1, 2].filter((c) => c !== forcing.solution[vertex])) {
    const neighbor = forcing.solution.findIndex((c, i) => !members.has(i) && c === color);
    forcing.edges.push([vertex, neighbor]);
  }
  assert.equal(certifyColoringClicks(forcing), null);
  assert.equal(
    certifyColoringClicks({ ...challenge, decisionSeeds: challenge.decisionSeeds.slice(1) }),
    null,
  );
});
