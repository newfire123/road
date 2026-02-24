import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTargetScale } from '../src/scale.js';

test('computeTargetScale applies ratio', () => {
  const base = 960;
  const scale = computeTargetScale(1000, 600, base, 540, 0.8);
  assert.ok(scale <= (1000 / base) * 0.8);
});
