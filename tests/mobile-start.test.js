import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowTouchUI } from '../src/mobile.js';

test('shouldShowTouchUI uses mobile width', () => {
  assert.equal(shouldShowTouchUI(500), true);
  assert.equal(shouldShowTouchUI(1200), false);
});
