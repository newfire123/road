export function normalizeStick(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  const x = dx / len;
  const y = dy / len;
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}

export function toDirection(dx, dy, deadZone = 0.2) {
  const len = Math.hypot(dx, dy);
  if (len < deadZone) return { x: 0, y: 0 };
  return normalizeStick(dx, dy);
}

export function mergeInput(keyDir, touchDir) {
  if (touchDir?.active) return { x: touchDir.x, y: touchDir.y };
  return keyDir;
}
