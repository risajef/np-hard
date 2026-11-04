import { tspBoard } from './boards/tsp.js';
import { graphBoard } from './boards/graph.js';
import { facilityBoard } from './boards/facility.js';
import { galleryBoard } from './boards/gallery.js';
import { squaresBoard } from './boards/squares.js';
import { satBoard } from './boards/sat.js';
import { knapsackBoard } from './boards/knapsack.js';
import { jobBoard } from './boards/job-shop.js';

const RENDERERS = {
  tsp: tspBoard,
  color: graphBoard,
  dom: graphBoard,
  facility: facilityBoard,
  gallery: galleryBoard,
  squares: squaresBoard,
  sat: satBoard,
  knapsack: knapsackBoard,
  job: jobBoard,
};

export function renderBoard(context) {
  return RENDERERS[context.puzzle.id](context);
}
