import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScale } from '../src/scale.js';

test('computeScale uses min ratio', () => {
  assert.equal(computeScale(960, 540, 960, 540), 1);
  assert.equal(computeScale(480, 540, 960, 540), 0.5);
  assert.equal(computeScale(960, 270, 960, 540), 0.5);
});
