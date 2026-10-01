/**
 * The Daily Trail: three floors per UTC day. Everyone who has reached the
 * same district gets the same trail: the faces and creatures a day may use
 * grow as districts are released, but never past the districts a player has
 * reached. HP carries from floor to floor with no healing in between, so
 * floors 2 and 3 are built to be winnable from 1 HP. Scored like a
 * gauntlet: all the moves of the run against one par for the whole run.
 * Pure functions; the date comes from the caller.
 */
import { MAX_HP, type Level } from '../engine';
import { generateFloor, seedFrom, type GenParams, type Pool } from '../gen/generate';
import { starsFor } from '../game/stars';
import { t } from '../i18n';
import type { SaveData } from './save';

export const DAILY_FLOORS = 3;

/** When each district's faces and creatures join the Daily Trail. */
export const RELEASES: readonly { readonly district: number; readonly from: string }[] = [
  { district: 1, from: '2026-01-01' },
];

/** What a trail may use, by tier (the districts it draws on). */
const POOLS: readonly Pool[] = [
  { faces: ['Bow', 'Knife', 'Herb'], creatures: ['wolf'], springs: true },
];

const BANDS: readonly (readonly [number, number])[] = [
  [7, 11],
  [9, 13],
  [11, 15],
];

/** UTC calendar date, e.g. "2026-10-01". */
export function utcDate(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return utcDate(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000);
}

/** The trail's tier for a player: districts released by that date, but no more than they've reached. */
export function dailyTier(date: string, reached: number): number {
  const released = RELEASES.filter((r) => r.from <= date).length;
  return Math.max(1, Math.min(released, reached, POOLS.length));
}

export function floorParams(date: string, tier: number, floor: number): GenParams {
  return {
    seed: seedFrom(`esr-daily:${date}:${tier}:${floor}`),
    id: `daily-${date}-${floor}`,
    name: 'Daily Trail',
    hp: floor === 1 ? MAX_HP : 1,
    band: BANDS[floor - 1]!,
    pool: POOLS[tier - 1]!,
    wolves: floor,
  };
}

export function dailyFloor(date: string, tier: number, floor: number): Level {
  return generateFloor(floorParams(date, tier, floor));
}

/** One par for the whole run: the floors' pars added up. */
export function runPar(floors: readonly Level[]): number {
  return floors.reduce((n, f) => n + (f.par ?? 0), 0);
}

export interface DailyResult {
  moves: number;
  par: number;
  stars: number;
}

export function dailyStars(moves: number, par: number): number {
  return starsFor(moves, par);
}

/** The streak shown today: it counts through yesterday's trail, and is 0 once a day is missed. */
export function currentStreak(save: SaveData, today: string): number {
  const last = save.daily.lastDate;
  if (!last) return 0;
  return last === today || last === addDays(today, -1) ? save.daily.streak : 0;
}

/**
 * Records a day's first finish. Later finishes the same day are practice and
 * change nothing. Returns whether this one counted.
 */
export function recordDaily(save: SaveData, date: string, result: DailyResult): boolean {
  const d = save.daily;
  if (d.results[date]) return false;
  d.streak = d.lastDate === addDays(date, -1) ? d.streak + 1 : 1;
  d.bestStreak = Math.max(d.bestStreak, d.streak);
  d.lastDate = date;
  d.results[date] = { ...result };
  const dates = Object.keys(d.results).sort();
  for (const old of dates.slice(0, Math.max(0, dates.length - 90))) delete d.results[old];
  return true;
}

export function shareText(
  date: string,
  r: DailyResult,
  streak: number,
  url: string | null,
): string {
  return [
    `Eight-Sided Ranger · ${t('Daily Trail')} ${date}`,
    `${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)} ${t('{n} moves (par {par})', { n: r.moves, par: r.par })}`,
    ...(streak > 1 ? [t('{n}-day streak', { n: streak })] : []),
    ...(url ? [url] : []),
  ].join('\n');
}
