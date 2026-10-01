/** Stars and the district medal, drawn on the map, the World view and the Daily Trail. */
type Ctx = CanvasRenderingContext2D;

export function drawStar(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  filled: boolean,
  /** On a light ground (parchment): empty stars are drawn in ink. */
  light = false,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd75e' : light ? 'rgba(58,38,20,0.08)' : 'rgba(255,255,255,0.1)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  ctx.strokeStyle = filled ? '#8a6414' : light ? 'rgba(58,38,20,0.45)' : 'rgba(255,255,255,0.3)';
  ctx.stroke();
}

/** A district's "all ★★★" mark: a gold medal with a check and two ribbon tails. */
export function drawMedal(ctx: Ctx, x: number, y: number, r: number, time: number): void {
  ctx.save();
  ctx.fillStyle = '#c0392b';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.2, y + r * 0.3);
    ctx.lineTo(x + side * r * 0.85, y + r * 1.55);
    ctx.lineTo(x + side * r * 0.45, y + r * 1.35);
    ctx.lineTo(x + side * r * 0.2, y + r * 1.7);
    ctx.lineTo(x - side * r * 0.1, y + r * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#8a5a08';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.84, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd75e';
  ctx.fill();
  if (time) {
    const k = (time * 0.5) % 2;
    if (k < 1) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.translate(x - r * 2 + k * r * 4, y);
      ctx.rotate(0.5);
      ctx.fillRect(-r * 0.2, -r * 2, r * 0.4, r * 4);
      ctx.restore();
    }
  }
  ctx.strokeStyle = '#6b4404';
  ctx.lineWidth = Math.max(1.4, r * 0.28);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y + r * 0.02);
  ctx.lineTo(x - r * 0.1, y + r * 0.38);
  ctx.lineTo(x + r * 0.5, y - r * 0.35);
  ctx.stroke();
  ctx.restore();
}
