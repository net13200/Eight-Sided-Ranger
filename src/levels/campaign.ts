/** The campaign's levels, bundled from src/levels/data/*.txt in file order. */
import { parseLevel, type Level } from '../engine';

const files = import.meta.glob('./data/*.txt', { query: '?raw', import: 'default', eager: true });

export function loadLevels(): Level[] {
  return Object.keys(files)
    .sort()
    .map((path) => parseLevel(files[path] as string));
}
