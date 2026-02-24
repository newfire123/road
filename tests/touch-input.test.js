import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeInput } from '../src/touch.js';

test('mergeInput prefers touch direction when active', () => {
  const dir = mergeInput({ x: 1, y: 0 }, { x: 0, y: -1, active: true });
  assert.equal(dir.x, 0);
  assert.equal(dir.y, -1);
});
