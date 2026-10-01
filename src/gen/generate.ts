/**
 * The Daily Trail's floor generator: seeded and pure, so every device builds
 * the same floor for the same day. A floor is kept only if the solver wins it
 * from the HP it is entered with, its par sits in the floor's band, and the
 * die's faces matter (a blank die can't win it as fast, or at all).
 *
 * Past days must never change. Any change to this file that alters its
 * output needs a new generator version, chosen by date (see dailyVersion in
 * meta/daily.ts), with the old behaviour kept for earlier dates. The golden
 * test in tests/unit/daily.test.ts catches accidental changes.
 */
import { MAX_HP, isUp, parseLevel, startState, type Level } from '../engine';
import { solve } from '../solver/solve';

/** Faces, creatures and tiles a floor may use: grows as districts are released. */
export interface Pool {
  readonly faces: readonly string[];
  readonly creatures: readonly string[];
  readonly springs: boolean;
}

export interface GenParams {
  readonly seed: number;
  readonly id: string;
  readonly name: string;
  /** HP the floor is entered with (and must be winnable from). */
  readonly hp: number;
  /** Par must fall in this band (inclusive). */
  readonly band: readonly [number, number];
  readonly pool: Pool;
  /** Most wolves on the floor. */
  readonly wolves: number;
}

/** mulberry32: a small seeded generator with integer state. */
export class Rng {
  constructor(private s: number) {}
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

/** A 32-bit seed from text (FNV-1a). */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

const ATTEMPTS = 400;
const MAX_NODES = 40_000;

/** One candidate floor as level text, or null if the dice made something unusable. */
function candidate(rng: Rng, p: GenParams): string | null {
  const w = 7 + rng.int(3);
  const h = 4 + rng.int(3);
  const g: string[][] = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  const cells = w * h;
  const trees = Math.floor(cells * (0.08 + rng.next() * 0.12));
  const water = Math.floor(cells * rng.next() * 0.1);
  const free = () => {
    for (let k = 0; k < 50; k++) {
      const x = rng.int(w);
      const y = rng.int(h);
      if (g[y]![x] === '.') return { x, y };
    }
    return null;
  };
  // The die on an up triangle near one side, the exit toward the other.
  const side = rng.int(2);
  let sx = 0;
  let sy = 0;
  for (let k = 0; k < 20; k++) {
    sx = side ? w - 1 - rng.int(2) : rng.int(2);
    sy = rng.int(h);
    if (isUp(sx, sy)) break;
  }
  if (!isUp(sx, sy)) return null;
  g[sy]![sx] = '@';
  const ex = side ? rng.int(2) : w - 1 - rng.int(2);
  const ey = rng.int(h);
  if (g[ey]![ex] !== '.') return null;
  g[ey]![ex] = '>';
  for (let k = 0; k < trees; k++) {
    const c = free();
    if (c) g[c.y]![c.x] = '#';
  }
  for (let k = 0; k < water; k++) {
    const c = free();
    if (c) g[c.y]![c.x] = '~';
  }
  const wolves = 1 + rng.int(p.wolves);
  for (let k = 0; k < wolves; k++) {
    const c = free();
    if (c) g[c.y]![c.x] = 'w';
  }
  // Two or three of the pool's faces on the die, the rest blank Leaves.
  const faces = [...p.pool.faces];
  const pick: string[] = [];
  const n = Math.min(faces.length, 2 + rng.int(2));
  for (let k = 0; k < n; k++) pick.push(faces.splice(rng.int(faces.length), 1)[0]!);
  if (pick.includes('Herb') && p.pool.springs) {
    const c = free();
    if (c) g[c.y]![c.x] = '+';
  }
  const loadout = Array.from({ length: 8 }, () => 'Leaf');
  for (const f of pick) {
    let slot = rng.int(8);
    while (loadout[slot] !== 'Leaf') slot = (slot + 1) % 8;
    loadout[slot] = f;
  }
  return [
    `id: ${p.id}`,
    `name: ${p.name}`,
    ...(p.hp < MAX_HP ? [`hp: ${p.hp}`] : []),
    `loadout: ${loadout.join(' ')}`,
    '---',
    ...g.map((r) => r.join('')),
  ].join('\n');
}

/** The level a blank die would face: every face a Leaf. */
const blank = (lv: Level): Level => ({ ...lv, loadout: lv.loadout.map(() => 'Leaf') });

/**
 * Builds a floor. Deterministic for the same params. If nothing fits after
 * many attempts the band widens a little, so a floor always comes back.
 */
export function generateFloor(p: GenParams): Level {
  const rng = new Rng(p.seed);
  for (let attempt = 0; attempt < ATTEMPTS * 3; attempt++) {
    const relax = Math.floor(attempt / ATTEMPTS) * 2;
    const text = candidate(rng, p);
    if (!text) continue;
    const lv = parseLevel(text);
    const r = solve(startState(lv), { maxNodes: MAX_NODES });
    if (r.status !== 'solved') continue;
    if (r.moves < p.band[0] - relax || r.moves > p.band[1] + relax) continue;
    // The faces must matter.
    const b = solve(startState(blank(lv)), { maxNodes: MAX_NODES });
    if (b.status === 'solved' && b.moves < r.moves + 2) continue;
    return { ...lv, par: r.moves };
  }
  throw new Error(`No floor for ${p.id}`);
}
