/**
 * The Ranger's rules: one turn of the game, state in, state out. Pure and
 * deterministic (no DOM, no clock, no randomness), so the solver, the tests
 * and the game all run the same code.
 *
 * The face on the edge you roll across acts. Rows are straight lines: the
 * Bow shoots along the row, Boots leap along it, the Rope swings along it,
 * and a stag strikes along it.
 */
import { SLOT, faceAt, leading, roll, type Dir } from './die';
import { adjacent, movesFrom, neighbor, type Pos } from './grid';

const B = SLOT.bottom;
const T = SLOT.top;

// ---------- tiles ----------

export type Tile = 'grass' | 'tree' | 'water' | 'exit' | 'post' | 'spring' | 'snare';

export const TILE_GLYPH: Readonly<Record<string, Tile>> = {
  '.': 'grass',
  '#': 'tree',
  '~': 'water',
  '>': 'exit',
  P: 'post',
  '+': 'spring',
  x: 'snare',
};

/** Tiles the die and the wolves can stand on. */
export function walkable(t: Tile): boolean {
  return t === 'grass' || t === 'exit' || t === 'spring' || t === 'snare';
}

/** Tiles an arrow (or a line of sight) passes over. */
export function seeThrough(t: Tile): boolean {
  return walkable(t) || t === 'water';
}

// ---------- state ----------

export type EnemyKind = 'wolf' | 'stag';

export interface Enemy {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  /** Turns left caught in a snare. */
  readonly snared: number;
  /** A sleeping wolf: still until the Ranger comes within two rolls (unseen) or hurts it. */
  readonly asleep?: boolean;
}

export interface Level {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
  readonly start: { readonly x: number; readonly y: number };
  readonly enemies: readonly Omit<Enemy, 'id' | 'snared'>[];
  readonly loadout: readonly string[];
  readonly par?: number;
  readonly hint?: string;
  readonly teaches?: readonly string[];
  /** Starting HP, if not full (the Ranger arrives hurt). */
  readonly hp?: number;
  /**
   * A gauntlet's later floors, played in a row after this one with HP carried
   * over (attached by the campaign loader; floors 2 and 3 are winnable from 1 HP).
   */
  readonly floors?: readonly Level[];
}

export interface State {
  readonly level: Level;
  readonly tiles: readonly Tile[];
  readonly x: number;
  readonly y: number;
  readonly orient: number;
  readonly hp: number;
  readonly enemies: readonly Enemy[];
  readonly moves: number;
  readonly status: 'playing' | 'won' | 'lost';
}

export const MAX_HP = 3;
export const ENEMY_HP: Readonly<Record<EnemyKind, number>> = { wolf: 2, stag: 3 };
export const SNARE_TURNS = 3;

export function startState(level: Level): State {
  return {
    level,
    tiles: level.tiles,
    x: level.start.x,
    y: level.start.y,
    orient: 0,
    hp: level.hp ?? MAX_HP,
    enemies: level.enemies.map((e, i) => ({ ...e, id: i + 1, snared: 0 })),
    moves: 0,
    status: 'playing',
  };
}

export function tileAt(s: Pick<State, 'tiles' | 'level'>, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= s.level.width || y >= s.level.height) return null;
  return s.tiles[y * s.level.width + x]!;
}

const enemyAt = (s: State, x: number, y: number) => s.enemies.find((e) => e.x === x && e.y === y);

/** The top face is the Cloak: nobody can see you. */
export function hidden(s: State): boolean {
  return faceAt(s.level.loadout, s.orient, T) === 'Cloak';
}

// ---------- events (for animation and sound) ----------

export type GameEvent =
  | { type: 'moved'; from: Pos; to: Pos; dir: Dir; leap?: boolean; swing?: boolean }
  | { type: 'bumped'; dir: Dir }
  | { type: 'shot'; from: Pos; to: Pos; target: number }
  | { type: 'stabbed'; at: Pos; target: number }
  | { type: 'killed'; id: number; kind: EnemyKind; at: Pos }
  | { type: 'snareLaid'; at: Pos }
  | { type: 'snared'; id: number; at: Pos }
  | { type: 'enemyMoved'; id: number; from: Pos; to: Pos }
  | { type: 'bitten'; id: number; from: Pos }
  | { type: 'charged'; id: number; from: Pos }
  | { type: 'healed'; hp: number }
  | { type: 'woke'; id: number; at: Pos }
  | { type: 'won' }
  | { type: 'lost' };

export interface StepResult {
  readonly state: State;
  readonly events: readonly GameEvent[];
  /** False for a bump: nothing happened and no turn passed. */
  readonly consumed: boolean;
}

// ---------- the turn ----------

