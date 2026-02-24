import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeVolume } from '../src/audio.js';

test('computeVolume clamps between 0 and 1', () => {
  assert.equal(computeVolume(1.2, 1.2), 1);
  assert.equal(computeVolume(-1, 0.5), 0);
  assert.equal(computeVolume(0.5, 0.5), 0.25);
});
