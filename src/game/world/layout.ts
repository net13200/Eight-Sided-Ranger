/**
 * The world map's layout: the Greenwood as one tall board, from Oddmere's
 * edge at the bottom to the Great Oak at the top. Each district is a band of
 * rows; levels are pedestals joined by a road of stones, one stone between
 * two levels. Pure data, so it's unit tested.
 */

/** World width in tiles (the stage is 340 wide: 10 tiles of 34; the road uses 1..9). */
export const COLS = 10;
export const TILE = 34;
/** Rows per district: a hedgerow, then the road climbing ten rows. */
export const BAND_ROWS = 12;
/** Rows above the last district (the Great Oak) and below the first (Oddmere's edge). */
export const TOP_ROWS = 5;
export const BOTTOM_ROWS = 3;
export const DISTRICTS = 6;
export const DISTRICT_SIZE = 10;

export interface Pos {
  readonly c: number;
  readonly r: number;
}

export interface Band {
  readonly district: number;
  /** First (top) row of the district: its hedgerow. */
  readonly top: number;
}

export interface WorldLayout {
  readonly rows: number;
  readonly bands: readonly Band[];
  readonly pedestals: readonly Pos[];
  /** segments[i]: the stones leading into pedestal i (endpoints excluded); segments[0] is empty. */
  readonly segments: readonly (readonly Pos[])[];
  /** Where the Great Oak stands, above the last district. */
  readonly oak: Pos;
}

export const key = (p: Pos): string => `${p.c},${p.r}`;

/**
 * Each district's road is a switchback: from level to level it goes two rows
 * up (N) or two columns across (h), four times across and five times up, so
 * the ten levels cross the board. The next district starts right above,
 * through a gap in the hedge, and crosses back. It only ever goes up or
 * across, so no two levels are next to each other except along the road.
 */
const PATTERNS = ['NhNhNhNhN', 'NNhNhhNhN', 'NhhNNhNhN'];

export function buildWorld(levelCount: number): WorldLayout {
  const rows = TOP_ROWS + DISTRICTS * BAND_ROWS + BOTTOM_ROWS;
  const bandTop = (d: number) => TOP_ROWS + (DISTRICTS - 1 - d) * BAND_ROWS;
  const bands = Array.from({ length: DISTRICTS }, (_, d) => ({ district: d, top: bandTop(d) }));
  const pedestals: Pos[] = [];
  let c = 1;
  let r = 0;
  for (let i = 0; i < Math.min(levelCount, DISTRICTS * DISTRICT_SIZE); i++) {
    const d = Math.floor(i / DISTRICT_SIZE);
    const j = i % DISTRICT_SIZE;
    const across = d % 2 ? -2 : 2;
    if (j === 0) r = bandTop(d) + BAND_ROWS - 1;
    else if (PATTERNS[d % PATTERNS.length]![j - 1] === 'h') c += across;
    else r -= 2;
    pedestals.push({ c, r });
  }
  const segments = pedestals.map((p, i) => (i === 0 ? [] : between(pedestals[i - 1]!, p)));
  return { rows, bands, pedestals, segments, oak: { c: 5, r: 2 } };
}

/** Stones strictly between a and b: along a's row first, then up its column. */
function between(a: Pos, b: Pos): Pos[] {
  const out: Pos[] = [];
  let { c, r } = a;
  while (c !== b.c) out.push({ c: (c += c < b.c ? 1 : -1), r });
  while (r !== b.r) out.push({ c, r: (r += r < b.r ? 1 : -1) });
  out.pop();
  return out;
}

/** The district a row belongs to: -1 above the last (the Oak), DISTRICTS below the first. */
export function districtOf(world: WorldLayout, r: number): number {
  for (const b of world.bands) if (r >= b.top && r < b.top + BAND_ROWS) return b.district;
  return r < TOP_ROWS ? -1 : DISTRICTS;
}

/** The road from pedestal `from` to pedestal `to`, stone by stone (both ends included). */
export function roadBetween(world: WorldLayout, from: number, to: number): Pos[] {
  const step = to > from ? 1 : -1;
  const out: Pos[] = [world.pedestals[from]!];
  for (let i = from; i !== to; i += step) {
    const seg = step > 0 ? world.segments[i + 1]! : [...world.segments[i]!].reverse();
    out.push(...seg, world.pedestals[i + step]!);
  }
  return out;
}
