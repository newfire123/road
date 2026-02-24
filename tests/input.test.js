import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inputVector } from '../src/input.js';

test('input vector normalizes diagonals', () => {
  const keys = { ArrowUp: true, ArrowRight: true };
  const v = inputVector(keys);
  assert.ok(Math.abs(v.x) < 1 && Math.abs(v.y) < 1);
});
