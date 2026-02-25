export function getSpriteForEntity(entity) {
  if (entity.type === 'vehicle') {
    return { src: 'assets/sprites/car_red.png' };
  }
  if (entity.type === 'airMonster') {
    return { src: 'assets/sprites/bat.png' };
  }
  return null;
}

const cache = new Map();

export function resolveSprite(sprite) {
  if (!sprite) return null;
  if (cache.has(sprite.src)) return cache.get(sprite.src);
  const img = typeof Image === 'undefined' ? { src: sprite.src } : new Image();
  if (typeof Image !== 'undefined') {
    img.src = sprite.src;
  }
  cache.set(sprite.src, img);
  return img;
}
