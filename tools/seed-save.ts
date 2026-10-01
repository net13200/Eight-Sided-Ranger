/**
 * Prints a save (JSON) with the first N levels beaten, for screenshots and
 * browser tests:  npx tsx tools/seed-save.ts 4 3,3,2,1 [--unseen]
 * Stars per level are listed (default 3). --unseen leaves the newest road
 * unlaid, so the map lays it on entry.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { parseLevel } from '../src/engine';
import { fingerprint } from '../src/meta/progress';
import { freshSave } from '../src/meta/save';

const [n = '0', starList = ''] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const unseen = process.argv.includes('--unseen');
const stars = starList.split(',').filter(Boolean).map(Number);
const dir = 'src/levels/data';
const levels = readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .sort()
  .map((f) => parseLevel(readFileSync(`${dir}/${f}`, 'utf8')));
const save = freshSave();
for (let i = 0; i < Number(n); i++) {
  const lv = levels[i]!;
  save.levels[lv.id] = {
    stars: stars[i] ?? 3,
    bestMoves: lv.par ?? 0,
    completions: 1,
    fp: fingerprint(lv),
  };
  save.seen[`lesson:${lv.id}`] = true;
}
for (let i = 1; i <= Number(n) - (unseen ? 1 : 0); i++) save.seen[`road:${i}`] = true;
console.log(JSON.stringify(save));
