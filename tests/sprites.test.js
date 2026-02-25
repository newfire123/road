import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSpriteForEntity, resolveSprite } from '../src/sprites.js';

test('getSpriteForEntity returns a car sprite for vehicles', () => {
  const sprite = getSpriteForEntity({ type: 'vehicle', spriteKey: 'car_1' });
  assert.ok(sprite);
  assert.ok(sprite.src.includes('car_1.png'));
});

test('getSpriteForEntity returns bat sprite for air monsters', () => {
  const sprite = getSpriteForEntity({ type: 'airMonster' });
  assert.ok(sprite);
  assert.ok(sprite.src.includes('bat.png'));
});

test('resolveSprite caches images by src', () => {
  global.Image = class TestImage {
    constructor() {
      this.src = '';
      this.complete = false;
    }
  };

  const sprite = { src: 'assets/sprites/car_1.png' };
  const first = resolveSprite(sprite);
  const second = resolveSprite(sprite);
  assert.equal(first, second);
  assert.ok(first.src.includes('car_1.png'));
});
