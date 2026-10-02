/**
 * A save with the first N levels beaten, for screenshots and browser tests.
 * Stars per level can be listed (default 3); `unseen` leaves the newest road
 * unlaid, so the map lays it on entry.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { parseLevel } from '../../src/engine';
import { withFloors } from '../../src/levels/floors';
import { fingerprint, runPar } from '../../src/meta/progress';
import { freshSave } from '../../src/meta/save';

const read = (dir: string) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => [f, readFileSync(`${dir}/${f}`, 'utf8')] as const);

export function seedSave(n: number, stars: readonly number[] = [], unseen = false): string {
  const levels = withFloors(
    read('src/levels/data').map(([, text]) => parseLevel(text)),
    Object.fromEntries(read('src/levels/gauntlets')),
  );
  const save = freshSave();
  for (let i = 0; i < n; i++) {
    const lv = levels[i]!;
    save.levels[lv.id] = {
      stars: stars[i] ?? 3,
      bestMoves: runPar(lv) ?? 0,
      completions: 1,
      fp: fingerprint(lv),
    };
    save.seen[`lesson:${lv.id}`] = true;
  }
  for (let i = 1; i <= n - (unseen ? 1 : 0); i++) save.seen[`road:${i}`] = true;
  return JSON.stringify(save);
}
