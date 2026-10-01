/** Every level: winnable at exactly its par, it needs what it teaches, and its die holds only taught faces. */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevel, startState } from '../../src/engine';
import { withFloors } from '../../src/levels/floors';
import { solve } from '../../src/solver/solve';
import { FACE_TEACHES, TEACHES, checkTeach, type Teach } from '../../src/solver/teaches';

const dir = 'src/levels/data';
const floorDir = 'src/levels/gauntlets';
const read = (d: string) =>
  Object.fromEntries(
    readdirSync(d)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => [`${d}/${f}`, readFileSync(`${d}/${f}`, 'utf8')]),
  );
const levels = withFloors(
  Object.values(read(dir))
    .map((text) => parseLevel(text))
    .sort((a, b) => a.id.localeCompare(b.id)),
  read(floorDir),
);
/** Every level and gauntlet floor, in play order. */
const all = levels.flatMap((l) => [l, ...(l.floors ?? [])]);

describe('levels', () => {
  it('ids are unique', () => {
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
  });

  it('every board fits the stage (9 triangles across, 6 rows)', () => {
    for (const lv of levels)
      expect([lv.id, lv.width <= 9 && lv.height <= 6]).toEqual([lv.id, true]);
  });

  it('gauntlet floors after the first are winnable from 1 HP', () => {
    for (const lv of levels)
      for (const f of lv.floors ?? []) expect([f.id, f.hp]).toEqual([f.id, 1]);
  });

  const taught = new Set<string>(['Leaf']);
  for (const lv of all) {
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
