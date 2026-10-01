/**
 * Authoring aid: removes creatures (and trees, water) from a level one at a
 * time, keeping each removal only if the level still teaches what it says.
 * Creatures go first. Prints the result; doesn't write the file.
 *
 *   npx tsx tools/prune.ts src/levels/data/1-10.txt [--hp 2] [--only w]
 */
import { readFileSync } from 'node:fs';
import { parseLevel, startState } from '../src/engine';
import { solve } from '../src/solver/solve';
import { checkTeach, type Teach } from '../src/solver/teaches';

const args = process.argv.slice(2);
const opt = (n: string) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
let text = readFileSync(args[0]!, 'utf8');
if (opt('hp'))
  text = /^hp:/m.test(text)
    ? text.replace(/^hp:.*$/m, `hp: ${opt('hp')}`)
    : text.replace(/^loadout:/m, `hp: ${opt('hp')}\nloadout:`);
const only = opt('only') ?? 'wsx#~';
const [head, body] = text.split(/^---\s*$/m) as [string, string];
const grid = body
  .split('\n')
  .filter((r) => r.trim())
  .map((r) => r.split(''));
const ok = (g: string[][]) => {
  const lv = parseLevel(`${head}---\n${g.map((r) => r.join('')).join('\n')}\n`);
  const r = solve(startState(lv), { maxNodes: 300_000 });
  if (r.status !== 'solved') return null;
  return (lv.teaches ?? []).every((t) => checkTeach(lv, r.path, t as Teach).length === 0)
    ? r
    : null;
};
let best = ok(grid);
if (!best) throw new Error('the level does not teach what it says to begin with');
for (const kinds of ['ws', '#~x']) {
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < grid[y]!.length; x++) {
      const c = grid[y]![x]!;
      if (!kinds.includes(c) || !only.includes(c)) continue;
      grid[y]![x] = '.';
      const r = ok(grid);
      if (r) best = r;
      else grid[y]![x] = c;
    }
}
console.log(`par ${best.moves} ${best.path.join('')}\n${grid.map((r) => r.join('')).join('\n')}`);
