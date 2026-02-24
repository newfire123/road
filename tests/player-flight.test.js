import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, toggleFlight } from '../src/player.js';

test('flight toggles on key press when stamina available', () => {
  const p = createPlayer(1);
  assert.equal(p.isFlying, false);
  toggleFlight(p, true);
  assert.equal(p.isFlying, true);
  toggleFlight(p, true);
  assert.equal(p.isFlying, false);
});

test('flight does not enable when stamina is zero', () => {
  const p = createPlayer(1);
  p.stamina = 0;
  toggleFlight(p, true);
  assert.equal(p.isFlying, false);
});
