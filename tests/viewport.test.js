import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getViewportBox } from '../src/main.js';

test('getViewportBox falls back to innerWidth/innerHeight when visualViewport missing', () => {
  const box = getViewportBox({ visualViewport: null, innerWidth: 320, innerHeight: 640 });
  assert.equal(box.width, 320);
  assert.equal(box.height, 640);
});
