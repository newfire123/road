export function inputVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.ArrowLeft) x -= 1;
  if (keys.ArrowRight) x += 1;
  if (keys.ArrowUp) y -= 1;
  if (keys.ArrowDown) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}
