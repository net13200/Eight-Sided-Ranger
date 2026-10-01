/**
 * Progress: which levels are open, which are done, and level fingerprints.
 * A fingerprint covers everything that decides how a level plays; when a
 * level changes after release, players who beat it see "solve it again"
 * instead of keeping stars for a puzzle they never solved.
 */
import type { Level } from '../engine';
import { tk } from '../i18n';
import type { SaveData } from './save';

export const DISTRICT_NAMES = [
  tk('The Edgewood'),
  tk('Wolf Hollow'),
  tk('The Braided River'),
  tk('Antler Meadow'),
  tk('The Hush'),
  tk('The Heartwood'),
] as const;

/** FNV-1a over the level's rules-relevant content, as 8 hex digits. */
export function fingerprint(level: Level): string {
  const text = [
    level.width,
    level.tiles.join(''),
    `${level.start.x},${level.start.y}`,
    level.enemies.map((e) => `${e.kind}${e.x},${e.y}`).join(';'),
    level.loadout.join(' '),
    level.hp ?? '',
    level.par ?? '',
  ].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Beaten in its current form. */
export function isCompleted(save: SaveData, level: Level): boolean {
  const rec = save.levels[level.id];
  return !!rec && rec.fp === fingerprint(level);
}

/** Beaten once, but the level has changed since. */
export function needsRedo(save: SaveData, level: Level): boolean {
  const rec = save.levels[level.id];
  return !!rec && rec.fp !== fingerprint(level);
}

/** Level i is open once level i-1 has been beaten (in any version). */
export function unlockedLevels(levels: readonly Level[], save: SaveData): boolean[] {
  return levels.map((_, i) => i === 0 || !!save.levels[levels[i - 1]!.id]);
}

/** Where to pick up: the first open level not yet beaten (in its current form), or the last one. */
export function continueIndex(levels: readonly Level[], save: SaveData): number {
  const open = unlockedLevels(levels, save);
  const i = levels.findIndex((l, k) => open[k] && !isCompleted(save, l));
  return i >= 0 ? i : Math.max(0, levels.length - 1);
}
