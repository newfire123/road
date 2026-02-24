import { aabbIntersects } from './collision.js';

export function shouldCollectCoin(player, coin) {
  if (player.isFlying) return false;
  const box = { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 };
  return aabbIntersects(player, box);
}

export function collectCoin(current, target, coin, canCollect) {
  if (!canCollect) return current;
  if (coin.collected) return current;
  if (current >= target) return current;
  coin.collected = true;
  return current + 1;
}
