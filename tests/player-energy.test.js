import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, updateEnergy } from '../src/player.js';

test('energy drains in flight and regens on ground', () => {
  const p = createPlayer();
  p.isFlying = true;
  updateEnergy(p, 1, 20, 10);
  assert.ok(p.energy < 100);
  p.isFlying = false;
  updateEnergy(p, 1, 20, 10);
  assert.ok(p.energy > 0);
});
