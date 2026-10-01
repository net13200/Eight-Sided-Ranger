/**
 * The world map: the Greenwood from Oddmere's edge (bottom) to the Great Oak
 * (top). Levels are pedestals on a road of stones. Tap a level (or anywhere:
 * the nearest open level) and the d8 hops there along the road; the arrow
 * keys hop to the next or previous level. Drag or wheel to scroll; a drag
 * never presses a level. The road to a newly opened level lays itself, stone
 * by stone. Roads ahead show as faint stones.
 */
import { t } from '../../i18n';
import { currentStreak, utcDate } from '../../meta/daily';
import {
  DISTRICT_NAMES,
  continueIndex,
  dailyOpen,
  isCompleted,
  needsRedo,
  unlockedLevels,
} from '../../meta/progress';
import type { Game } from '../game';
import type { Command } from '../input';
import { el, icon, iconButton, place } from '../ui';
import { drawControls, sideCard, touchFirst, wrap } from '../view/backdrop';
import { drawOctahedron } from '../view/board';
import { C } from '../view/palette';
import { twoStarLimit } from '../stars';
import {
  COLS,
  DISTRICTS,
  DISTRICT_SIZE,
  TILE,
  buildWorld,
  districtOf,
  key,
  roadBetween,
  type Pos,
  type WorldLayout,
} from '../world/layout';
import type { Scene } from './scene';

const HUD_H = 56;
const CARD_Y = 356;
const VIEW_H = CARD_Y - HUD_H;
/** The road uses columns 1..9: shift the board half a tile left to centre it. */
const XOFF = -TILE / 2;
/** Seconds per stone while hopping along the road. */
const HOP_S = 0.09;
/** A new road: one stone every LAY_GAP seconds, each popping in over LAY_S. */
const LAY_GAP = 0.1;
const LAY_S = 0.25;

/** Each district's ground. */
const GROUND = [
  { ground: '#3f6e3a', dot: '#4d7f45' }, // The Edgewood
  { ground: '#35543b', dot: '#3f6146' }, // Wolf Hollow
  { ground: '#4b7d56', dot: '#5b8e66' }, // The Braided River
  { ground: '#8c8a3c', dot: '#9e9c4b' }, // Antler Meadow
  { ground: '#24394a', dot: '#2f4a5d' }, // The Hush
  { ground: '#7a4a2a', dot: '#8b5934' }, // The Heartwood
] as const;
const OAK_GROUND = { ground: '#5a3a24', dot: '#6a482e' };
const EDGE_GROUND = { ground: '#5e6b48', dot: '#6c7a55' };

