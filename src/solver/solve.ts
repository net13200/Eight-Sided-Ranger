/**
 * Breadth-first solver for levels: the fewest moves to the exit.
 * Optimal, and proves a level unwinnable when the search runs out of states.
 */
import type { Dir } from '../engine/die';
import { step, type State } from '../engine/rules';

const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];

export interface SolveResult {
  readonly status: 'solved' | 'unsolvable' | 'budget';
  readonly moves: number;
  readonly path: readonly Dir[];
}

export function stateKey(s: State): string {
  const parts = [s.x, s.y, s.orient, s.hp];
  for (const e of s.enemies)
    parts.push(e.id, e.x, e.y, e.hp, e.snared, e.asleep ? 1 : 0, e.ready ? 1 : 0);
  parts.push(-1);
  s.tiles.forEach((t, i) => {
    if (t !== s.level.tiles[i]) parts.push(i, t.length);
  });
  return parts.join(',');
}

export function solve(
  start: State,
  opts: { maxNodes?: number; allow?: (s: State) => boolean } = {},
): SolveResult {
  const max = opts.maxNodes ?? 300_000;
  const allow = opts.allow ?? (() => true);
  const seen = new Set([stateKey(start)]);
  let frontier: Array<{ s: State; path: Dir[] }> = [{ s: start, path: [] }];
  let nodes = 0;
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const { s, path } of frontier) {
      if (++nodes > max) return { status: 'budget', moves: -1, path: [] };
      for (const d of DIRS) {
        const r = step(s, d);
        if (!r.consumed) continue;
        const ns = r.state;
        if (ns.status === 'won') {
          if (allow(ns)) return { status: 'solved', moves: path.length + 1, path: [...path, d] };
          continue;
        }
        if (ns.status === 'lost' || !allow(ns)) continue;
        const k = stateKey(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ s: ns, path: [...path, d] });
      }
    }
    frontier = next;
  }
  return { status: 'unsolvable', moves: -1, path: [] };
}
