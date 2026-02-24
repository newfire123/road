import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, updateStamina } from '../src/player.js';

test('stamina drains with drainRate and regens on ground', () => {
  const p = createPlayer(1);
  p.isFlying = true;
  updateStamina(p, 1, { flyDrainPerSec: 20, dashDrainPerSec: 10, regenPerSec: 5 });
  assert.ok(p.stamina < p.maxStamina);
  p.isFlying = false;
  updateStamina(p, 1, { flyDrainPerSec: 20, dashDrainPerSec: 10, regenPerSec: 5 });
  assert.ok(p.stamina > 0);
});
