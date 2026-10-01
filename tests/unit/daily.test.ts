/** The Daily Trail: the same floors for everyone, fair floors, streaks. */
import { describe, expect, it } from 'vitest';
import { startState } from '../../src/engine';
import {
  addDays,
  currentStreak,
  dailyFloor,
  dailyTier,
  recordDaily,
  runPar,
  shareText,
} from '../../src/meta/daily';
import { fingerprint } from '../../src/meta/progress';
import { freshSave } from '../../src/meta/save';
import { solve } from '../../src/solver/solve';

describe('Daily Trail floors', () => {
  // Golden: past days must never change. If this fails, the generator's output
  // changed: keep the old behaviour for these dates (see src/gen/generate.ts).
  it('past days are exactly as they were', () => {
    const got = ['2026-10-01', '2026-10-02'].flatMap((d) =>
      [1, 2, 3].map((f) => fingerprint(dailyFloor(d, 1, f))),
    );
    expect(got).toEqual(['b966a53a', 'd9369073', 'ec531954', '1f0383ce', 'f88a66e5', '4d3bea51']);
  });

  it('each floor is winnable at its par from the HP it is entered with, and needs the die', () => {
    for (let k = 0; k < 6; k++) {
      const date = addDays('2026-11-01', k);
      const floors = [1, 2, 3].map((f) => dailyFloor(date, 1, f));
      floors.forEach((lv, i) => {
        expect(lv.hp ?? 3).toBe(i === 0 ? 3 : 1);
        const r = solve(startState(lv), { maxNodes: 200_000 });
        expect(r.moves).toBe(lv.par);
        expect(lv.loadout.filter((f) => f !== 'Leaf').length).toBeGreaterThanOrEqual(2);
        for (const f of lv.loadout) expect(['Bow', 'Knife', 'Herb', 'Leaf']).toContain(f);
        expect(lv.width).toBeLessThanOrEqual(9);
        expect(lv.height).toBeLessThanOrEqual(6);
      });
      expect(runPar(floors)).toBe(floors.reduce((n, f) => n + f.par!, 0));
    }
  });

  it('the tier never goes past the districts a player has reached', () => {
    expect(dailyTier('2026-10-01', 1)).toBe(1);
    expect(dailyTier('2026-10-01', 6)).toBe(1); // only the Edgewood is released
  });
});

describe('streaks', () => {
  it('a day after day finish grows the streak; a missed day resets it; practice changes nothing', () => {
    const save = freshSave();
    const r = { moves: 30, par: 30, stars: 3 };
    expect(recordDaily(save, '2026-10-01', r)).toBe(true);
    expect(recordDaily(save, '2026-10-02', r)).toBe(true);
    expect(currentStreak(save, '2026-10-02')).toBe(2);
    expect(currentStreak(save, '2026-10-03')).toBe(2);
    expect(recordDaily(save, '2026-10-02', { ...r, stars: 1 })).toBe(false);
    expect(save.daily.results['2026-10-02']?.stars).toBe(3);
    expect(currentStreak(save, '2026-10-04')).toBe(0);
    recordDaily(save, '2026-10-05', r);
    expect(save.daily).toMatchObject({ streak: 1, bestStreak: 2 });
  });

  it('the shared result has no link where links are not allowed', () => {
    const text = shareText('2026-10-01', { moves: 33, par: 31, stars: 2 }, 4, null);
    expect(text).toContain('★★☆');
    expect(text).toContain('33');
    expect(text).not.toMatch(/https?:/);
    expect(shareText('2026-10-01', { moves: 31, par: 31, stars: 3 }, 1, 'https://x.y/')).toMatch(
      /https:\/\/x\.y\//,
    );
  });
});
