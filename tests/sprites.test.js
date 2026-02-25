import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSpriteForEntity } from '../src/sprites.js';

test('getSpriteForEntity returns car sprites for vehicles', () => {
  const sprite = getSpriteForEntity({ type: 'vehicle', color: 'red' });
  assert.ok(sprite);
  assert.ok(sprite.src.includes('car'));
});

test('getSpriteForEntity returns bat sprite for air monster', () => {
  const sprite = getSpriteForEntity({ type: 'airMonster' });
  assert.ok(sprite);
  assert.ok(sprite.src.includes('bat'));
});
