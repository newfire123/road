import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aabbIntersects } from '../src/collision.js';

test('AABB intersection works', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  const b = { x: 5, y: 5, w: 10, h: 10 };
  const c = { x: 20, y: 20, w: 5, h: 5 };
  assert.equal(aabbIntersects(a, b), true);
  assert.equal(aabbIntersects(a, c), false);
});
