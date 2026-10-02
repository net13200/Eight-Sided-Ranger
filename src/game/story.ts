/**
 * The Last Leaf. The Ranger kept the Queen's woods at the edge of Oddmere;
 * the wish only half caught them. Past the fence, the Greenwood has stopped
 * deciding too: a year of autumn, and the leaves won't fall. At its heart
 * the Great Oak holds on to its last leaves, and the Ranger carries a leaf
 * of their own. Shown as short illustrated pages: the intro before level 1,
 * a card as each district begins, the Old Bear's card before each
 * district's last level, and the ending after the Great Oak.
 */
import { DISTRICT_NAMES } from '../meta/progress';
import { DISTRICT_SIZE } from './world/layout';
import { t, tk } from '../i18n';

export type StoryArt =
  | 'edge'
  | 'wish'
  | 'autumn'
  | 'oak'
  | 'district'
  | 'bear'
  | 'heart'
  | 'letgo'
  | 'leaves'
  | 'sleep'
  | 'snow'
  | 'knight';

export interface StoryPage {
  readonly art: StoryArt;
  readonly title?: string;
  readonly text: string;
  /** For district (and Old Bear) cards: which district (0-based). */
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

/**
 * The Old Bear can't get to his winter sleep, and blames the Ranger. He turns
 * up at the end of every district: one line each, before its last level.
 */
export const BEAR_LINES: readonly string[] = [
  tk(
    'Something big is crashing through the bracken. The Old Bear. He should be asleep by now, and he thinks it’s your fault.',
  ),
  tk(
    'The Bear again. ‘Every autumn the leaves fall, and I sleep,’ he growls. ‘Then you roll in, and nothing falls.’',
  ),
  tk('He followed you across the river. Bears can swim. Bears can also hold a grudge.'),
  tk('Even the stags step aside for him. Even the stags are tired.'),
  tk('At night he is quieter, and worse. He sits where you’ll pass, and waits.'),
  tk('He is under the Great Oak. He isn’t angry any more. Just very, very tired.'),
];

/** After the Great Oak: the leaf falls, and winter comes. Then the Knight, across the fence. */
export const ENDING: readonly StoryPage[] = [
  {
    art: 'heart',
    title: tk('The Great Oak'),
    text: tk(
      'There is no villain under the Great Oak. Just a tree that isn’t ready for winter, and a bear who can’t sleep until it is.',
    ),
  },
  {
    art: 'oak',
    text: tk(
      'The Ranger knows the feeling. On one of their faces is a leaf from this Oak, kept since the last good autumn.',
    ),
  },
  {
    art: 'letgo',
    text: tk(
      'You can’t make a tree let go. But you can go first. The Ranger rolls, and lets the leaf fall.',
    ),
  },
  {
    art: 'leaves',
    text: tk('The Oak lets go too. All across the Greenwood, the leaves come down.'),
  },
  {
    art: 'sleep',
    text: tk('The Bear yawns. ‘It wasn’t you,’ he says. ‘It was never you.’ Then he sleeps.'),
  },
  { art: 'snow', text: tk('Snow. Then spring. On purpose.') },
  {
    art: 'knight',
    text: tk(
      'Across the fence, a six-sided Knight is watching the snow. The Ranger waves. The Knight rolls over, which is how Knights wave.',
    ),
  },
];

export const STORY_KEYS = {
  intro: 'story:intro',
  district: (d: number) => `story:d${d + 1}`,
  bear: (d: number) => `story:bear${d + 1}`,
  ending: 'story:ending',
} as const;

export function bearPage(d: number): StoryPage {
  return { art: 'bear', district: d, title: t('The Old Bear'), text: BEAR_LINES[d] ?? '' };
}

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
 * district's card) before a first level 1, a district's card before its
 * first level, or the Old Bear's card before its last. Players who already
 * beat that level see nothing.
 */
export function storyBeforeLevel(
  index: number,
  seen: (key: string) => boolean,
  completed: boolean,
): { pages: StoryPage[]; keys: string[] } {
  const pages: StoryPage[] = [];
  const keys: string[] = [];
  const d = Math.floor(index / DISTRICT_SIZE);
  if (completed) return { pages, keys };
  if (index % DISTRICT_SIZE === DISTRICT_SIZE - 1 && !seen(STORY_KEYS.bear(d))) {
    pages.push(bearPage(d));
    keys.push(STORY_KEYS.bear(d));
  }
  if (index % DISTRICT_SIZE !== 0) return { pages, keys };
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

/**
 * The story so far, for "Story" on the title screen: the intro, the districts
 * reached (with the Old Bear's cards already met), and the ending once seen.
 */
export function storySoFar(
  districtsReached: number,
  seen: (key: string) => boolean = () => false,
): StoryPage[] {
  return [
    ...INTRO,
    ...Array.from({ length: Math.max(1, districtsReached) }, (_, d) => [
      districtPage(d),
      ...(seen(STORY_KEYS.bear(d)) ? [bearPage(d)] : []),
    ]).flat(),
    ...(seen(STORY_KEYS.ending) ? ENDING : []),
  ];
}
