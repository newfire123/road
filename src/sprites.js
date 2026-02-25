export function getSpriteForEntity(entity) {
  if (entity.type === 'vehicle') {
    return { src: 'assets/sprites/car_red.png' };
  }
  if (entity.type === 'airMonster') {
    return { src: 'assets/sprites/bat.png' };
  }
  return null;
}
