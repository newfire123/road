import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStick, toDirection } from '../src/touch.js';

test('normalizeStick clamps to unit circle', () => {
  const v = normalizeStick(2, 0);
  assert.ok(Math.abs(v.x) <= 1);
  assert.ok(Math.abs(v.y) <= 1);
});

test('toDirection returns zero for tiny input', () => {
  const dir = toDirection(0.01, 0.01, 0.2);
  assert.equal(dir.x, 0);
  assert.equal(dir.y, 0);
});
