/**
 * "Does this level teach what it says?" A face is taught when the par route
 * uses it and the level can't be won without it (the face swapped for a
 * blank Leaf). A creature is taught when it shapes the route: without it,
 * par would be shorter. Used by tests and tools, not the game.
 */
import type { Dir } from '../engine/die';
import { hidden, startState, step, type Level, type State } from '../engine/rules';
import { solve } from './solve';

export const FACE_TEACHES = {
  bow: 'Bow',
  knife: 'Knife',
  trap: 'Trap',
  rope: 'Rope',
  boots: 'Boots',
  cloak: 'Cloak',
  herb: 'Herb',
} as const;
/** Creatures a level can teach: each picks out the enemies it means. */
export const CREATURE_TEACHES = {
  stag: (e: Level['enemies'][number]) => e.kind === 'stag',
  sleeper: (e: Level['enemies'][number]) => !!e.asleep,
} as const;

export const TEACHES = [
  'roll',
  ...(Object.keys(FACE_TEACHES) as (keyof typeof FACE_TEACHES)[]),
  ...(Object.keys(CREATURE_TEACHES) as (keyof typeof CREATURE_TEACHES)[]),
] as const;
export type Teach = (typeof TEACHES)[number];

/** What a route does. */
export function routeFacts(level: Level, path: readonly Dir[]) {
  const f = { shots: 0, stabs: 0, snares: 0, swings: 0, leaps: 0, cloaked: 0, heals: 0 };
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
    }
    // Hidden while an enemy that could act is around.
    if (
      r.state.status === 'playing' &&
      hidden(r.state) &&
      r.state.enemies.some((e) => e.snared === 0)
    )
      f.cloaked++;
    s = r.state;
  }
  return f;
}

/** The level with one face swapped for a blank Leaf. */
export function withoutFace(level: Level, face: string): Level {
  return { ...level, loadout: level.loadout.map((f) => (f === face ? 'Leaf' : f)) };
}

/** The level without the creatures a teach means (all stags, all sleeping wolves). */
export function withoutCreature(level: Level, teach: keyof typeof CREATURE_TEACHES): Level {
  return { ...level, enemies: level.enemies.filter((e) => !CREATURE_TEACHES[teach](e)) };
}

/** Problems with a level's claim to teach `teach` (empty when it does). */
export function checkTeach(level: Level, path: readonly Dir[], teach: Teach): string[] {
  if (teach === 'roll') return [];
  if (teach in CREATURE_TEACHES) {
    const which = teach as keyof typeof CREATURE_TEACHES;
    if (!level.enemies.some(CREATURE_TEACHES[which])) return [`no ${which} in the level`];
    const r = solve(startState(withoutCreature(level, which)), { maxNodes: 400_000 });
    return r.status === 'solved' && r.moves < path.length
      ? []
      : [`the ${which} doesn't shape the route (without it: ${r.status}, ${r.moves} moves)`];
  }
  const face = FACE_TEACHES[teach as keyof typeof FACE_TEACHES];
  const f = routeFacts(level, path);
  const used = {
    bow: f.shots,
    knife: f.stabs,
    trap: f.snares,
    rope: f.swings,
    boots: f.leaps,
    cloak: f.cloaked,
    herb: f.heals,
  }[teach as keyof typeof FACE_TEACHES];
  if (!used) return [`par route doesn't use the ${face}`];
  const r = solve(startState(withoutFace(level, face)), { maxNodes: 400_000 });
  if (r.status === 'unsolvable') return [];
  return [
    r.status === 'solved'
      ? `winnable without the ${face} (${r.moves} moves)`
      : `couldn't prove it needs the ${face}`,
  ];
}
