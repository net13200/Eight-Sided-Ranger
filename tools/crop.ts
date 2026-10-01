/**
 * Authoring aid: trims empty edges off a level, keeping each cut only if the
 * level plays exactly the same (same par, still teaches what it says). Cuts
 * on the top and left come in pairs (or one of each) so every triangle keeps
 * pointing the same way. Writes the file in place.
 *
 *   npx tsx tools/crop.ts src/levels/data/4-07.txt
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseLevel, startState } from '../src/engine';
import { solve } from '../src/solver/solve';
import { checkTeach, type Teach } from '../src/solver/teaches';

const file = process.argv[2]!;
const text = readFileSync(file, 'utf8');
const [head, body] = text.split(/^---\s*$/m) as [string, string];
let grid = body
  .split('\n')
  .filter((r) => r.trim())
  .map((r) => r.split(''));
const parse = (g: string[][]) => parseLevel(`${head}---\n${g.map((r) => r.join('')).join('\n')}\n`);
const par = solve(startState(parse(grid)), { maxNodes: 400_000 }).moves;
const ok = (g: string[][]) => {
  if (g.length < 3 || g[0]!.length < 5) return false;
  try {
    const lv = parse(g);
    const r = solve(startState(lv), { maxNodes: 400_000 });
    return (
      r.status === 'solved' &&
      r.moves === par &&
      (lv.teaches ?? []).every((t) => checkTeach(lv, r.path, t as Teach).length === 0)
    );
  } catch {
    return false;
  }
};

const cuts: ((g: string[][]) => string[][])[] = [
  (g) => g.slice(0, -1), // bottom row
  (g) => g.map((r) => r.slice(0, -1)), // right column
  (g) => g.slice(2), // two top rows
  (g) => g.map((r) => r.slice(2)), // two left columns
  (g) => g.slice(1).map((r) => r.slice(1)), // one of each
];
for (let changed = true; changed;) {
  changed = false;
  for (const cut of cuts) {
    const next = cut(grid);
    if (ok(next)) {
      grid = next;
      changed = true;
    }
  }
}
writeFileSync(file, `${head}---\n${grid.map((r) => r.join('')).join('\n')}\n`);
console.log(`${file} (par ${par})\n${grid.map((r) => r.join('')).join('\n')}`);
