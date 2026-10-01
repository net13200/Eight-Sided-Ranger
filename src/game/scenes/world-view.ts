/**
 * The World view: a parchment map of the Greenwood. Each district is a
 * clearing in the woods, winding up the page from Oddmere's fence to the
 * Great Oak, with its name, its stars (or a padlock), and a dot per level.
 * Drawing only; the map scene decides what's open and handles picking.
 */
import { DISTRICTS, DISTRICT_SIZE } from '../world/layout';
import { DISTRICT_NAMES } from '../../meta/progress';
import { drawOctahedron } from '../view/board';
import { drawMedal, drawStar } from '../view/marks';
import { t } from '../../i18n';

type Ctx = CanvasRenderingContext2D;

export const INK = '#5b4630';
const TOP = 56;
const H = 480 - TOP;

export interface Region {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** District d's clearing on the page: they wind up it, left and right in turn. */
export function region(d: number): Region {
  const top = 158;
  const bottom = 418;
  const cy = bottom - ((bottom - top) * d) / (DISTRICTS - 1);
  return { cx: d % 2 ? 216 : 124, cy, rx: 94, ry: 31 };
}

/** Level k (0-9) of district d: a U around the clearing, entering from below. */
export function regionPoint(d: number, k: number): { x: number; y: number } {
  const g = region(d);
  const deg = d % 2 ? 150 - (k * 300) / 9 : 30 + (k * 300) / 9;
  const a = (deg * Math.PI) / 180;
  return { x: g.cx + g.rx * 0.84 * Math.cos(a), y: g.cy + g.ry * 0.8 * Math.sin(a) };
}

export const OAK_POINT = { x: 214, y: 92 };
export const EDGE_POINT = { x: 70, y: 462 };

/** Which clearing a point falls in (the nearest centre where two are close), or null. */
export function regionAt(x: number, y: number): number | null {
  let best: number | null = null;
  let bestD = 1.25;
  for (let d = 0; d < DISTRICTS; d++) {
    const g = region(d);
    const k = Math.hypot((x - g.cx) / g.rx, (y - g.cy) / g.ry);
    if (k < bestD) [best, bestD] = [d, k];
  }
  return best;
}

function hash(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface WorldInfo {
  readonly alpha: number;
  readonly selected: number;
  readonly time: number;
  readonly open: readonly boolean[];
  readonly stars: readonly { got: number; max: number; gold: boolean }[];
  /** Per level: 'locked' | 'open' | 'done' | 'gold'. */
  readonly dots: readonly ('locked' | 'open' | 'done' | 'gold')[];
  /** Where the die is: a level index, or -1 at the notice board. */
  readonly at: number;
}

/** A little ink pine, for the woods between the clearings. */
function inkPine(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x - s * 0.55, y);
  ctx.lineTo(x + s * 0.55, y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(91,70,48,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(91,70,48,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + s * 0.3);
  ctx.stroke();
}

const CLEARING = ['#9cc47a', '#7fa77a', '#8fc0b4', '#d8c86a', '#8a9cc0', '#d79a5a'];

export function drawWorldView(ctx: Ctx, w: WorldInfo): void {
  ctx.save();
  ctx.globalAlpha = w.alpha;
  ctx.translate(0, (1 - w.alpha) * 10);
  // Parchment, darker toward its edges, with a double ink border.
  ctx.fillStyle = '#e6d5ae';
  ctx.fillRect(0, TOP, 340, H);
  const vg = ctx.createRadialGradient(170, TOP + H / 2, 120, 170, TOP + H / 2, 300);
  vg.addColorStop(0, 'rgba(120,90,50,0)');
  vg.addColorStop(1, 'rgba(120,90,50,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, TOP, 340, H);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(5, TOP + 5, 330, H - 10);
  ctx.lineWidth = 0.6;
  ctx.strokeRect(9, TOP + 9, 322, H - 18);

  // The woods: little ink pines everywhere but in the clearings.
  for (let i = 0; i < 90; i++) {
    const x = 22 + hash(i, 3) * 296;
    const y = TOP + 22 + hash(i, 9) * (H - 44);
    if (regionAt(x, y) !== null && regionClose(x, y)) continue;
    if (Math.hypot(x - OAK_POINT.x, y - OAK_POINT.y) < 40) continue;
    inkPine(ctx, x, y, 6 + hash(i, 5) * 4);
  }

  // Oddmere's fence at the bottom, and its name.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 20; x < 320; x += 12) {
    ctx.moveTo(x, 452);
    ctx.lineTo(x, 444);
  }
  ctx.moveTo(16, 446);
  ctx.lineTo(324, 446);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'italic 600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('Oddmere'), 170, 464, 200);

  // The trail: through every level, district to district, up to the Oak.
  const pts: { x: number; y: number; i: number }[] = [];
  for (let i = 0; i < w.dots.length; i++)
    pts.push({ ...regionPoint(Math.floor(i / DISTRICT_SIZE), i % DISTRICT_SIZE), i });
  ctx.lineCap = 'round';
  for (let j = 0; j + 1 < pts.length; j++) {
    const p = pts[j]!;
    const q = pts[j + 1]!;
    const walked = w.dots[q.i] !== 'locked';
    ctx.strokeStyle = walked ? INK : 'rgba(91,70,48,0.35)';
    ctx.lineWidth = walked ? 1.8 : 1.3;
    ctx.setLineDash(walked ? [4, 3] : [2, 4]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (let d = DISTRICTS - 1; d >= 0; d--) drawClearing(ctx, d, w);

  for (const p of pts) {
    const s = w.dots[p.i]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle =
      s === 'locked'
        ? 'rgba(230,213,174,0.9)'
        : s === 'gold'
          ? '#e8ad1c'
          : s === 'done'
            ? '#8fb86a'
            : '#fffaf0';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = s === 'locked' ? 'rgba(91,70,48,0.4)' : INK;
    ctx.stroke();
  }

  // The Great Oak, crowning the page.
  for (const [dx, dy, r] of [
    [-12, 2, 13],
    [12, 3, 13],
    [0, -9, 15],
  ] as const) {
    ctx.beginPath();
    ctx.arc(OAK_POINT.x + dx, OAK_POINT.y + dy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(208,128,50,0.55)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.fillRect(OAK_POINT.x - 2.5, OAK_POINT.y + 10, 5, 14);
  ctx.font = 'italic 700 11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(t('The Great Oak'), OAK_POINT.x - 26, OAK_POINT.y + 2, 150);
  ctx.textAlign = 'center';

  // You are here: the die, bobbing on its level.
  const here =
    w.at < 0 ? { x: EDGE_POINT.x + 40, y: 432 } : regionPoint(Math.floor(w.at / 10), w.at % 10);
  const bob = Math.abs(Math.sin(w.time * 3)) * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(here.x, here.y + 2, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawOctahedron(ctx, here.x, here.y - 10 - bob, 9, w.time * 0.8, true);
  ctx.restore();
}

function regionClose(x: number, y: number): boolean {
  for (let d = 0; d < DISTRICTS; d++) {
    const g = region(d);
    if (Math.hypot((x - g.cx) / (g.rx + 10), (y - g.cy) / (g.ry + 12)) < 1) return true;
  }
  return false;
}

function drawClearing(ctx: Ctx, d: number, w: WorldInfo): void {
  const g = region(d);
  const open = w.open[d]!;
  const shape = () => {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const wob = 1 + 0.07 * Math.sin(3 * a + d * 1.7) + 0.05 * Math.sin(5 * a + d * 2.9);
      const x = g.cx + Math.cos(a) * g.rx * wob;
      const y = g.cy + Math.sin(a) * g.ry * wob;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = CLEARING[d]!;
  ctx.globalAlpha *= open ? 0.75 : 0.35;
  ctx.fill();
  ctx.globalAlpha /= open ? 0.75 : 0.35;
  if (!open) {
    ctx.save();
    shape();
    ctx.clip();
    ctx.strokeStyle = 'rgba(91,70,48,0.22)';
    ctx.lineWidth = 1;
    for (let x = -g.ry * 2; x < g.rx * 2 + g.ry * 2; x += 7) {
      ctx.beginPath();
      ctx.moveTo(g.cx - g.rx + x, g.cy - g.ry - 4);
      ctx.lineTo(g.cx - g.rx + x - g.ry * 2, g.cy + g.ry + 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  shape();
  const sel = d === w.selected;
  ctx.strokeStyle = sel ? '#e8ad1c' : INK;
  ctx.lineWidth = sel ? 3 : 1.4;
  ctx.stroke();

  // The label: a little banner with the name and the stars (or a padlock).
  const { got, max, gold } = w.stars[d]!;
  const name = t(DISTRICT_NAMES[d]!);
  ctx.font = '800 11px system-ui, sans-serif';
  const bw = Math.min(124, Math.max(70, ctx.measureText(name).width + 16));
  ctx.fillStyle = gold ? '#f6cf5a' : open ? 'rgba(250,244,228,0.95)' : 'rgba(230,213,174,0.95)';
  ctx.beginPath();
  ctx.roundRect(g.cx - bw / 2, g.cy - 13, bw, 25, 6);
  ctx.fill();
  ctx.strokeStyle = gold ? '#8a5a08' : INK;
  ctx.lineWidth = gold ? 1.8 : 1;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = open ? INK : 'rgba(91,70,48,0.6)';
  ctx.fillText(name, g.cx, g.cy - 5, bw - 8);
  if (open && max > 0) {
    ctx.font = 'bold 10px system-ui, sans-serif';
    const text = `${got}/${max}`;
    const tw = ctx.measureText(text).width;
    drawStar(ctx, g.cx - tw / 2 - 5, g.cy + 6.5, 4, got > 0, true);
    ctx.fillStyle = gold ? '#6b4404' : '#a0700c';
    ctx.fillText(text, g.cx + 4, g.cy + 7);
  } else {
    ctx.strokeStyle = 'rgba(91,70,48,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(g.cx - 4.5, g.cy + 3, 9, 7, 1.5);
    ctx.moveTo(g.cx - 2.5, g.cy + 3);
    ctx.arc(g.cx, g.cy + 2.5, 2.5, Math.PI, 0);
    ctx.lineTo(g.cx + 2.5, g.cy + 3);
    ctx.stroke();
  }
  if (gold) drawMedal(ctx, g.cx - bw / 2 - 2, g.cy - 12, 8, w.time);
}
