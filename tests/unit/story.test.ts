/** The story: when its pages show, and that they stay short. */
import { describe, expect, it } from 'vitest';
import {
  DISTRICT_LINES,
  INTRO,
  STORY_KEYS,
  storyBeforeLevel,
  storySoFar,
} from '../../src/game/story';
import { DISTRICTS } from '../../src/game/world/layout';

describe('story', () => {
  it('a first level 1: the intro, then the Edgewood card; seen once', () => {
    const seen = new Set<string>();
    const first = storyBeforeLevel(0, (k) => seen.has(k), false);
    expect(first.pages).toHaveLength(INTRO.length + 1);
    first.keys.forEach((k) => seen.add(k));
    expect(storyBeforeLevel(0, (k) => seen.has(k), false).pages).toHaveLength(0);
  });

  it('a district card before its first level only; nothing for players who beat it', () => {
    expect(storyBeforeLevel(10, () => false, false).keys).toEqual([STORY_KEYS.district(1)]);
    expect(storyBeforeLevel(11, () => false, false).pages).toHaveLength(0);
    expect(storyBeforeLevel(0, () => false, true).pages).toHaveLength(0);
  });

  it('short: four intro pages, a line per district, no page over 200 characters', () => {
    expect(INTRO.length).toBeLessThanOrEqual(4);
    expect(DISTRICT_LINES).toHaveLength(DISTRICTS);
    for (const p of [...INTRO, ...storySoFar(6)]) expect(p.text.length).toBeLessThanOrEqual(200);
  });
});
