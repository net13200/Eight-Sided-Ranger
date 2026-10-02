/** The story: when its pages show, and that they stay short. */
import { describe, expect, it } from 'vitest';
import {
  BEAR_LINES,
  DISTRICT_LINES,
  ENDING,
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

  it("the Old Bear's card before each district's last level, once", () => {
    expect(storyBeforeLevel(9, () => false, false).keys).toEqual([STORY_KEYS.bear(0)]);
    expect(storyBeforeLevel(59, () => false, false).pages[0]!.art).toBe('bear');
    expect(storyBeforeLevel(9, (k) => k === STORY_KEYS.bear(0), false).pages).toHaveLength(0);
    expect(storyBeforeLevel(9, () => false, true).pages).toHaveLength(0);
  });

  it('the story so far: bear cards met, and the ending once seen', () => {
    const all = storySoFar(6, () => true);
    expect(all.filter((p) => p.art === 'bear')).toHaveLength(6);
    expect(all.slice(-ENDING.length)).toEqual(ENDING);
    expect(storySoFar(6).some((p) => p.art === 'bear' || p.art === 'snow')).toBe(false);
  });

  it('short: four intro pages, a line per district, no page over 200 characters', () => {
    expect(INTRO.length).toBeLessThanOrEqual(4);
    expect(DISTRICT_LINES).toHaveLength(DISTRICTS);
    expect(BEAR_LINES).toHaveLength(DISTRICTS);
    for (const p of storySoFar(6, () => true)) expect(p.text.length).toBeLessThanOrEqual(200);
  });
});
