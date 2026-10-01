/**
 * The campaign's levels, bundled from src/levels/data/*.txt in file order. A
 * gauntlet's later floors live in src/levels/gauntlets/<id>-2.txt and
 * <id>-3.txt and are attached to its first floor.
 */
import { parseLevel, type Level } from '../engine';
import { withFloors } from './floors';

const files = import.meta.glob('./data/*.txt', { query: '?raw', import: 'default', eager: true });
const floorFiles = import.meta.glob('./gauntlets/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function loadLevels(): Level[] {
  const levels = Object.keys(files)
    .sort()
    .map((path) => parseLevel(files[path] as string));
  return withFloors(levels, floorFiles as Record<string, string>);
}
