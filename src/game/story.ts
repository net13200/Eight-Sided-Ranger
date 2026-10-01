/**
 * The Last Leaf. The Ranger kept the Queen's woods at the edge of Oddmere;
 * the wish only half caught them. Past the fence, the Greenwood has stopped
 * deciding too: a year of autumn, and the leaves won't fall. At its heart
 * the Great Oak holds on to its last leaves, and the Ranger carries a leaf
 * of their own. Shown as short illustrated pages: the intro before level 1,
 * a card as each district begins (the ending comes with the Heartwood).
 */
import { DISTRICT_NAMES } from '../meta/progress';
import { DISTRICT_SIZE } from './world/layout';
import { t, tk } from '../i18n';

export type StoryArt = 'edge' | 'wish' | 'autumn' | 'oak' | 'district';

export interface StoryPage {
  readonly art: StoryArt;
  readonly title?: string;
  readonly text: string;
  /** For district cards: which district (0-based). */
  readonly district?: number;
}

export const INTRO: readonly StoryPage[] = [
  {
    art: 'edge',
    title: tk('The edge of Oddmere'),
    text: tk(
      "The Ranger kept the Queen's woods at the very edge of Oddmere. It was a quiet job. Mostly, they told deer where the road was.",
    ),
  },
  {
    art: 'wish',
    text: tk(
      'On the morning of the wish, the Ranger stood on the border with one foot out. The Well was bad at edges. It gave them eight sides instead of six.',
    ),
  },
  {
    art: 'autumn',
    text: tk(
      "Half of them was never inside the wish, so they still choose. Past the fence, the Greenwood has stopped choosing. It has been autumn for a year, and the leaves won't fall.",
    ),
  },
  {
    art: 'oak',
    text: tk(
      'At its heart, the Great Oak is holding on to its last leaves. The Ranger is holding on to a leaf too. Time to roll, on purpose.',
    ),
  },
];

/** One line per district, as it begins. */
export const DISTRICT_LINES: readonly string[] = [
  tk('The wolves are cross. Nobody told them why autumn won’t end.'),
  tk('Where the wolves sleep, when they can. Tread softly.'),
  tk('The river can’t decide which way to go, so it goes every way.'),
  tk('The stags have guarded their rows so long they forget why.'),
  tk('Night in the Greenwood. The owls see everything, and say so.'),
  tk('The Old Bear can’t get to sleep. Neither can the Oak.'),
];

export const STORY_KEYS = {
  intro: 'story:intro',
  district: (d: number) => `story:d${d + 1}`,
} as const;

export function districtPage(d: number): StoryPage {
  return {
    art: 'district',
    district: d,
    title: t('District {n}: {name}', { n: d + 1, name: t(DISTRICT_NAMES[d] ?? '') }),
    text: DISTRICT_LINES[d] ?? '',
  };
}

/**
 * What to show before campaign level `index`: the intro (then the first
 * district's card) before a first level 1, or a district's card before its
 * first level. Players who already beat that level see nothing.
 */
export function storyBeforeLevel(
  index: number,
  seen: (key: string) => boolean,
  completed: boolean,
): { pages: StoryPage[]; keys: string[] } {
  if (completed || index % DISTRICT_SIZE !== 0) return { pages: [], keys: [] };
  const d = index / DISTRICT_SIZE;
  const pages: StoryPage[] = [];
  const keys: string[] = [];
  if (d === 0 && !seen(STORY_KEYS.intro)) {
    pages.push(...INTRO);
    keys.push(STORY_KEYS.intro);
  }
  if (!seen(STORY_KEYS.district(d))) {
    pages.push(districtPage(d));
    keys.push(STORY_KEYS.district(d));
  }
  return { pages, keys };
}

/** The story so far, for "Story" on the title screen: the intro and the districts reached. */
export function storySoFar(districtsReached: number): StoryPage[] {
  return [
    ...INTRO,
    ...Array.from({ length: Math.max(1, districtsReached) }, (_, d) => districtPage(d)),
  ];
}
