import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSpriteForEntity, resolveSprite } from '../src/sprites.js';

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

test('resolveSprite returns cached image object for known sprite', () => {
  const sprite = { src: 'assets/sprites/car_red.png' };
  const result = resolveSprite(sprite);
  assert.ok(result);
  assert.ok(result.src.includes('car_red'));
});
