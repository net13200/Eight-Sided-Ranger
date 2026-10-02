/**
 * Authoring aid: tries a creature (or tile) on every grass triangle of a
 * level and lists the spots where the level still teaches everything it says
 * plus `--teach` (if given), with the new par. Doesn't write the file.
 *
 *   npx tsx tools/place.ts src/levels/data/2-10.txt --glyph B --teach bear [--loose]
 *   (--loose also lists spots that break a teach, saying why)
 */
import { readFileSync } from 'node:fs';
import { parseLevel, startState } from '../src/engine';
import { solve } from '../src/solver/solve';
import { checkTeach, type Teach } from '../src/solver/teaches';

const args = process.argv.slice(2);
const opt = (n: string, d: string) =>
  args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1]! : d;
const file = args[0]!;
const glyph = opt('glyph', 'B');
const extra = opt('teach', '');
const text = readFileSync(file, 'utf8');
const [head, body] = text.split(/^---\s*$/m) as [string, string];
const grid = body
  .split('\n')
  .filter((r) => r.trim())
  .map((r) => r.split(''));
const base = solve(startState(parseLevel(text)), { maxNodes: 400_000 }).moves;
console.log(`${file}: par ${base} now`);

for (let y = 0; y < grid.length; y++)
  for (let x = 0; x < grid[y]!.length; x++) {
    if (grid[y]![x] !== '.') continue;
    const g = grid.map((r) => [...r]);
    g[y]![x] = glyph;
    const lv = parseLevel(`${head}---\n${g.map((r) => r.join('')).join('\n')}\n`);
    const r = solve(startState(lv), { maxNodes: 400_000 });
    if (r.status !== 'solved') continue;
    const teaches = [...(lv.teaches ?? []), ...(extra ? [extra] : [])] as Teach[];
    const bad = teaches.flatMap((t) => checkTeach(lv, r.path, t));
    if (bad.length && !args.includes('--loose')) continue;
    console.log(
      `  (${x},${y}) par ${r.moves} (+${r.moves - base}) ${r.path.join('')}${bad.length ? ` [${bad.join('; ')}]` : ''}`,
    );
  }
