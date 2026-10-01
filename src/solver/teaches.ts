/**
 * "Does this level teach what it says?" Three kinds of teach, each with its
 * own proof against the level without the thing taught:
 * - a face: the par route uses it, and the level can't be won without it
 *   (the face swapped for a blank Leaf);
 * - a creature: it shapes the route (without it, par would be shorter);
 * - a tile: the par route uses it, and without it (plain water, or grass, instead) the
 *   level can't be won, or takes longer.
 * Used by tests and tools, not the game.
 */
import type { Dir } from '../engine/die';
import {
  hidden,
  startState,
  step,
  tileAt,
  type Level,
  type State,
  type Tile,
} from '../engine/rules';
import { solve } from './solve';

type Enemy = Level['enemies'][number];
export type Facts = ReturnType<typeof routeFacts>;

interface FaceTeach {
  readonly kind: 'face';
  readonly face: string;
  readonly used: (f: Facts) => number;
}
interface CreatureTeach {
  readonly kind: 'creature';
  readonly is: (e: Enemy) => boolean;
}
interface TileTeach {
  readonly kind: 'tile';
  readonly tiles: readonly Tile[];
  readonly used: (f: Facts) => number;
  /** What stands in its place in the check (plain water unless said). */
  readonly instead?: Tile;
}

const face = (name: string, used: (f: Facts) => number): FaceTeach => ({
  kind: 'face',
  face: name,
  used,
});

export const TEACH_SPECS = {
  bow: face('Bow', (f) => f.shots),
  knife: face('Knife', (f) => f.stabs),
  trap: face('Trap', (f) => f.snares),
  rope: face('Rope', (f) => f.swings),
  boots: face('Boots', (f) => f.leaps),
  cloak: face('Cloak', (f) => f.cloaked),
  herb: face('Herb', (f) => f.heals),
  horn: face('Horn', (f) => f.pushes),
  stag: { kind: 'creature', is: (e: Enemy) => e.kind === 'stag' },
  sleeper: { kind: 'creature', is: (e: Enemy) => !!e.asleep },
  boar: { kind: 'creature', is: (e: Enemy) => e.kind === 'boar' },
  current: { kind: 'tile', tiles: ['currentE', 'currentW'], used: (f: Facts) => f.carried },
  pad: { kind: 'tile', tiles: ['pad'], used: (f: Facts) => f.sank },
  fern: { kind: 'tile', tiles: ['fern'], used: (f: Facts) => f.ferns, instead: 'grass' },
} as const satisfies Record<string, FaceTeach | CreatureTeach | TileTeach>;

export const TEACHES = [
  'roll',
  ...(Object.keys(TEACH_SPECS) as (keyof typeof TEACH_SPECS)[]),
] as const;
export type Teach = (typeof TEACHES)[number];

/** The faces taught, by teach name (for the "only taught faces" test). */
export const FACE_TEACHES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(TEACH_SPECS)
    .filter(([, s]) => s.kind === 'face')
    .map(([k, s]) => [k, (s as FaceTeach).face]),
);

/** What a route does. */
export function routeFacts(level: Level, path: readonly Dir[]) {
  const f = {
    shots: 0,
    stabs: 0,
    snares: 0,
    swings: 0,
    leaps: 0,
    cloaked: 0,
    heals: 0,
    carried: 0,
    sank: 0,
    pushes: 0,
    ferns: 0,
  };
  let s: State = startState(level);
  for (const d of path) {
    const r = step(s, d);
    for (const e of r.events) {
      if (e.type === 'shot') f.shots++;
      if (e.type === 'stabbed') f.stabs++;
      if (e.type === 'snared') f.snares++;
      if (e.type === 'moved' && e.swing) f.swings++;
      if (e.type === 'moved' && e.leap) f.leaps++;
      if (e.type === 'healed') f.heals++;
      if (e.type === 'carried') f.carried++;
      if (e.type === 'sank') f.sank++;
      if (e.type === 'pushed') f.pushes++;
    }
    // Hidden while an enemy that could act is around.
    if (
      r.state.status === 'playing' &&
      hidden(r.state) &&
      r.state.enemies.some((e) => e.snared === 0)
    )
      f.cloaked++;
    // Hiding in a fern while an enemy that could act is around.
    if (
      r.state.status === 'playing' &&
      tileAt(r.state, r.state.x, r.state.y) === 'fern' &&
      r.state.enemies.some((e) => e.snared === 0)
    )
      f.ferns++;
    s = r.state;
  }
  return f;
}

/** The level with one face swapped for a blank Leaf. */
export function withoutFace(level: Level, name: string): Level {
  return { ...level, loadout: level.loadout.map((f) => (f === name ? 'Leaf' : f)) };
}

/** The level without what a teach is about (a face, a creature, a tile). */
export function without(level: Level, teach: Exclude<Teach, 'roll'>): Level {
  const spec: FaceTeach | CreatureTeach | TileTeach = TEACH_SPECS[teach];
  if (spec.kind === 'face') return withoutFace(level, spec.face);
  if (spec.kind === 'creature')
    return { ...level, enemies: level.enemies.filter((e) => !spec.is(e)) };
  const instead = spec.instead ?? 'water';
  return { ...level, tiles: level.tiles.map((t) => (spec.tiles.includes(t) ? instead : t)) };
}

/** How much the route uses a teach's thing (creatures: always 1, they're judged by the route). */
export function usage(f: Facts, teach: Exclude<Teach, 'roll'>): number {
  const spec: FaceTeach | CreatureTeach | TileTeach = TEACH_SPECS[teach];
  return spec.kind === 'creature' ? 1 : spec.used(f);
}

/** Problems with a level's claim to teach `teach` (empty when it does). */
export function checkTeach(level: Level, path: readonly Dir[], teach: Teach): string[] {
  if (teach === 'roll') return [];
  const spec: FaceTeach | CreatureTeach | TileTeach = TEACH_SPECS[teach];
  if (spec.kind === 'creature') {
    if (!level.enemies.some(spec.is)) return [`no ${teach} in the level`];
    const r = solve(startState(without(level, teach)), { maxNodes: 400_000 });
    return r.status === 'solved' && r.moves < path.length
      ? []
      : [`the ${teach} doesn't shape the route (without it: ${r.status}, ${r.moves} moves)`];
  }
  if (!usage(routeFacts(level, path), teach)) return [`par route doesn't use the ${teach}`];
  const r = solve(startState(without(level, teach)), { maxNodes: 400_000 });
  if (r.status === 'unsolvable') return [];
  if (spec.kind === 'tile' && r.status === 'solved' && r.moves > path.length) return [];
  return [
    r.status === 'solved'
      ? `winnable without the ${teach} (${r.moves} moves)`
      : `couldn't prove it needs the ${teach}`,
  ];
}
