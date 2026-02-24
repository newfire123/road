import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, tryStartDash, updateDash } from '../src/player.js';

test('dash locks direction and consumes time', () => {
  const p = createPlayer(1);
  tryStartDash(p, { x: 1, y: 0 });
  assert.equal(p.dashTimeRemaining > 0, true);
  assert.equal(p.dashVector.x, 1);
  updateDash(p, 0.2);
  assert.equal(p.dashTimeRemaining, 0);
});