/** Cells along the row from (x, y) in `dir` (E or W), up to `max` of them. */
function* along(s: State, x: number, y: number, dir: 'E' | 'W', max = 99) {
  const dx = dir === 'E' ? 1 : -1;
  for (let i = 1; i <= max; i++) {
    const t = tileAt(s, x + dx * i, y);
    if (t === null) return;
    yield { x: x + dx * i, y, t, i };
  }
}

function hurt(
  enemies: Enemy[],
  id: number,
  dmg: number,
  events: GameEvent[],
  kind: EnemyKind,
  at: Pos,
): void {
  const i = enemies.findIndex((e) => e.id === id);
  const e = enemies[i]!;
  if (e.hp - dmg <= 0) {
    enemies.splice(i, 1);
    events.push({ type: 'killed', id, kind, at });
  } else enemies[i] = { ...e, hp: e.hp - dmg, asleep: false };
}

export function step(s: State, dir: Dir): StepResult {
  const bump: StepResult = { state: s, events: [{ type: 'bumped', dir }], consumed: false };
  if (s.status !== 'playing') return bump;
  const n = neighbor(s.x, s.y, dir);
  if (!n) return bump;
  const t = tileAt(s, n.x, n.y);
  if (t === null) return bump;
  const face = leading(s.level.loadout, s.orient, dir);
  const events: GameEvent[] = [];
  const enemies = [...s.enemies];
  let tiles = s.tiles;
  let { x, y, orient, hp } = s;
  const row = dir === 'E' || dir === 'W' ? dir : null;
  const target = enemyAt(s, n.x, n.y);
  let acted = false;

  if (target) {
    // Into an enemy: the Knife stabs, the Bow shoots point-blank, Boots leap over it.
    if (face === 'Knife' || face === 'Bow') {
      const dmg = face === 'Knife' ? 2 : 1;
      events.push(
        face === 'Knife'
          ? { type: 'stabbed', at: n, target: target.id }
          : { type: 'shot', from: { x, y }, to: n, target: target.id },
      );
      hurt(enemies, target.id, dmg, events, target.kind, n);
      acted = true;
    }
  } else if (face === 'Bow' && row) {
    // An arrow along the row, over grass and water, to the first thing in the way.
    for (const c of along(s, x, y, row)) {
      const e = enemyAt(s, c.x, c.y);
      if (e) {
        events.push({ type: 'shot', from: { x, y }, to: c, target: e.id });
        hurt(enemies, e.id, 1, events, e.kind, c);
        acted = true;
        break;
      }
      if (!seeThrough(c.t)) break;
    }
  } else if (face === 'Rope' && row) {
    // Swing to a post along the row (2-5 cells away), over water: the die doesn't roll.
    let prev: Pos | null = null;
    for (const c of along(s, x, y, row, 5)) {
      if (c.t === 'post') {
        if (
          c.i >= 2 &&
          prev &&
          walkable(tileAt(s, prev.x, prev.y)!) &&
          !enemyAt(s, prev.x, prev.y)
        ) {
          events.push({ type: 'moved', from: { x, y }, to: prev, dir, swing: true });
          x = prev.x;
          y = prev.y;
          acted = true;
        }
        break;
      }
      if (!seeThrough(c.t) || enemyAt(s, c.x, c.y)) break;
      prev = c;
    }
  }

  if (!acted && face === 'Boots' && row && t !== 'tree' && t !== 'post') {
    // Leap over the next cell (grass, water, an enemy, a snare) and roll twice.
    const far = { x: n.x + (row === 'E' ? 1 : -1), y };
    const ft = tileAt(s, far.x, far.y);
    if (ft && walkable(ft) && !enemyAt(s, far.x, far.y)) {
      events.push({ type: 'moved', from: { x, y }, to: far, dir, leap: true });
      orient = roll(roll(orient, dir), dir);
      x = far.x;
      y = far.y;
      acted = true;
    }
  }

  if (!acted) {
    if (target || !walkable(t)) return bump;
    events.push({ type: 'moved', from: { x, y }, to: n, dir });
    orient = roll(orient, dir);
    x = n.x;
    y = n.y;
  }

  // Landing (only if the die moved).
  const moved = x !== s.x || y !== s.y;
  if (moved) {
    const under = tileAt(s, x, y)!;
    const bottom = faceAt(s.level.loadout, orient, B);
    if (bottom === 'Trap' && under === 'grass') {
      tiles = tiles.map((tt, i) => (i === y * s.level.width + x ? 'snare' : tt));
      events.push({ type: 'snareLaid', at: { x, y } });
    }
    if (bottom === 'Herb' && under === 'spring' && hp < MAX_HP) {
      hp += 1;
      events.push({ type: 'healed', hp });
    }
  }

  let next: State = { ...s, tiles, x, y, orient, hp, enemies, moves: s.moves + 1 };
  if (tileAt(next, x, y) === 'exit') {
    events.push({ type: 'won' });
    return { state: { ...next, status: 'won' }, events, consumed: true };
  }
  next = enemyPhase(next, events);
  return { state: next, events, consumed: true };
}

