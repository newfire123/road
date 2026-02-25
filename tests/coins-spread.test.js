import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCoinSpread } from '../src/coins.js';

test('coin spread increases with level', () => {
  const low = computeCoinSpread(1);
  const high = computeCoinSpread(9);
  assert.ok(high > low);
});
