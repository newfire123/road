import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateVehicle } from '../src/entities.js';

test('vehicle wraps across bounds', () => {
  const v = { x: 101, y: 0, w: 10, h: 10, speed: 50, dir: 1 };
  updateVehicle(v, 1, 100);
  assert.ok(v.x < 0);
});
