/**
 * Levels as small text files: `key: value` lines (id, name, par, hint,
 * loadout, teaches), `---`, then the grid, one character per triangle.
 */
import { isUp, type Pos } from './grid';
import { ENEMY_HP, MAX_HP, TILE_GLYPH, type Enemy, type Level, type Tile } from './rules';

/**
 * Level text format: `key: value` lines, `---`, then the
 * grid, one character per triangle (see TILE_GLYPH; `@` the die on an up
 * triangle, `w` a wolf, `z` a sleeping wolf, `s` a stag, `b` a boar, all on grass).
 */
export function parseLevel(text: string): Level {
  const [head, body] = text.split(/^---\s*$/m) as [string, string];
  const meta: Record<string, string> = {};
  for (const line of head.split('\n')) {
    const m = /^\s*([a-zA-Z-]+)\s*:\s*(.*?)\s*$/.exec(line);
    if (m) meta[m[1]!.toLowerCase()] = m[2]!;
  }
  const rows = body
    .split('\n')
    .map((r) => r.trimEnd())
    .filter((r) => r.length);
  const width = Math.max(...rows.map((r) => r.length));
  const tiles: Tile[] = [];
  const enemies: Array<Omit<Enemy, 'id' | 'snared'>> = [];
  let start: Pos | null = null;
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '#';
      if (ch === '@') start = { x, y };
      if (ch === 'w' || ch === 's' || ch === 'z' || ch === 'b' || ch === 'h') {
        const kind = ch === 's' ? 'stag' : ch === 'b' ? 'boar' : ch === 'h' ? 'owl' : 'wolf';
        enemies.push({ kind, x, y, hp: ENEMY_HP[kind], ...(ch === 'z' ? { asleep: true } : {}) });
      }
      const tile = TILE_GLYPH[ch] ?? 'grass';
      if (!(ch in TILE_GLYPH) && !'@wszbh'.includes(ch)) throw new Error(`Unknown glyph '${ch}'`);
      tiles.push(tile);
    }
  });
  if (!start) throw new Error(`Level ${meta.id}: no @`);
  const s: Pos = start;
  if (!isUp(s.x, s.y)) throw new Error(`Level ${meta.id}: @ must be on an up triangle`);
  const loadout = (meta.loadout ?? '').split(/[\s,]+/).filter(Boolean);
  if (loadout.length !== 8) throw new Error(`Level ${meta.id}: loadout needs 8 faces`);
  return {
    id: meta.id ?? '?',
    name: meta.name ?? '?',
    width,
    height: rows.length,
    tiles,
    start: s,
    enemies,
    loadout,
    ...(meta.par ? { par: Number(meta.par) } : {}),
    ...(meta.hint ? { hint: meta.hint } : {}),
    ...(meta.hp ? { hp: hpValue(meta.hp, meta.id) } : {}),
    ...(meta.teaches ? { teaches: meta.teaches.split(/[\s,]+/).filter(Boolean) } : {}),
  };
}

function hpValue(v: string, id: string | undefined): number {
  const hp = Number(v);
  if (!Number.isInteger(hp) || hp < 1 || hp > MAX_HP)
    throw new Error(`Level ${id}: hp must be 1-${MAX_HP}`);
  return hp;
}
