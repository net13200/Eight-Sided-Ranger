/**
 * Authoring aid: grows scenery (water by default) next to what's already
 * there, one triangle at a time, keeping each addition only if the level
 * plays exactly the same (same par, still teaches what it says). Rivers look
 * like rivers; the puzzle doesn't change. Writes the file in place.
 *
 *   npx tsx tools/decorate.ts src/levels/data/3-02.txt [--glyph ~] [--grow 8] [--seed 1]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseLevel, startState } from '../src/engine';
import { solve } from '../src/solver/solve';
import { checkTeach, type Teach } from '../src/solver/teaches';
import { Rng } from './lib/rng';

const args = process.argv.slice(2);
const opt = (n: string, d: string) =>
  args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1]! : d;
const file = args[0]!;
const glyph = opt('glyph', '~');
const grow = Number(opt('grow', '8'));
const rng = new Rng(Number(opt('seed', '1')));
const text = readFileSync(file, 'utf8');
const [head, body] = text.split(/^---\s*$/m) as [string, string];
const grid = body
  .split('\n')
  .filter((r) => r.trim())
  .map((r) => r.split(''));
const parse = (g: string[][]) => parseLevel(`${head}---\n${g.map((r) => r.join('')).join('\n')}\n`);
const base = parse(grid);
const par = solve(startState(base), { maxNodes: 400_000 }).moves;
const ok = (g: string[][]) => {
  const lv = parse(g);
  const r = solve(startState(lv), { maxNodes: 400_000 });
  return (
    r.status === 'solved' &&
    r.moves === par &&
    (lv.teaches ?? []).every((t) => checkTeach(lv, r.path, t as Teach).length === 0)
  );
};
const H = grid.length;
const W = grid[0]!.length;
let added = 0;
for (let tries = 0; tries < grow * 12 && added < grow; tries++) {
  // A grass cell next to the same scenery (or anywhere, if there's none yet).
  const spots: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (grid[y]![x] !== '.') continue;
      const kin = glyph === '~' ? '~}{o' : glyph;
      const near = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([a, b]) => kin.includes(grid[b!]?.[a!] ?? ' '));
      if (near) spots.push([x, y]);
    }
  if (!spots.length) break;
  const [x, y] = spots[rng.int(spots.length)]!;
  grid[y]![x] = glyph;
  if (ok(grid)) added++;
  else grid[y]![x] = '.';
}
writeFileSync(file, `${head}---\n${grid.map((r) => r.join('')).join('\n')}\n`);
console.log(
  `${file}: +${added} '${glyph}' (par ${par})\n${grid.map((r) => r.join('')).join('\n')}`,
);
