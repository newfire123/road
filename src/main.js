import { Game } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game(canvas, ctx);

const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.setKeys(keys);
  game.update(dt);
  game.render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
