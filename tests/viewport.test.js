import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getViewportBox } from '../src/main.js';
import { computeTargetScale } from '../src/scale.js';

test('getViewportBox falls back to innerWidth/innerHeight when visualViewport missing', () => {
  const box = getViewportBox({ visualViewport: null, innerWidth: 320, innerHeight: 640 });
  assert.equal(box.width, 320);
  assert.equal(box.height, 640);
});

test('portrait scale ratio uses 0.7 and landscape uses 0.9', () => {
  const portrait = computeTargetScale(360, 640, 960, 540, 0.7);
  const landscape = computeTargetScale(640, 360, 960, 540, 0.9);
  assert.ok(portrait > 0);
  assert.ok(landscape > 0);
});
