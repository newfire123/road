export function computeScale(viewW, viewH, baseW = 960, baseH = 540) {
  return Math.min(viewW / baseW, viewH / baseH);
}

export function computeTargetScale(viewW, viewH, baseW = 960, baseH = 540, ratio = 1) {
  return computeScale(viewW, viewH, baseW, baseH) * ratio;
}
