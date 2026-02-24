export function isMobileWidth(width, threshold = 900) {
  return width < threshold;
}

export function shouldShowTouchUI(width) {
  return isMobileWidth(width);
}
