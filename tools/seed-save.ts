/**
 * Prints a save (JSON) with the first N levels beaten, for screenshots:
 *   npx tsx tools/seed-save.ts 4 3,3,2,1 [--unseen]
 * (Browser tests import seedSave from tools/lib/seed.ts directly.)
 */
import { seedSave } from './lib/seed';

const [n = '0', starList = ''] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const stars = starList.split(',').filter(Boolean).map(Number);
console.log(seedSave(Number(n), stars, process.argv.includes('--unseen')));
