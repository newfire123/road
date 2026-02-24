import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMobileWidth } from '../src/mobile.js';

test('isMobileWidth detects small screens', () => {
  assert.equal(isMobileWidth(500), true);
  assert.equal(isMobileWidth(1200), false);
});
