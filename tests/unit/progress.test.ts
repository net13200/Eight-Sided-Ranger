/** Saves, unlocking, and "solve it again" when a level changes. */
import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../src/engine';
import {
  continueIndex,
  fingerprint,
  isCompleted,
  needsRedo,
  unlockedLevels,
} from '../../src/meta/progress';
import { Save, freshSave, parseSave } from '../../src/meta/save';
import type { KeyValueStorage } from '../../src/platform/platform';

const lv = (id: string, grid = '@.>') =>
  parseLevel(`id: ${id}\nname: ${id}\npar: 2\nloadout: ${'Leaf '.repeat(8)}\n---\n${grid}`);
const memory = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => (m.set(k, v), true),
    remove: (k) => void m.delete(k),
  };
};

describe('progress', () => {
  const levels = [lv('a'), lv('b'), lv('c')];

  it('the first level is open; each win opens the next', () => {
    const save = new Save(memory());
    expect(unlockedLevels(levels, save.data)).toEqual([true, false, false]);
    save.recordWin('a', fingerprint(levels[0]!), 2, 3);
    expect(unlockedLevels(levels, save.data)).toEqual([true, true, false]);
    expect(continueIndex(levels, save.data)).toBe(1);
  });

  it('keeps the best result', () => {
    const save = new Save(memory());
    const fp = fingerprint(levels[0]!);
    save.recordWin('a', fp, 2, 3);
    save.recordWin('a', fp, 9, 1);
    expect(save.data.levels.a).toMatchObject({ stars: 3, bestMoves: 2, completions: 2 });
  });

  it('a changed level asks to be solved again, and a new win replaces the old stars', () => {
    const save = new Save(memory());
    save.recordWin('a', fingerprint(levels[0]!), 2, 3);
    const changed = lv('a', '@..>');
    expect(fingerprint(changed)).not.toBe(fingerprint(levels[0]!));
    expect(needsRedo(save.data, changed)).toBe(true);
    expect(isCompleted(save.data, changed)).toBe(false);
    expect(unlockedLevels([changed, levels[1]!], save.data)).toEqual([true, true]); // stays open
    save.recordWin('a', fingerprint(changed), 5, 2);
    expect(save.data.levels.a).toMatchObject({ stars: 2, bestMoves: 5 });
    expect(isCompleted(save.data, changed)).toBe(true);
  });

  it('a win saved before fingerprints existed still counts', () => {
    const save = new Save(memory());
    save.update((d) => (d.levels.a = { stars: 2, bestMoves: 3, completions: 1 }));
    expect(isCompleted(save.data, levels[0]!)).toBe(true);
    expect(needsRedo(save.data, levels[0]!)).toBe(false);
  });

  it('a save survives a reload; a broken one starts fresh', () => {
    const store = memory();
    new Save(store).recordWin('a', 'x', 2, 3);
    expect(new Save(store).data.levels.a?.stars).toBe(3);
    expect(parseSave('{nope')).toEqual(freshSave());
  });
});
