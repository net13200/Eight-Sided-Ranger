/**
 * Authoring aid: prints what happens along a level's par route, turn by turn
 * (for writing hints that tell the truth).
 *
 *   npx tsx tools/story-of.ts src/levels/data/5-06.txt
 */
import { readFileSync } from 'node:fs';
import { parseLevel, startState, step, type Dir } from '../src/engine';
import { solve } from '../src/solver/solve';

for (const file of process.argv.slice(2)) {
  const lv = parseLevel(readFileSync(file, 'utf8'));
  const r = solve(startState(lv), { maxNodes: 400_000 });
  console.log(`${lv.id} ${lv.name} (par ${r.moves})`);
  let s = startState(lv);
  for (const d of r.path) {
    const res = step(s, d as Dir);
    const notes = res.events
      .filter((e) => e.type !== 'moved' && e.type !== 'enemyMoved')
      .map((e) => ('at' in e && e.at ? `${e.type}@${e.at.x},${e.at.y}` : e.type));
    s = res.state;
    console.log(`  ${d} -> ${s.x},${s.y} hp ${s.hp} ${notes.join(' ')}`);
  }
}
