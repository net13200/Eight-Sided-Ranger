/** Every level: winnable at exactly its par, it needs what it teaches, and its die holds only taught faces. */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevel, startState } from '../../src/engine';
import { solve } from '../../src/solver/solve';
import { FACE_TEACHES, TEACHES, checkTeach, type Teach } from '../../src/solver/teaches';

const dir = 'src/levels/data';
const levels = readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .sort()
  .map((f) => parseLevel(readFileSync(`${dir}/${f}`, 'utf8')));

describe('levels', () => {
  it('ids are unique', () => {
    expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length);
  });

  it('every board fits the stage (9 triangles across, 6 rows)', () => {
    for (const lv of levels)
      expect([lv.id, lv.width <= 9 && lv.height <= 6]).toEqual([lv.id, true]);
  });

  const taught = new Set<string>(['Leaf']);
  for (const lv of levels) {
    for (const t of lv.teaches ?? [])
      if (t in FACE_TEACHES) taught.add(FACE_TEACHES[t as keyof typeof FACE_TEACHES]);
    const known = new Set(taught);

    it(`${lv.id} ${lv.name}: only taught faces on the die`, () => {
      expect(lv.loadout.filter((f) => !known.has(f))).toEqual([]);
    });

    it(`${lv.id} ${lv.name}: par is the fewest moves, and it teaches ${lv.teaches?.join(', ')}`, () => {
      const r = solve(startState(lv), { maxNodes: 400_000 });
      expect(r.status).toBe('solved');
      expect(lv.par).toBe(r.moves);
      expect(lv.teaches?.length).toBeGreaterThan(0);
      for (const t of lv.teaches ?? []) {
        expect(TEACHES).toContain(t);
        expect(checkTeach(lv, r.path, t as Teach)).toEqual([]);
      }
      if (lv.hint) expect(lv.hint.length).toBeLessThanOrEqual(40);
    });
  }
});
