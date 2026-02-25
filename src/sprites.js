const SPRITES = {
  cars: {
    car_1: 'assets/sprites/car_1.png',
    car_2: 'assets/sprites/car_2.png',
    car_3: 'assets/sprites/car_3.png',
    car_4: 'assets/sprites/car_4.png',
  },
  bat: 'assets/sprites/bat.png',
};

const cache = new Map();

export function getSpriteForEntity(entity) {
  if (!entity) return null;
  if (entity.type === 'vehicle') {
    const key = entity.spriteKey && SPRITES.cars[entity.spriteKey] ? entity.spriteKey : 'car_1';
    return { src: SPRITES.cars[key] };
  }
  if (entity.type === 'airMonster') {
    return { src: SPRITES.bat };
  }
  return null;
}

export function resolveSprite(sprite) {
  if (!sprite?.src) return null;
  if (cache.has(sprite.src)) return cache.get(sprite.src);
  const ImageCtor = typeof Image !== 'undefined' ? Image : null;
  const img = ImageCtor ? new ImageCtor() : { src: '' };
  img.src = sprite.src;
  cache.set(sprite.src, img);
  return img;
}
