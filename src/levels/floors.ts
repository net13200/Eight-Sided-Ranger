import { parseLevel, type Level } from '../engine';

/** Attaches gauntlet floors (by file name `<id>-<n>.txt`) to their first floor. */
export function withFloors(levels: Level[], floors: Record<string, string>): Level[] {
  return levels.map((lv) => {
    const mine = Object.keys(floors)
      .filter((p) => p.split('/').pop()!.startsWith(`${lv.id}-`))
      .sort()
      .map((p) => parseLevel(floors[p]!));
    return mine.length ? { ...lv, floors: mine } : lv;
  });
}
