/** Shared colours for text and effects. */
export const C = {
  bg: '#12201a',
  text: '#f3ead2',
  textDim: '#9fb39f',
  accent: '#c6e09a',
  gold: '#ffd75e',
  heal: '#7fe08a',
  hurt: '#ff5a5a',
} as const;

/** A heart (HP), centred at (x, y), `size` across. */
export function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  full: boolean,
): void {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s * 0.9, y - s * 1.0, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 1.0, x + s * 1.2, y, x, y + s * 0.85);
  ctx.closePath();
  ctx.fillStyle = full ? '#ff6b6b' : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = full ? '#7a1f26' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
