import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel } from '../src/level-gen.js';

test('level 1 has fewer lanes than level 9', () => {
  const l1 = generateLevel(1);
  const l9 = generateLevel(9);
  assert.ok(l1.lanes.length < l9.lanes.length);
});

test('vehicle speed scales with level', () => {
  const l1 = generateLevel(1);
  const l9 = generateLevel(9);
  assert.ok(l1.lanes[0].speed < l9.lanes[0].speed);
});
