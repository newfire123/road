import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel } from '../src/level-gen.js';

test('coin spread increases with level', () => {
  const l1 = generateLevel(1);
  const l9 = generateLevel(9);
  assert.ok(l1.coinSpread < l9.coinSpread);
});
