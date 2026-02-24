export function computeScale(viewW, viewH, baseW = 960, baseH = 540) {
  return Math.min(viewW / baseW, viewH / baseH);
}
