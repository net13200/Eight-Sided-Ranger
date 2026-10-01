/** The world map's layout: switchbacks, one stone between levels, roads that never touch. */
import { describe, expect, it } from 'vitest';
import {
  BAND_ROWS,
  COLS,
  DISTRICTS,
  buildWorld,
  districtOf,
  key,
  roadBetween,
} from '../../src/game/world/layout';

const world = buildWorld(60);

describe('world layout', () => {
  it('one stone between consecutive levels, and the road stays on the board', () => {
    world.segments.slice(1).forEach((s) => expect(s).toHaveLength(1));
    for (const p of [...world.pedestals, ...world.segments.flat()]) {
      expect(p.c).toBeGreaterThanOrEqual(1);
      expect(p.c).toBeLessThanOrEqual(COLS - 1);
    }
  });

  it('each district holds its ten levels, and the next starts above it', () => {
    world.pedestals.forEach((p, i) => expect(districtOf(world, p.r)).toBe(Math.floor(i / 10)));
    expect(world.rows).toBeGreaterThan(DISTRICTS * BAND_ROWS);
  });

  it('switchbacks: a district crosses the board, the next crosses back', () => {
    for (let d = 0; d < DISTRICTS; d++) {
      const first = world.pedestals[d * 10]!;
      const last = world.pedestals[d * 10 + 9]!;
      expect(Math.sign(last.c - first.c)).toBe(d % 2 ? -1 : 1);
    }
  });

  it('levels never sit next to each other except along the road', () => {
    const at = new Map(world.pedestals.map((p, i) => [key(p), i]));
    world.pedestals.forEach((p, i) => {
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]) {
        const j = at.get(key({ c: p.c + dc!, r: p.r + dr! }));
        if (j !== undefined) expect(Math.abs(j - i)).toBe(1);
      }
    });
  });

  it('no stone is used twice', () => {
    const all = [...world.pedestals, ...world.segments.flat()].map(key);
    expect(new Set(all).size).toBe(all.length);
  });

  it('roads between levels run stone by stone, both ways', () => {
    const road = roadBetween(world, 3, 7);
    expect(road[0]).toEqual(world.pedestals[3]);
    expect(road.at(-1)).toEqual(world.pedestals[7]);
    for (let k = 1; k < road.length; k++)
      expect(Math.abs(road[k]!.c - road[k - 1]!.c) + Math.abs(road[k]!.r - road[k - 1]!.r)).toBe(1);
    expect(roadBetween(world, 7, 3)).toEqual([...road].reverse());
  });

  it('fewer levels than districts hold: only those pedestals', () => {
    expect(buildWorld(10).pedestals).toHaveLength(10);
    expect(buildWorld(10).bands).toHaveLength(DISTRICTS);
  });
});
