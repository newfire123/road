import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScale } from '../src/scale.js';

test('computeScale returns <= 1 when view smaller', () => {
  assert.ok(computeScale(500, 500) <= 1);
});
