import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCoin, shouldCollectCoin } from '../src/coins.js';

const player = { x: 10, y: 10, w: 10, h: 10, isFlying: false };
const coin = { x: 12, y: 12, r: 6, collected: false };

test('collects coin on overlap when not flying', () => {
  const canCollect = shouldCollectCoin(player, coin);
  assert.equal(canCollect, true);
  const count = collectCoin(0, 9, coin, canCollect);
  assert.equal(count, 1);
  assert.equal(coin.collected, true);
});

test('does not collect coin when flying', () => {
  const flyingPlayer = { ...player, isFlying: true };
  const canCollect = shouldCollectCoin(flyingPlayer, coin);
  assert.equal(canCollect, false);
});
