export function getSpriteForEntity(entity) {
  if (entity.type === 'vehicle') {
    if (entity.color === '#4bc0ff') {
      return { src: 'assets/sprites/car_blue.png' };
    }
    if (entity.color === '#ff8c61') {
      return { src: 'assets/sprites/car_yellow.png' };
    }
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