/** A hash of a tile, 0..1 (scenery placement). */
function hash(c: number, r: number): number {
  let h = (c * 374761393 + r * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The die's spot when it stands at the Daily Trail's notice board (by level 1). */
export const DAILY_SPOT = -1;

const center = (p: Pos) => ({ x: p.c * TILE + TILE / 2, y: p.r * TILE + TILE / 2 });

export class MapScene implements Scene {
  readonly name = 'map';
  readonly backdrop = 'forest' as const;
  private readonly world: WorldLayout;
  private readonly unlocked: boolean[];
  /** Tiles kept free of scenery: the road, the pedestals and the tiles beside them. */
  private readonly reserved = new Set<string>();
  /** The pedestal the die is on (or hopping toward the end of `path`). */
  private at: number;
  private readonly daily: Pos;
  private readonly dailyStone: Pos;
  private lineCache: Pos[] | null = null;
  private path: Pos[] = [];
  private hop: { from: Pos; to: Pos; t: number } | null = null;
  private time = 0;
  private camY = 0;
  private camTarget: number | null = null;
  private drag: {
    id: number;
    y: number;
    cam: number;
    moved: boolean;
    v: number;
    t: number;
  } | null = null;
  private dragged = false;
  private fling = 0;
  private unbind: (() => void) | null = null;
  /** The road to a newly opened level, being laid. */
  private lay: { level: number; t: number } | null = null;
  private ui: HTMLElement | null = null;
  private spots: Array<{ pos: Pos; el: HTMLButtonElement }> = [];
  private playBtn: HTMLButtonElement | null = null;
  private announcer: HTMLElement | null = null;
  private lastCam = -1;

  constructor(
    private readonly game: Game,
    at?: number,
  ) {
    const levels = game.levels;
    const save = game.save.data;
    this.world = buildWorld(levels.length);
    this.unlocked = unlockedLevels(levels, save);
    this.at =
      at === DAILY_SPOT ? at : Math.min(at ?? continueIndex(levels, save), levels.length - 1);
    const first = this.world.pedestals[0]!;
    this.daily = { c: first.c + 2, r: first.r };
    this.dailyStone = { c: first.c + 1, r: first.r };
    for (const p of [this.daily, this.dailyStone])
      for (let dc = -1; dc <= 1; dc++)
        for (let dr = -1; dr <= 1; dr++) this.reserved.add(key({ c: p.c + dc, r: p.r + dr }));
    for (const p of [...this.world.pedestals, ...this.world.segments.flat()])
      for (let dc = -1; dc <= 1; dc++)
        for (let dr = -1; dr <= 1; dr++) this.reserved.add(key({ c: p.c + dc, r: p.r + dr }));
    // A level opened since the map was last seen: lay its road first.
    const fresh = this.unlocked.findIndex((u, i) => u && i > 0 && !save.seen[`road:${i}`]);
    if (fresh > 0) {
      this.lay = { level: fresh, t: game.reducedMotion ? 99 : -0.35 };
      this.at = fresh - 1;
    }
    this.camY = this.followY();
  }

  // ---------- geometry ----------

  private get maxCam(): number {
    return this.world.rows * TILE - VIEW_H;
  }

  private clampCam(y: number): number {
    return Math.max(0, Math.min(this.maxCam, y));
  }

  private dieXY(): { x: number; y: number; lift: number } {
    if (!this.hop) return { ...center(this.posOf(this.at)), lift: 0 };
    const a = center(this.hop.from);
    const b = center(this.hop.to);
    const k = Math.min(1, this.hop.t);
    return {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      lift: Math.sin(Math.PI * k) * 7,
    };
  }

  private posOf(at: number): Pos {
    return at === DAILY_SPOT ? this.daily : this.world.pedestals[at]!;
  }

  /** The road from one spot to another (a level or the notice board), stone by stone. */
  /**
   * The whole road as one line: the notice board, its stone, then level 1 up
   * to the last level. Any trip is a stretch of it, so the die can change
   * course in the middle of a hop.
   */
  private get line(): Pos[] {
    return (this.lineCache ??= [
      this.daily,
      this.dailyStone,
      ...roadBetween(this.world, 0, this.world.pedestals.length - 1),
    ]);
  }

  /** The stretch of road from `from` to spot `to` (both included). */
  private road(from: Pos, to: number): Pos[] {
    const k = (p: Pos) => this.line.findIndex((q) => q.c === p.c && q.r === p.r);
    const a = k(from);
    const b = k(this.posOf(to));
    return a <= b ? this.line.slice(a, b + 1) : this.line.slice(b, a + 1).reverse();
  }

  /** The camera that keeps the die a little below the middle. */
  private followY(): number {
    return this.clampCam(this.dieXY().y - VIEW_H * 0.6);
  }

  /** The district in the middle of the view: -1 at the Great Oak, DISTRICTS at Oddmere's edge. */
  private viewArea(): number {
    return districtOf(this.world, Math.floor((this.camY + VIEW_H / 2) / TILE));
  }

  /** The district in the middle of the view (the nearest one at either end). */
  private viewDistrict(): number {
    return Math.max(0, Math.min(DISTRICTS - 1, this.viewArea()));
  }

  private selected(): number | null {
    return this.hop || this.path.length || this.lay ? null : this.at;
  }

  private districtStars(d: number): { got: number; max: number; gold: boolean } {
    const levels = this.game.levels.slice(d * DISTRICT_SIZE, (d + 1) * DISTRICT_SIZE);
    const save = this.game.save.data;
    const got = levels.reduce(
      (n, l) => n + (isCompleted(save, l) ? (save.levels[l.id]?.stars ?? 0) : 0),
      0,
    );
    return { got, max: levels.length * 3, gold: levels.length > 0 && got === levels.length * 3 };
  }

  // ---------- scene ----------

  enter(ui: HTMLElement): void {
    this.ui = ui;
    this.bindScroll();
    const save = this.game.save.data;
    this.announcer = el('div', { className: 'sr-only', testId: 'map-announcer' });
    this.announcer.setAttribute('role', 'status');
    this.announcer.setAttribute('aria-live', 'polite');
    ui.append(this.announcer);
    // Invisible buttons over the levels (screen readers, keyboard focus, tests).
    this.game.levels.forEach((level, i) => {
      const open = this.unlocked[i]!;
      const name = t(level.name);
      const b = el('button', {
        className: 'map-spot',
        testId: `level-${i + 1}`,
        label: open
          ? t('Level {n}: {name}', { n: i + 1, name }) +
            (isCompleted(save, level)
              ? t(', {n} of 3 stars', { n: save.levels[level.id]?.stars ?? 0 })
              : '') +
            (needsRedo(save, level) ? t(', changed: solve it again') : '')
          : t('Level {n}, locked', { n: i + 1 }),
        onClick: () => this.goTo(i),
      });
      b.disabled = !open;
      this.spots.push({ pos: this.world.pedestals[i]!, el: b });
      ui.append(b);
    });
    const board = el('button', {
      className: 'map-spot',
      testId: 'landmark-daily',
      label: t('Daily Trail'),
      onClick: () => this.goTo(DAILY_SPOT),
    });
    this.spots.push({ pos: this.daily, el: board });
    ui.append(board);
    this.playBtn = el('button', {
      className: 'btn primary',
      testId: 'map-play',
      onClick: () => this.play(),
    });
    this.playBtn.replaceChildren(icon('play'), el('span', { text: t('Play') }));
    ui.append(
      place(this.playBtn, 74, 416, 262, 60),
      place(
        iconButton('back', t('Menu'), () => this.game.goMenu(), 'back'),
        4,
        414,
        64,
        62,
      ),
    );
    this.syncCard();
    this.syncSpots(true);
    if (!this.lay) this.arrive();
  }

  exit(): void {
    this.unbind?.();
  }

  private say(text: string): void {
    if (!this.announcer) return;
    this.announcer.textContent = '';
    this.announcer.textContent = text;
  }

  private play(): void {
    const i = this.selected();
    if (i === DAILY_SPOT) this.game.goDaily();
    else if (i !== null) this.game.goPlay(i);
  }

  /** Hops along the road to level i. */
  private goTo(i: number): void {
    if (this.lay || (i !== DAILY_SPOT && !this.unlocked[i])) return;
    const road = this.road(this.hop ? this.hop.to : this.posOf(this.at), i);
    this.path = road.slice(1);
    this.at = i;
    this.camTarget = null;
    this.fling = 0;
    if (!this.hop) this.nextHop(road[0]!);
    this.syncCard();
  }

  private nextHop(from: Pos): void {
    const to = this.path.shift();
    if (!to) {
      this.hop = null;
      this.arrive();
      return;
    }
    this.hop = { from, to, t: 0 };
  }

  private arrive(): void {
    this.syncCard();
    if (this.at === DAILY_SPOT) {
      this.say(t('Daily Trail'));
      return;
    }
    const level = this.game.levels[this.at]!;
    this.say(t('Level {n}: {name}', { n: this.at + 1, name: t(level.name) }));
  }

  command(cmd: Command): void {
    if (cmd.type === 'back') return this.game.goMenu();
    if (this.lay) return;
    if (cmd.type === 'confirm') this.play();
    else if (cmd.type === 'move') {
      // Swipes scroll the map; the arrow keys hop to the next (up, right) or previous level.
      if (cmd.swipe) return;
      const step = cmd.dir === 'N' || cmd.dir === 'E' ? 1 : -1;
      const i = this.at + step;
      // Left from level 1 is the notice board.
      if (i === DAILY_SPOT || (i >= 0 && i < this.unlocked.length && this.unlocked[i]))
        this.goTo(i);
      else this.game.audio.play('bump');
    } else if (cmd.type === 'tap') {
      if (cmd.y < HUD_H || cmd.y >= CARD_Y || this.dragged) return;
      // The open level nearest the tap.
      const x = cmd.x - XOFF;
      const y = cmd.y - HUD_H + this.camY;
      let best = -2;
      let bestD = Infinity;
      this.world.pedestals.forEach((p, i) => {
        if (!this.unlocked[i]) return;
        const c = center(p);
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestD) [best, bestD] = [i, d];
      });
      const b = center(this.daily);
      if (Math.hypot(b.x - x, b.y - y) < bestD) best = DAILY_SPOT;
      if (best !== -2) this.goTo(best);
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.lay) this.updateLay(dt);
    if (this.hop) {
      const fast = this.path.length > 12 ? 0.5 : 1;
      this.hop.t += dt / (HOP_S * fast * (this.game.reducedMotion ? 0.01 : 1));
      if (this.hop.t >= 1) {
        const to = this.hop.to;
        this.game.audio.play('roll');
        this.nextHop(to);
      }
    }
    if (this.fling && this.camTarget !== null) {
      this.camTarget = this.clampCam(this.camTarget + this.fling * dt);
      this.fling *= Math.exp(-dt * 4);
      if (Math.abs(this.fling) < 20) this.fling = 0;
    }
    const target = this.camTarget ?? this.followY();
    const k = this.game.reducedMotion || this.drag?.moved ? 1 : Math.min(1, dt * 7);
    this.camY += (target - this.camY) * k;
    if (Math.abs(target - this.camY) < 0.3) this.camY = target;
    this.syncSpots();
  }

  private updateLay(dt: number): void {
    const lay = this.lay!;
    const stones = this.world.segments[lay.level]!;
    const before = Math.floor(lay.t / LAY_GAP);
    lay.t += dt;
    const after = Math.floor(lay.t / LAY_GAP);
    if (after > before && after <= stones.length + 1 && lay.t > 0) this.game.audio.play('roll');
    if (lay.t >= (stones.length + 1) * LAY_GAP + LAY_S) {
      this.lay = null;
      this.game.save.update((d) => (d.seen[`road:${lay.level}`] = true));
      this.game.audio.play('snare');
      this.goTo(lay.level);
    }
  }

  /** How far a stone of the road being laid has popped in (0..1); 1 for every other stone. */
  private laid(level: number, k: number): number {
    if (!this.lay || this.lay.level !== level) return 1;
    return Math.max(0, Math.min(1, (this.lay.t - k * LAY_GAP) / LAY_S));
  }

  /** Keeps the invisible buttons over their levels; off-view ones are hidden. */
  private syncSpots(force = false): void {
    if (!force && Math.abs(this.camY - this.lastCam) < 0.5) return;
    this.lastCam = this.camY;
    for (const { pos, el: b } of this.spots) {
      // Bigger than a tile: touch targets stay at least 44 px on small phones.
      const y = HUD_H + pos.r * TILE - this.camY;
      place(b, pos.c * TILE + XOFF - 13, y - 13, TILE + 26, TILE + 26);
      b.style.display = y > HUD_H - 6 && y + TILE < CARD_Y + 6 ? '' : 'none';
    }
  }

  private syncCard(): void {
    if (!this.playBtn) return;
    const i = this.selected();
    this.playBtn.disabled = i === null;
    this.playBtn.replaceChildren(
      icon('play'),
      el('span', { text: t(i === DAILY_SPOT ? 'Open' : 'Play') }),
    );
  }

  /** Dragging scrolls the map (from anywhere in the view, a level included), and so does the wheel. */
  private bindScroll(): void {
    const stage = this.game.stage;
    const inView = (e: PointerEvent | WheelEvent) => {
      const p = stage.toLogical(e.clientX, e.clientY);
      return p.x >= 0 && p.x <= 340 && p.y >= HUD_H && p.y < CARD_Y;
    };
    const down = (e: PointerEvent) => {
      this.dragged = false;
      if (this.drag || !inView(e)) return;
      this.fling = 0;
      this.drag = {
        id: e.pointerId,
        y: e.clientY,
        cam: this.camY,
        moved: false,
        v: 0,
        t: e.timeStamp,
      };
    };
    const move = (e: PointerEvent) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const dy = (e.clientY - d.y) / stage.scale;
      if (!d.moved && Math.abs(dy) < 8) return;
      d.moved = true;
      const cam = this.clampCam(d.cam - dy);
      const dt = Math.max(1, e.timeStamp - d.t) / 1000;
      d.v = d.v * 0.5 + ((cam - this.camY) / dt) * 0.5;
      d.t = e.timeStamp;
      this.camY = cam;
      this.camTarget = cam;
      this.syncSpots();
    };
    const up = (e: PointerEvent) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      if (!d.moved) return;
      this.dragged = true;
      if (!this.game.reducedMotion && e.timeStamp - d.t < 80) this.fling = d.v;
    };
    // A drag that ended on a level doesn't press it.
    const click = (e: MouseEvent) => {
      if (!this.dragged) return;
      this.dragged = false;
      e.stopPropagation();
      e.preventDefault();
    };
    const wheel = (e: WheelEvent) => {
      if (!inView(e)) return;
      e.preventDefault();
      const px =
        e.deltaMode === 1 ? e.deltaY * TILE : e.deltaMode === 2 ? e.deltaY * VIEW_H : e.deltaY;
      this.fling = 0;
      this.camTarget = this.clampCam((this.camTarget ?? this.camY) + px / stage.scale);
    };
    const opts = { capture: true };
    window.addEventListener('pointerdown', down, opts);
    window.addEventListener('pointermove', move, opts);
    window.addEventListener('pointerup', up, opts);
    window.addEventListener('pointercancel', up, opts);
    window.addEventListener('click', click, opts);
    window.addEventListener('wheel', wheel, { capture: true, passive: false });
    this.unbind = () => {
      window.removeEventListener('pointerdown', down, opts);
      window.removeEventListener('pointermove', move, opts);
      window.removeEventListener('pointerup', up, opts);
      window.removeEventListener('pointercancel', up, opts);
      window.removeEventListener('click', click, opts);
      window.removeEventListener('wheel', wheel, opts);
    };
  }

  idle(): boolean {
    return !this.hop && !this.lay && !this.drag && !this.fling && this.camTarget === null;
  }

  // ---------- drawing ----------

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, 340, 480);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HUD_H, 340, VIEW_H);
    ctx.clip();
    ctx.translate(XOFF, HUD_H - Math.round(this.camY));
    const r0 = Math.max(0, Math.floor(this.camY / TILE) - 1);
    const r1 = Math.min(this.world.rows - 1, Math.ceil((this.camY + VIEW_H) / TILE) + 1);
    this.drawGround(ctx, r0, r1);
    this.drawRoad(ctx, r0, r1);
    this.drawPedestals(ctx, r0, r1);
    if (this.daily.r >= r0 - 1 && this.daily.r <= r1 + 1) this.drawBoard(ctx);
    this.drawDie(ctx);
    ctx.restore();
    this.drawHud(ctx);
    this.drawCard(ctx);
  }

  private drawGround(ctx: CanvasRenderingContext2D, r0: number, r1: number): void {
    for (let r = r0; r <= r1; r++) {
      const d = districtOf(this.world, r);
      const g = d < 0 ? OAK_GROUND : d >= DISTRICTS ? EDGE_GROUND : GROUND[d]!;
      ctx.fillStyle = g.ground;
      ctx.fillRect(-TILE, r * TILE, 340 + 2 * TILE, TILE + 1);
      for (let c = 0; c <= COLS; c++) {
        const h = hash(c, r);
        ctx.fillStyle = g.dot;
        ctx.fillRect(c * TILE + 6 + h * 20, r * TILE + 8 + ((h * 97) % 1) * 18, 5, 2.5);
        if (!this.reserved.has(key({ c, r })) && r !== this.world.rows - 3 && h > 0.72)
          this.scenery(ctx, d, c, r, h);
      }
    }
    // Hedgerows between districts, with a gap where the road goes through.
    for (const b of this.world.bands) {
      const r = b.top;
      if (r < r0 || r > r1) continue;
      const gap = this.world.pedestals[b.district * DISTRICT_SIZE]?.c;
      for (let c = 0; c <= COLS; c++) {
        if (gap !== undefined ? c === gap : c === (b.district % 2 ? 9 : 1)) continue;
        this.hedge(ctx, c * TILE + TILE / 2, r * TILE + TILE / 2, hash(c, r));
      }
    }
    // Oddmere's edge: a fence along the bottom of the Greenwood.
    const fenceR = this.world.rows - 3;
    if (fenceR >= r0 && fenceR <= r1) {
      for (let c = 0; c <= COLS; c++) {
        if (c === 1) continue;
        const x = c * TILE;
        const y = fenceR * TILE + TILE / 2;
        ctx.fillStyle = '#8a6a44';
        ctx.fillRect(x, y - 6, TILE, 3);
        ctx.fillRect(x, y + 2, TILE, 3);
        ctx.fillStyle = '#6e5233';
        ctx.fillRect(x + TILE / 2 - 2, y - 11, 4, 18);
      }
    }
    const signR = this.world.rows - 2;
    if (signR >= r0 && signR <= r1) {
      const x = 4 * TILE;
      const y = signR * TILE + 6;
      ctx.fillStyle = '#6e5233';
      ctx.fillRect(x + 30, y + 8, 4, 18);
      ctx.fillStyle = '#c8a46e';
      ctx.beginPath();
      ctx.roundRect(x, y, 64, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#4a3218';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('Oddmere'), x + 32, y + 8.5, 58);
    }
    const oak = center(this.world.oak);
    if (oak.y >= r0 * TILE - 80 && oak.y <= (r1 + 2) * TILE) this.greatOak(ctx, oak.x, oak.y);
  }

  private hedge(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
    ctx.fillStyle = '#1f3d23';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c5530';
    ctx.beginPath();
    ctx.arc(x - 7, y - 1, 9 + h * 2, 0, Math.PI * 2);
    ctx.arc(x + 7, y, 9 + (1 - h) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** The Great Oak: the forest's heart, still holding its last leaves. */
  private greatOak(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#4a2e18';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 40);
    ctx.lineTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x + 12, y + 40);
    ctx.closePath();
    ctx.fill();
    for (const [dx, dy, r, col] of [
      [-34, -8, 26, '#9a4e1c'],
      [30, -6, 28, '#a85a20'],
      [0, -30, 34, '#c06a26'],
      [-14, -10, 24, '#d08032'],
      [16, -18, 22, '#e09a3a'],
    ] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private scenery(ctx: CanvasRenderingContext2D, d: number, c: number, r: number, h: number): void {
    const kind = Math.floor(((h - 0.72) / 0.28) * 3);
    ctx.save();
    ctx.translate(c * TILE + TILE / 2, r * TILE + TILE / 2);
    if (d === 0) [() => pine(ctx, '#2f5a33'), () => birch(ctx), () => fern(ctx)][kind]?.();
    else if (d === 1) [() => pine(ctx, '#24432a'), () => rock(ctx), () => den(ctx)][kind]?.();
    else if (d === 2) [() => pond(ctx), () => reeds(ctx), () => pond(ctx)][kind]?.();
    else if (d === 3) [() => flowers(ctx), () => tuft(ctx), () => flowers(ctx)][kind]?.();
    else if (d === 4)
      [() => pine(ctx, '#1a2c3a'), () => mushrooms(ctx), () => fireflies(ctx, this.time)][kind]?.();
    else if (d === 5) [() => autumnTree(ctx), () => leaves(ctx), () => autumnTree(ctx)][kind]?.();
    else if (d < 0) leaves(ctx);
    else [() => fern(ctx), () => tuft(ctx), () => flowers(ctx)][kind]?.();
    ctx.restore();
  }

  private stone(ctx: CanvasRenderingContext2D, p: Pos, k = 1): void {
    const { x, y } = center(p);
    const s = 0.4 + 0.6 * k;
    ctx.save();
    ctx.translate(x, y - (1 - k) * 10);
    ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.fillStyle = '#6b6457';
    ctx.beginPath();
    ctx.ellipse(0, 3, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b7ae98';
    ctx.beginPath();
    ctx.ellipse(0, 1, 11, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-3, -1, 4, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** A faint stone on the road ahead, so its way can be seen. */
  private track(ctx: CanvasRenderingContext2D, p: Pos): void {
    const { x, y } = center(p);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRoad(ctx: CanvasRenderingContext2D, r0: number, r1: number): void {
    if (this.dailyStone.r >= r0 && this.dailyStone.r <= r1) this.stone(ctx, this.dailyStone);
    // The road from Oddmere's gate to the first level.
    const first = this.world.pedestals[0];
    if (first)
      for (let r = first.r + 1; r < this.world.rows; r++)
        if (r >= r0 && r <= r1) this.stone(ctx, { c: first.c, r });
    this.world.segments.forEach((seg, i) => {
      seg.forEach((p, k) => {
        if (p.r < r0 || p.r > r1) return;
        if (this.unlocked[i]) {
          const f = this.laid(i, k);
          if (f > 0) this.stone(ctx, p, f);
          else this.track(ctx, p);
        } else this.track(ctx, p);
      });
    });
  }

  private drawPedestals(ctx: CanvasRenderingContext2D, r0: number, r1: number): void {
    const save = this.game.save.data;
    const next = continueIndex(this.game.levels, save);
    this.world.pedestals.forEach((p, i) => {
      if (p.r < r0 || p.r > r1) return;
      const level = this.game.levels[i]!;
      const { x, y } = center(p);
      const laying = this.lay?.level === i;
      const k = laying ? this.laid(i, this.world.segments[i]!.length) : 1;
      const open = this.unlocked[i] && k > 0;
      if (!open) {
        // A level ahead: a dim, round stone.
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const done = isCompleted(save, level);
      const stars = done ? (save.levels[level.id]?.stars ?? 0) : 0;
      let [top, edge] = ['#f1e7cf', '#8f8570'];
      if (done && stars === 3) [top, edge] = [C.gold, '#8a6414'];
      else if (done) [top, edge] = ['#cfd9b5', '#6c7a55'];
      ctx.save();
      ctx.translate(x, y - (1 - k) * 12);
      ctx.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k);
      if (i === next && !done && !laying) {
        const pulse = this.game.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(this.time * 4);
        ctx.fillStyle = `rgba(255,215,94,${0.18 + 0.2 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 21, 0, Math.PI * 2);
        ctx.fill();
      }
      // A flat triangle stone: the Greenwood's levels are triangles.
      const tri = (dy: number) => {
        ctx.beginPath();
        ctx.moveTo(0, -15 + dy);
        ctx.lineTo(16, 11 + dy);
        ctx.lineTo(-16, 11 + dy);
        ctx.closePath();
      };
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      tri(3);
      ctx.fillStyle = edge;
      ctx.strokeStyle = edge;
      ctx.fill();
      ctx.stroke();
      tri(0);
      ctx.fillStyle = top;
      ctx.strokeStyle = top;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a1a0c';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), 0, 3);
      ctx.restore();
      if (done) for (let s = 0; s < 3; s++) drawStar(ctx, x - 9 + s * 9, y + 19, 3.6, s < stars);
      if (needsRedo(save, level)) {
        ctx.fillStyle = C.heal;
        ctx.beginPath();
        ctx.roundRect(x - 15, y - 30, 30, 11, 5);
        ctx.fill();
        ctx.fillStyle = '#10240f';
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('NEW'), x, y - 24, 28);
      }
      // A district all at ★★★: a medal by its last level.
      if (i % DISTRICT_SIZE === DISTRICT_SIZE - 1 && this.districtStars(Math.floor(i / 10)).gold)
        drawMedal(ctx, x + 24, y - 14, 9, this.game.reducedMotion ? 0 : this.time);
    });
  }

  /** The Daily Trail's notice board: a parchment on two posts (a lock until it opens). */
  private drawBoard(ctx: CanvasRenderingContext2D): void {
    const { x, y } = center(this.daily);
    const open = dailyOpen(this.game.levels, this.game.save.data);
    ctx.fillStyle = '#5a3b1f';
    ctx.fillRect(x - 12, y - 8, 4, 22);
    ctx.fillRect(x + 8, y - 8, 4, 22);
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.roundRect(x - 16, y - 18, 32, 22, 3);
    ctx.fill();
    ctx.fillStyle = open ? '#efe2c0' : '#b9ad8e';
    ctx.fillRect(x - 12, y - 15, 24, 16);
    ctx.fillStyle = '#6e5233';
    ctx.fillRect(x - 8, y - 11, 16, 2);
    ctx.fillRect(x - 8, y - 7, 12, 2);
    ctx.fillRect(x - 8, y - 3, 14, 2);
    if (!open) {
      ctx.fillStyle = '#3a2614';
      ctx.beginPath();
      ctx.roundRect(x - 5, y - 8, 10, 8, 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2614';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y - 8, 3, Math.PI, 0);
      ctx.stroke();
    } else if (!this.game.save.data.daily.results[utcDate(this.game.platform.now())]) {
      // Today's trail is waiting: a small glow.
      const pulse = this.game.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(this.time * 4);
      ctx.fillStyle = `rgba(255,215,94,${0.6 + 0.4 * pulse})`;
      ctx.beginPath();
      ctx.arc(x + 14, y - 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDie(ctx: CanvasRenderingContext2D): void {
    const { x, y, lift } = this.dieXY();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 11 - lift * 0.4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    drawOctahedron(
      ctx,
      x,
      y - 14 - lift,
      15,
      this.game.reducedMotion ? 0.6 : this.time * 0.8,
      true,
    );
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#17281f';
    ctx.fillRect(0, 0, 340, HUD_H);
    ctx.fillStyle = '#2c4433';
    ctx.fillRect(0, HUD_H - 1, 340, 1);
    const d = this.viewDistrict();
    const { got, max, gold } = this.districtStars(d);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const area = this.viewArea();
    if (area < 0 || area >= DISTRICTS) {
      ctx.fillStyle = C.accent;
      ctx.font = '800 17px system-ui, sans-serif';
      ctx.fillText(t(area < 0 ? 'The Great Oak' : 'Oddmere'), 170, 28, 220);
      return;
    }
    ctx.fillStyle = C.textDim;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText(t('District {n}', { n: d + 1 }).toUpperCase(), 170, 14, 200);
    ctx.fillStyle = C.accent;
    ctx.font = '800 17px system-ui, sans-serif';
    ctx.fillText(t(DISTRICT_NAMES[d]!), 170, 31, 220);
    ctx.font = 'bold 10px system-ui, sans-serif';
    if (max === 0) {
      ctx.fillStyle = C.textDim;
      ctx.fillText(t('Coming soon'), 170, 46, 200);
      return;
    }
    const text = `${got} / ${max}`;
    const w = ctx.measureText(text).width;
    drawStar(ctx, 170 - w / 2 - 6, 46, 4, true);
    ctx.fillStyle = C.gold;
    ctx.fillText(text, 170 + 3, 46.5);
    if (gold) drawMedal(ctx, 170 + w / 2 + 14, 45, 5.5, 0);
  }

  private drawCard(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#17281f';
    ctx.fillRect(0, CARD_Y, 340, 480 - CARD_Y);
    ctx.fillStyle = '#2c4433';
    ctx.fillRect(0, CARD_Y, 340, 1);
    const i = this.selected() ?? this.at;
    if (i === DAILY_SPOT) {
      this.drawDailyCard(ctx);
      return;
    }
    const level = this.game.levels[i]!;
    const save = this.game.save.data;
    const rec = save.levels[level.id];
    const done = isCompleted(save, level);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#22382a';
    ctx.beginPath();
    ctx.roundRect(10, CARD_Y + 10, 36, 36, 9);
    ctx.fill();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), 28, CARD_Y + 28.5);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text;
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText(t(level.name), 56, CARD_Y + 20, 200);
    ctx.fillStyle = C.textDim;
    ctx.font = '11px system-ui, sans-serif';
    const par = level.par !== undefined ? t('Par {n}', { n: level.par }) : '';
    const sub = needsRedo(save, level)
      ? t('Changed: solve it again')
      : done && rec
        ? `${par} · ${t('your best {n} moves', { n: rec.bestMoves })}`
        : `${par} · ${t('★★ in {n}', { n: twoStarLimit(level.par ?? 0) })}`;
    ctx.fillText(sub, 56, CARD_Y + 37, 210);
    const stars = done ? (rec?.stars ?? 0) : 0;
    for (let s = 0; s < 3; s++) drawStar(ctx, 284 + s * 19, CARD_Y + 28, 7, s < stars);
  }

  private drawDailyCard(ctx: CanvasRenderingContext2D): void {
    const save = this.game.save.data;
    const date = utcDate(this.game.platform.now());
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.gold;
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText(t('Daily Trail'), 12, CARD_Y + 20, 316);
    ctx.fillStyle = C.textDim;
    ctx.font = '11px system-ui, sans-serif';
    const done = save.daily.results[date];
    const sub = !dailyOpen(this.game.levels, save)
      ? t('Three new floors every day. Opens after the Edgewood.')
      : done
        ? t('Done today: {n} moves. Streak: {s} days.', {
            n: done.moves,
            s: currentStreak(save, date),
          })
        : t('Three new floors today, the same for everyone.');
    wrap(ctx, sub, 12, CARD_Y + 38, 316, 13);
  }

  /** Wide screens: the district's progress on the left, controls on the right. */
  renderSide(ctx: CanvasRenderingContext2D, side: 'left' | 'right', w: number, h: number): void {
    const cardH = 230;
    ctx.save();
    ctx.translate(0, (h - cardH) / 2);
    if (side === 'left') {
      const d = this.viewDistrict();
      const { got, max } = this.districtStars(d);
      const levels = this.game.levels.slice(d * DISTRICT_SIZE, (d + 1) * DISTRICT_SIZE);
      let y = sideCard(ctx, w, cardH, t('District {n}', { n: d + 1 }));
      ctx.fillStyle = C.text;
      ctx.font = '800 20px system-ui, sans-serif';
      ctx.textAlign = 'left';
      y = wrap(ctx, t(DISTRICT_NAMES[d]!), 16, y + 4, w - 32, 24);
      ctx.fillStyle = C.textDim;
      ctx.font = '13px system-ui, sans-serif';
      if (!levels.length) {
        ctx.fillText(t('Coming soon'), 16, y + 12);
      } else {
        const done = levels.filter((l) => isCompleted(this.game.save.data, l)).length;
        ctx.fillText(t('{n}/{max} levels', { n: done, max: levels.length }), 16, y + 12);
        drawStar(ctx, 24, y + 42, 8, true);
        ctx.fillStyle = C.gold;
        ctx.font = '800 22px system-ui, sans-serif';
        ctx.fillText(`${got} / ${max}`, 40, y + 43);
      }
    } else {
      const y = sideCard(ctx, w, cardH, t('How to play'));
      drawControls(
        ctx,
        w,
        y + 4,
        touchFirst()
          ? [
              [t('Tap'), t('Roll to that level')],
              [t('Drag'), t('Look around the map')],
            ]
          : [
              ['← ↑ → ↓', t('Hop to the next or previous level')],
              ['Enter', t('Play the level you are on')],
              [t('Wheel'), t('Look around the map')],
            ],
      );
    }
    ctx.restore();
  }
}

// ---------- scenery, drawn around (0, 0) in a tile ----------

type Ctx = CanvasRenderingContext2D;

function pine(ctx: Ctx, fill: string): void {
  ctx.fillStyle = '#4a3320';
  ctx.fillRect(-2, 6, 4, 6);
  ctx.fillStyle = fill;
  for (const [dy, w] of [
    [-14, 6],
    [-8, 9],
    [-2, 12],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(0, dy);
    ctx.lineTo(-w, dy + 10);
    ctx.lineTo(w, dy + 10);
    ctx.closePath();
    ctx.fill();
  }
}

function birch(ctx: Ctx): void {
  ctx.fillStyle = '#e8e2d2';
  ctx.fillRect(-2, -6, 4, 18);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(-2, -1, 2, 1.5);
  ctx.fillRect(0, 5, 2, 1.5);
  ctx.fillStyle = '#c9b54a';
  ctx.beginPath();
  ctx.arc(0, -9, 8, 0, Math.PI * 2);
  ctx.fill();
}

function fern(ctx: Ctx): void {
  ctx.strokeStyle = '#6aa04e';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const a of [-0.9, -0.4, 0.1, 0.6]) {
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(Math.sin(a) * 6, 0, Math.sin(a) * 10, -6 + Math.abs(a) * 4);
  }
  ctx.stroke();
}

function rock(ctx: Ctx): void {
  ctx.fillStyle = '#5d6157';
  ctx.beginPath();
  ctx.ellipse(0, 4, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#767a6e';
  ctx.beginPath();
  ctx.ellipse(-2, 2, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function den(ctx: Ctx): void {
  ctx.fillStyle = '#4b4f45';
  ctx.beginPath();
  ctx.arc(0, 6, 12, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#16211a';
  ctx.beginPath();
  ctx.arc(0, 7, 6, Math.PI, 0);
  ctx.fill();
}

function pond(ctx: Ctx): void {
  ctx.fillStyle = '#2c6d8f';
  ctx.beginPath();
  ctx.ellipse(0, 2, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,215,240,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, 1);
  ctx.quadraticCurveTo(-2, -1, 2, 1);
  ctx.stroke();
}

function reeds(ctx: Ctx): void {
  ctx.strokeStyle = '#8aa65a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const dx of [-5, 0, 5]) {
    ctx.moveTo(dx, 9);
    ctx.lineTo(dx + dx * 0.3, -6);
  }
  ctx.stroke();
  ctx.fillStyle = '#6b4a2a';
  for (const dx of [-5, 5]) ctx.fillRect(dx + dx * 0.3 - 1.5, -8, 3, 6);
}

function flowers(ctx: Ctx): void {
  for (const [dx, dy, col] of [
    [-6, 2, '#f2d14e'],
    [4, -3, '#f08a7a'],
    [6, 5, '#fff3d6'],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(dx, dy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tuft(ctx: Ctx): void {
  ctx.strokeStyle = '#c2b956';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const a of [-0.5, -0.2, 0.1, 0.4]) {
    ctx.moveTo(0, 8);
    ctx.lineTo(Math.sin(a) * 12, -6);
  }
  ctx.stroke();
}

function mushrooms(ctx: Ctx): void {
  for (const [dx, s] of [
    [-4, 1],
    [5, 0.7],
  ] as const) {
    ctx.fillStyle = '#d9d2bc';
    ctx.fillRect(dx - 1.5 * s, 0, 3 * s, 7 * s);
    ctx.fillStyle = '#7fd6c9';
    ctx.beginPath();
    ctx.arc(dx, 0, 6 * s, Math.PI, 0);
    ctx.fill();
  }
}

function fireflies(ctx: Ctx, time: number): void {
  for (let i = 0; i < 3; i++) {
    const a = time * 0.8 + i * 2.1;
    ctx.fillStyle = `rgba(255,236,140,${0.5 + 0.4 * Math.sin(a * 2)})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 8, Math.sin(a * 1.3) * 6, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function autumnTree(ctx: Ctx): void {
  ctx.fillStyle = '#4a2e18';
  ctx.fillRect(-2, 2, 4, 10);
  ctx.fillStyle = '#c86a2a';
  for (const [dx, dy, r] of [
    [-4, -4, 8],
    [5, -3, 7],
    [0, -9, 7],
  ] as const) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function leaves(ctx: Ctx): void {
  for (const [dx, dy, col] of [
    [-6, 3, '#d9822b'],
    [3, -4, '#e8b04a'],
    [6, 6, '#b5541f'],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(dx, dy, 3.5, 2, dx * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

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
