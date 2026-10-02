/** Illustrations for the story pages, drawn in code like the rest of the art. */
import type { StoryPage } from '../story';
import { drawOctahedron } from './board';
import { C } from './palette';

type Ctx = CanvasRenderingContext2D;

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, strength = 0.5): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('ALPHA', String(strength)));
  g.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

const GOLD = 'rgba(255,215,94,ALPHA)';
const AMBER = 'rgba(230,140,60,ALPHA)';

function ground(ctx: Ctx, cx: number, cy: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 92, 170, 40, 0, Math.PI, 0);
  ctx.lineTo(cx + 170, cy + 130);
  ctx.lineTo(cx - 170, cy + 130);
  ctx.closePath();
  ctx.fill();
}

function shadow(ctx: Ctx, x: number, y: number, w: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function pine(ctx: Ctx, x: number, y: number, h: number, color = '#2f5a33'): void {
  ctx.fillStyle = '#4a3320';
  ctx.fillRect(x - h * 0.05, y - h * 0.15, h * 0.1, h * 0.15);
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const w = h * (0.22 + i * 0.1);
    const top = y - h + i * h * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - w, top + h * 0.45);
    ctx.lineTo(x + w, top + h * 0.45);
    ctx.closePath();
    ctx.fill();
  }
}

function autumnTree(ctx: Ctx, x: number, y: number, s: number, t: number): void {
  ctx.fillStyle = '#4a2e18';
  ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5);
  for (const [dx, dy, r, col] of [
    [-0.3, -0.7, 0.32, '#a85a20'],
    [0.3, -0.68, 0.3, '#c06a26'],
    [0, -0.95, 0.36, '#d08032'],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s + Math.sin(t + x) * 0.6, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A leaf; `hang` 1 = hanging still in the air (the stuck autumn). */
function leaf(ctx: Ctx, x: number, y: number, s: number, angle: number, color = '#e09a3a'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.quadraticCurveTo(0, -s * 0.8, s, 0);
  ctx.quadraticCurveTo(0, s * 0.8, -s, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,20,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.lineTo(s * 0.8, 0);
  ctx.stroke();
  ctx.restore();
}

/** A die of Oddmere (a d6), seen from the front, a little tilted. */
function d6(ctx: Ctx, x: number, y: number, s: number, tilt: number, pips: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = '#c9c0d8';
  ctx.beginPath();
  ctx.roundRect(-s / 2 + 3, -s / 2 + 4, s, s, s * 0.18);
  ctx.fill();
  ctx.fillStyle = '#f1e7cf';
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.18);
  ctx.fill();
  ctx.fillStyle = '#2a2236';
  const p = s * 0.22;
  const spots: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-p, -p],
      [p, p],
    ],
    3: [
      [-p, -p],
      [0, 0],
      [p, p],
    ],
    4: [
      [-p, -p],
      [p, -p],
      [-p, p],
      [p, p],
    ],
    5: [
      [-p, -p],
      [p, -p],
      [0, 0],
      [-p, p],
      [p, p],
    ],
    6: [
      [-p, -p],
      [p, -p],
      [-p, 0],
      [p, 0],
      [-p, p],
      [p, p],
    ],
  };
  for (const [dx, dy] of spots[pips] ?? []) {
    ctx.beginPath();
    ctx.arc(dx, dy, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function fence(ctx: Ctx, x0: number, x1: number, y: number): void {
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(x0, y - 18, x1 - x0, 5);
  ctx.fillRect(x0, y - 6, x1 - x0, 5);
  ctx.fillStyle = '#6e5233';
  for (let x = x0 + 8; x < x1; x += 34) ctx.fillRect(x, y - 26, 6, 30);
}

/** The Ranger, at (x, y) on the ground. */
function ranger(ctx: Ctx, x: number, y: number, size: number, t: number, bob = 0): void {
  shadow(ctx, x, y, size * 0.8);
  drawOctahedron(ctx, x, y - size - bob, size, t);
}

export function drawStoryArt(
  ctx: Ctx,
  page: StoryPage,
  cx: number,
  cy: number,
  time: number,
  still: boolean,
): void {
  const t = still ? 0 : time;
  const tt = still ? 0.6 : time * 0.7;
  ctx.save();
  switch (page.art) {
    case 'edge': {
      // Oddmere's fields on the left, the woods on the right, a fence between.
      glow(ctx, cx, cy + 10, 170, 'rgba(150,200,120,ALPHA)', 0.18);
      ground(ctx, cx, cy, '#3f6e3a');
      for (const [dx, h] of [
        [60, 80],
        [105, 100],
        [145, 70],
      ] as const)
        pine(ctx, cx + dx, cy + 80, h);
      d6(ctx, cx - 120, cy + 64, 22, -0.1 + Math.sin(t) * 0.05, 3);
      d6(ctx, cx - 80, cy + 74, 18, 0.15, 5);
      fence(ctx, cx - 160, cx + 20, cy + 96);
      ranger(ctx, cx - 20, cy + 98, 30, tt);
      // A deer, asking the way.
      ctx.fillStyle = '#b07a42';
      ctx.beginPath();
      ctx.ellipse(cx + 70, cy + 88, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + 56, cy + 92, 4, 16);
      ctx.fillRect(cx + 80, cy + 92, 4, 16);
      ctx.beginPath();
      ctx.ellipse(cx + 50, cy + 72, 7, 9, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 48, cy + 64);
      ctx.lineTo(cx + 42, cy + 52);
      ctx.moveTo(cx + 52, cy + 64);
      ctx.lineTo(cx + 58, cy + 52);
      ctx.stroke();
      break;
    }
    case 'wish': {
      // The wish's golden light stops at the fence; the Ranger stands half in it.
      const light = ctx.createLinearGradient(cx - 170, 0, cx - 20, 0);
      light.addColorStop(0, 'rgba(255,215,94,0.2)');
      light.addColorStop(0.85, 'rgba(255,215,94,0.14)');
      light.addColorStop(1, 'rgba(255,215,94,0)');
      ctx.fillStyle = light;
      ctx.fillRect(cx - 170, cy - 150, 150, 280);
      glow(ctx, cx - 100, cy - 20, 150, GOLD, 0.3);
      ground(ctx, cx, cy, '#35543b');
      fence(ctx, cx - 30, cx - 10, cy + 96);
      for (const [dx, dy, s, k] of [
        [-140, 40, 22, 2],
        [-105, 70, 20, 6],
        [-70, 30, 18, 4],
      ] as const)
        d6(ctx, cx + dx, cy + dy + Math.sin(t * 2 + dx) * 4, s, Math.sin(t + dy) * 0.3, k);
      ranger(ctx, cx - 20, cy + 98, 34, tt, Math.abs(Math.sin(t * 2)) * 4);
      for (let i = 0; i < 6; i++) {
        const a = t * 0.8 + i;
        ctx.fillStyle = `rgba(255,236,160,${0.4 + 0.3 * Math.sin(a * 2)})`;
        ctx.beginPath();
        ctx.arc(cx - 20 + Math.cos(a) * 48, cy + 30 + Math.sin(a * 1.3) * 30, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'autumn': {
      // Trees in autumn, and leaves that hang in the air, not falling.
      glow(ctx, cx, cy, 170, AMBER, 0.18);
      ground(ctx, cx, cy, '#5a3a24');
      for (const [dx, s] of [
        [-120, 70],
        [-55, 90],
        [55, 85],
        [125, 65],
      ] as const)
        autumnTree(ctx, cx + dx, cy + 90, s, t);
      for (let i = 0; i < 9; i++) {
        const x = cx - 130 + i * 32;
        const y = cy - 20 + ((i * 37) % 60) + Math.sin(t * 1.5 + i) * 1.5;
        leaf(ctx, x, y, 6, i * 0.7, i % 2 ? '#e09a3a' : '#c86a2a');
      }
      ranger(ctx, cx, cy + 104, 26, tt);
      break;
    }
    case 'oak': {
      // The Great Oak, and the Ranger looking up at it, a leaf on one face.
      greatOak(ctx, cx, cy, t, 1);
      leaf(ctx, cx + 70, cy + 20 + Math.sin(t * 1.4) * 2, 7, 0.6);
      ranger(ctx, cx - 70, cy + 108, 24, tt);
      break;
    }
    case 'bear': {
      // The district's ground, and the Old Bear: cross early on, tired by the end.
      const d = page.district ?? 0;
      districtGround(ctx, d, cx, cy);
      ranger(ctx, cx - 80, cy + 104, 24, tt);
      oldBear(ctx, cx + 50, cy + 100, 1.1, d < 5 ? 'cross' : 'tired', t);
      break;
    }
    case 'heart': {
      greatOak(ctx, cx, cy, t, 1);
      oldBear(ctx, cx + 70, cy + 106, 0.8, 'tired', t);
      ranger(ctx, cx - 80, cy + 108, 22, tt);
      break;
    }
    case 'letgo': {
      // The Leaf comes off the die and drifts down.
      glow(ctx, cx, cy, 150, GOLD, 0.25);
      ground(ctx, cx, cy, '#5a3a24');
      ranger(ctx, cx - 30, cy + 104, 34, tt);
      const k = still ? 0.6 : (time * 0.25) % 1;
      leaf(ctx, cx + 10 + Math.sin(k * 9) * 18, cy - 40 + k * 130, 10, k * 6, '#e9b44a');
      break;
    }
    case 'leaves': {
      // Everywhere, at last, the leaves come down.
      greatOak(ctx, cx, cy, t, 0.7);
      for (let i = 0; i < 18; i++) {
        const k = still ? (i * 0.37) % 1 : (time * 0.18 + i * 0.37) % 1;
        const x = cx - 150 + ((i * 53) % 300) + Math.sin(k * 8 + i) * 12;
        leaf(ctx, x, cy - 130 + k * 230, 6, k * 7 + i, i % 3 ? '#e09a3a' : '#c86a2a');
      }
      ranger(ctx, cx - 80, cy + 108, 22, tt);
      break;
    }
    case 'sleep': {
      // The Bear curled up in a heap of leaves.
      glow(ctx, cx, cy + 20, 160, AMBER, 0.15);
      ground(ctx, cx, cy, '#5a3a24');
      for (let i = 0; i < 14; i++)
        leaf(
          ctx,
          cx - 90 + i * 14,
          cy + 98 + Math.sin(i * 2.3) * 6,
          8,
          i * 1.3,
          i % 2 ? '#c86a2a' : '#e09a3a',
        );
      oldBear(ctx, cx + 20, cy + 98, 1.2, 'asleep', t);
      ranger(ctx, cx - 100, cy + 104, 20, tt);
      break;
    }
    case 'snow': {
      glow(ctx, cx, cy, 170, 'rgba(200,220,255,ALPHA)', 0.12);
      ground(ctx, cx, cy, '#d8e2ec');
      for (const [dx, h] of [
        [-120, 70],
        [-70, 90],
        [80, 85],
        [130, 65],
      ] as const)
        pine(ctx, cx + dx, cy + 86, h, '#3a5a48');
      snowfall(ctx, cx, cy, still ? 0 : time);
      ranger(ctx, cx, cy + 104, 26, tt);
      break;
    }
    case 'knight': {
      // Across the fence, in the snow, the six-sided Knight.
      ground(ctx, cx, cy, '#d8e2ec');
      shadow(ctx, cx + 80, cy + 84, 34);
      knightCube(ctx, cx + 80, cy + 84, 30, Math.sin(t * 1.5) * 0.12);
      fence(ctx, cx - 160, cx + 160, cy + 96);
      snowfall(ctx, cx, cy, still ? 0 : time);
      ranger(ctx, cx - 70, cy + 108, 26, tt, Math.abs(Math.sin(t * 3)) * 5);
      break;
    }
    case 'district':
      districtArt(ctx, page.district ?? 0, cx, cy, t, tt);
      break;
  }
  ctx.restore();
}

/** Outline and fill in a face's unit space (as Six Sided Knight paints its icons). */
function paint(ctx: Ctx, fill: string, lw = 0.12): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#1a1622';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The Knight's faces, drawn as in Six Sided Knight, in a [-1, 1] box. */
const KNIGHT_ICONS: Record<'Sword' | 'Shield' | 'Heart', (ctx: Ctx) => void> = {
  Sword(ctx) {
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-0.15, 0.22);
    ctx.lineTo(-0.15, -0.68);
    ctx.lineTo(0, -0.98);
    ctx.lineTo(0.15, -0.68);
    ctx.lineTo(0.15, 0.22);
    ctx.closePath();
    paint(ctx, '#d7dee8');
    ctx.beginPath();
    ctx.roundRect(-0.46, 0.22, 0.92, 0.16, 0.06);
    paint(ctx, '#c49a4c');
    ctx.beginPath();
    ctx.rect(-0.09, 0.38, 0.18, 0.36);
    paint(ctx, '#6d4a2b');
    ctx.beginPath();
    ctx.arc(0, 0.84, 0.13, 0, Math.PI * 2);
    paint(ctx, '#c49a4c');
    ctx.restore();
  },
  Shield(ctx) {
    ctx.beginPath();
    ctx.moveTo(-0.74, -0.82);
    ctx.lineTo(0.74, -0.82);
    ctx.lineTo(0.74, -0.1);
    ctx.quadraticCurveTo(0.72, 0.56, 0, 0.96);
    ctx.quadraticCurveTo(-0.72, 0.56, -0.74, -0.1);
    ctx.closePath();
    paint(ctx, '#4f8fe0');
    ctx.beginPath();
    ctx.moveTo(0, -0.7);
    ctx.lineTo(0, 0.78);
    ctx.moveTo(-0.6, -0.28);
    ctx.lineTo(0.6, -0.28);
    ctx.lineWidth = 0.16;
    ctx.strokeStyle = '#cfe2ff';
    ctx.stroke();
  },
  Heart(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 0.86);
    ctx.bezierCurveTo(-0.98, 0.18, -0.86, -0.78, -0.42, -0.78);
    ctx.bezierCurveTo(-0.18, -0.78, 0, -0.58, 0, -0.42);
    ctx.bezierCurveTo(0, -0.58, 0.18, -0.78, 0.42, -0.78);
    ctx.bezierCurveTo(0.86, -0.78, 0.98, 0.18, 0, 0.86);
    ctx.closePath();
    paint(ctx, '#e5485f');
  },
};

/**
 * The Knight from Six Sided Knight: a cube seen from above-front, its faces
 * tinted by role (Sword warm, Shield blue, Heart green) with their icons.
 * Stands on (x, y), edge `a`, rocking by `tilt`.
 */
function knightCube(ctx: Ctx, x: number, y: number, a: number, tilt: number): void {
  const c = Math.cos(Math.PI / 6);
  const ex = { x: c * a, y: -0.5 * a };
  const ey = { x: -c * a, y: -0.5 * a };
  const ez = { x: 0, y: -a };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const faces: [
    string,
    keyof typeof KNIGHT_ICONS,
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    string,
  ][] = [
    // [tint, icon, centre, u (icon right), v (icon down), shade]
    [
      '#b3cff5',
      'Shield',
      { x: (ey.x + ez.x) / 2, y: (ey.y + ez.y) / 2 },
      { x: -ey.x / 2, y: -ey.y / 2 },
      { x: 0, y: a / 2 },
      'rgba(0,0,0,0.08)',
    ],
    [
      '#b8e6b9',
      'Heart',
      { x: (ex.x + ez.x) / 2, y: (ex.y + ez.y) / 2 },
      { x: ex.x / 2, y: ex.y / 2 },
      { x: 0, y: a / 2 },
      'rgba(0,0,0,0.22)',
    ],
    [
      '#f4b39c',
      'Sword',
      { x: ez.x + (ex.x + ey.x) / 2, y: ez.y + (ex.y + ey.y) / 2 },
      { x: ex.x / 2, y: ex.y / 2 },
      { x: -ey.x / 2, y: -ey.y / 2 },
      'rgba(255,255,255,0.12)',
    ],
  ];
  for (const [tint, icon, m, u, v, shade] of faces) {
    ctx.save();
    ctx.transform(u.x, u.y, v.x, v.y, m.x, m.y);
    ctx.beginPath();
    ctx.rect(-1, -1, 2, 2);
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.lineWidth = 0.08;
    ctx.strokeStyle = '#1a1622';
    ctx.stroke();
    ctx.scale(0.74, 0.74);
    KNIGHT_ICONS[icon](ctx);
    ctx.restore();
  }
  ctx.restore();
}

/** The Great Oak's trunk and crown (`fade` 1 = full, less = thinning as it lets go). */
function greatOak(ctx: Ctx, cx: number, cy: number, t: number, fade: number): void {
  glow(ctx, cx, cy - 30, 160, GOLD, 0.22 * fade);
  ground(ctx, cx, cy, '#5a3a24');
  ctx.fillStyle = '#4a2e18';
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 96);
  ctx.lineTo(cx - 10, cy - 10);
  ctx.lineTo(cx + 10, cy - 10);
  ctx.lineTo(cx + 22, cy + 96);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = fade;
  for (const [dx, dy, r, col] of [
    [-62, -30, 44, '#9a4e1c'],
    [58, -26, 46, '#a85a20'],
    [0, -72, 56, '#c06a26'],
    [-26, -36, 40, '#d08032'],
    [30, -50, 38, '#e09a3a'],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy + Math.sin(t + dx) * 0.8, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The Old Bear sitting on the ground at (x, y). */
function oldBear(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  mood: 'cross' | 'tired' | 'asleep',
  t: number,
): void {
  shadow(ctx, x, y, 60 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const breathe = mood === 'asleep' ? Math.sin(t * 1.2) * 1.5 : 0;
  ctx.fillStyle = '#6a4a32';
  ctx.strokeStyle = '#24160c';
  ctx.lineWidth = 2;
  // Body.
  ctx.beginPath();
  if (mood === 'asleep') ctx.ellipse(0, -18 - breathe, 46, 22 + breathe, 0, 0, Math.PI * 2);
  else ctx.ellipse(0, -30, 32, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head.
  const hx = mood === 'asleep' ? -34 : 0;
  const hy = mood === 'asleep' ? -22 : mood === 'tired' ? -62 : -70;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(hx + sx * 14, hy - 16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, 21, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8a48a';
  ctx.beginPath();
  ctx.ellipse(hx, hy + 8, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#24160c';
  ctx.beginPath();
  ctx.ellipse(hx, hy + 4, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#24160c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mood === 'cross') {
    // Brows down, eyes glaring.
    ctx.moveTo(hx - 12, hy - 10);
    ctx.lineTo(hx - 4, hy - 6);
    ctx.moveTo(hx + 12, hy - 10);
    ctx.lineTo(hx + 4, hy - 6);
    ctx.stroke();
    ctx.fillStyle = '#ffcf6a';
    ctx.fillRect(hx - 9, hy - 5, 4, 3);
    ctx.fillRect(hx + 5, hy - 5, 4, 3);
  } else {
    // Heavy lids (tired), or shut (asleep).
    ctx.moveTo(hx - 10, hy - 4);
    ctx.lineTo(hx - 4, hy - 3);
    ctx.moveTo(hx + 4, hy - 3);
    ctx.lineTo(hx + 10, hy - 4);
    ctx.stroke();
  }
  ctx.restore();
  if (mood === 'asleep') {
    ctx.fillStyle = '#f3ead2';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.4 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.fillText('z', x - 50 * s + k * 20, y - 50 * s - k * 40);
    }
    ctx.globalAlpha = 1;
  }
}

function snowfall(ctx: Ctx, cx: number, cy: number, time: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 40; i++) {
    const k = (time * 0.12 + i * 0.137) % 1;
    const x = cx - 165 + ((i * 71) % 330) + Math.sin(k * 6 + i) * 6;
    ctx.beginPath();
    ctx.arc(x, cy - 140 + k * 250, 1.5 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A district's ground and sky (no figures). */
function districtGround(ctx: Ctx, d: number, cx: number, cy: number): void {
  const looks = [
    { sky: 'rgba(150,200,120,ALPHA)', ground: '#3f6e3a' },
    { sky: 'rgba(120,150,130,ALPHA)', ground: '#35543b' },
    { sky: 'rgba(110,180,220,ALPHA)', ground: '#4b7d56' },
    { sky: 'rgba(240,210,110,ALPHA)', ground: '#8c8a3c' },
    { sky: 'rgba(120,150,220,ALPHA)', ground: '#24394a' },
    { sky: 'rgba(230,140,60,ALPHA)', ground: '#7a4a2a' },
  ][d]!;
  glow(ctx, cx, cy, 170, looks.sky, 0.22);
  ground(ctx, cx, cy, looks.ground);
}

/** A district's card: its own scenery around the Ranger. */
function districtArt(ctx: Ctx, d: number, cx: number, cy: number, t: number, tt: number): void {
  districtGround(ctx, d, cx, cy);
  if (d === 0) {
    for (const [dx, h] of [
      [-120, 70],
      [-80, 95],
      [90, 90],
      [130, 70],
    ] as const)
      pine(ctx, cx + dx, cy + 86, h);
    // A cross wolf, ears back.
    ctx.fillStyle = '#9aa0ab';
    ctx.strokeStyle = '#2b2d33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const wx = cx + 52;
    const wy = cy + 70;
    ctx.moveTo(wx - 14, wy - 6);
    ctx.lineTo(wx - 13, wy - 20);
    ctx.lineTo(wx - 5, wy - 11);
    ctx.lineTo(wx + 5, wy - 11);
    ctx.lineTo(wx + 13, wy - 20);
    ctx.lineTo(wx + 14, wy - 6);
    ctx.lineTo(wx + 6, wy + 10);
    ctx.lineTo(wx - 6, wy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd35e';
    ctx.fillRect(wx - 8, wy - 4, 4, 3);
    ctx.fillRect(wx + 4, wy - 4, 4, 3);
  }
  ranger(ctx, cx - 40, cy + 100, 28, tt, Math.abs(Math.sin(t * 2)) * 3);
  ctx.fillStyle = C.accent;
}