// ---------- enemies ----------

function enemyPhase(s: State, events: GameEvent[]): State {
  let { tiles, hp } = s;
  const enemies = [...s.enemies];
  const unseen = hidden(s);
  for (let k = 0; k < enemies.length; k++) {
    const e = enemies[k]!;
    if (e.snared > 0) {
      enemies[k] = { ...e, snared: e.snared - 1 };
      continue;
    }
    if (unseen) continue;
    if (e.asleep) {
      // Wakes when the Ranger stops within two rolls; acts from the next turn.
      if (within(e.x, e.y, s.x, s.y, 2)) {
        enemies[k] = { ...e, asleep: false };
        events.push({ type: 'woke', id: e.id, at: { x: e.x, y: e.y } });
      }
      continue;
    }
    const cur: State = { ...s, tiles, enemies, hp };
    if (e.kind === 'stag') {
      if (e.y === s.y && clearRow(cur, e, s.x)) {
        hp -= 1;
        events.push({ type: 'charged', id: e.id, from: { x: e.x, y: e.y } });
      }
    } else if (adjacent(e.x, e.y, s.x, s.y)) {
      hp -= 1;
      events.push({ type: 'bitten', id: e.id, from: { x: e.x, y: e.y } });
    } else {
      const to = chase(cur, e);
      if (to) {
        events.push({ type: 'enemyMoved', id: e.id, from: { x: e.x, y: e.y }, to });
        const onSnare = tileAt(cur, to.x, to.y) === 'snare';
        enemies[k] = { ...e, x: to.x, y: to.y, snared: onSnare ? SNARE_TURNS : 0 };
        if (onSnare) {
          tiles = tiles.map((tt, i) => (i === to.y * s.level.width + to.x ? 'grass' : tt));
          events.push({ type: 'snared', id: e.id, at: to });
        }
      }
    }
    if (hp <= 0) {
      events.push({ type: 'lost' });
      return { ...s, tiles, enemies, hp: 0, status: 'lost' };
    }
  }
  return { ...s, tiles, enemies, hp };
}

/** Within `n` rolls on the bare grid (trees and water don't matter: wolves hear through them). */
export function within(ax: number, ay: number, bx: number, by: number, n: number): boolean {
  let frontier = [{ x: ax, y: ay }];
  const seen = new Set([`${ax},${ay}`]);
  for (let d = 0; d <= n; d++) {
    if (frontier.some((p) => p.x === bx && p.y === by)) return true;
    const next: { x: number; y: number }[] = [];
    for (const p of frontier)
      for (const dir of movesFrom(p.x, p.y)) {
        const q = neighbor(p.x, p.y, dir)!;
        if (!seen.has(`${q.x},${q.y}`)) {
          seen.add(`${q.x},${q.y}`);
          next.push(q);
        }
      }
    frontier = next;
  }
  return false;
}

/** Nothing solid (or another enemy) between an enemy and column `px` in its row. */
function clearRow(s: State, e: Enemy, px: number): boolean {
  const dir = px > e.x ? 1 : -1;
  for (let x = e.x + dir; x !== px; x += dir) {
    const t = tileAt(s, x, e.y)!;
    if (!seeThrough(t) || enemyAt(s, x, e.y)) return false;
  }
  return true;
}

/** A wolf's step: the neighbour closest to the die (breadth-first), ties in N, E, S, W order. */
function chase(s: State, e: Enemy): Pos | null {
  const w = s.level.width;
  const dist = new Int16Array(w * s.level.height).fill(-1);
  const queue = [s.y * w + s.x];
  dist[queue[0]!] = 0;
  for (let q = 0; q < queue.length; q++) {
    const cx = queue[q]! % w;
    const cy = Math.floor(queue[q]! / w);
    for (const d of movesFrom(cx, cy)) {
      const nb = neighbor(cx, cy, d)!;
      const t = tileAt(s, nb.x, nb.y);
      if (!t || !walkable(t) || dist[nb.y * w + nb.x]! >= 0) continue;
      dist[nb.y * w + nb.x] = dist[queue[q]!]! + 1;
      queue.push(nb.y * w + nb.x);
    }
  }
  let best: Pos | null = null;
  let bestD = dist[e.y * w + e.x]! >= 0 ? dist[e.y * w + e.x]! : 9999;
  for (const d of ['N', 'E', 'S', 'W'] as const) {
    const nb = neighbor(e.x, e.y, d);
    if (!nb) continue;
    const t = tileAt(s, nb.x, nb.y);
    if (!t || !walkable(t) || enemyAt(s, nb.x, nb.y) || (nb.x === s.x && nb.y === s.y)) continue;
    const nd = dist[nb.y * w + nb.x]!;
    if (nd >= 0 && nd < bestD) {
      bestD = nd;
      best = nb;
    }
  }
  return best;
}
