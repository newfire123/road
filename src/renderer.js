export function clearScreen(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

export function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function drawText(ctx, text, x, y, size, color, align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Courier New", Courier, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function drawStaminaBar(ctx, x, y, width, height, ratio) {
  drawPixelRect(ctx, x, y, width, height, '#1b1f2a');
  drawPixelRect(ctx, x + 2, y + 2, (width - 4) * ratio, height - 4, '#4ce1b6');
  ctx.strokeStyle = '#2f3545';
  ctx.strokeRect(x, y, width, height);
}

export function drawDashBar(ctx, x, y, width, height, ratio) {
  drawPixelRect(ctx, x, y, width, height, '#1b1f2a');
  drawPixelRect(ctx, x + 2, y + 2, (width - 4) * ratio, height - 4, '#f2a65a');
  ctx.strokeStyle = '#2f3545';
  ctx.strokeRect(x, y, width, height);
}
