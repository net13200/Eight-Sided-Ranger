/**
 * Solves levels: par (the fewest moves), the route, and whether each level
 * teaches what it says.
 *
 *   npm run solve                      # every level
 *   npm run solve -- src/levels/data/1-03.txt
 *   npm run solve -- --write-par       # set par: to the solver's minimum
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseLevel, startState } from '../src/engine';
import { solve } from '../src/solver/solve';
import { checkTeach, type Teach } from '../src/solver/teaches';

const args = process.argv.slice(2);
const write = args.includes('--write-par');
const dir = 'src/levels/data';
const files = args.filter((a) => !a.startsWith('--'));
const paths = files.length
  ? files
  : readdirSync(dir)
      .filter((f) => f.endsWith('.txt'))
      .sort()
      .map((f) => `${dir}/${f}`)
      .concat(
        readdirSync('src/levels/gauntlets')
          .filter((f) => f.endsWith('.txt'))
          .sort()
          .map((f) => `src/levels/gauntlets/${f}`),
      );
let bad = 0;
for (const path of paths) {
  const text = readFileSync(path, 'utf8');
  const lv = parseLevel(text);
  const r = solve(startState(lv), { maxNodes: 1_000_000 });
  const issues =
    r.status === 'solved'
      ? (lv.teaches ?? []).flatMap((t) => checkTeach(lv, r.path, t as Teach))
      : [r.status];
  if (r.status === 'solved' && lv.par !== r.moves)
    issues.push(`par ${lv.par} but solver ${r.moves}`);
  if (issues.length) bad++;
  console.log(
    `${lv.id.padEnd(6)} ${lv.name.padEnd(22)} par ${String(r.moves).padStart(3)}  ${r.path.join('')}${issues.length ? `\n         ! ${issues.join('; ')}` : ''}`,
  );
  if (write && r.status === 'solved' && lv.par !== r.moves)
    writeFileSync(path, text.replace(/^par:.*$/m, `par: ${r.moves}`));
}
if (bad && !write) process.exitCode = 1;
