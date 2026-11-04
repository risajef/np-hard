import './styles/main.css';
import { PuzzleApp } from './app.js';

let storage;
try {
  storage = window.localStorage;
} catch {
  // Browser privacy settings may disable persistent storage.
}

new PuzzleApp(document.querySelector('#app'), storage);
