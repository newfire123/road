import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maybeReverseVehicle } from '../src/entities.js';

test('vehicle reverses when random triggers', () => {
  const v = { dir: 1, reverseCooldown: 0 };
  const originalRandom = Math.random;
  Math.random = () => 0;
  maybeReverseVehicle(v, 1, 1);
  Math.random = originalRandom;
  assert.equal(v.dir, -1);
});
