import { tk } from '../i18n';

/** "How to play": a short text reference, for players who've met everything in the levels. */
export interface HowToSection {
  readonly heading: string;
  readonly lines: readonly string[];
}

export const HOW_TO_PLAY: readonly HowToSection[] = [
  {
    heading: tk('Rolling'),
    lines: [
      tk(
        'You are a d8 on a board of triangles. Each triangle has three edges, so there are three ways to roll: left, right, and through the flat edge (down from a triangle pointing up, up from one pointing down).',
      ),
      tk(
        'Swipe, tap a neighbouring triangle, or use the arrow keys. The face on the edge you roll across is the one that acts; the badges around the die show which. Tap the die to see all eight faces.',
      ),
      tk('Rows are straight lines: arrows, leaps and swings go along the row.'),
    ],
  },
  {
    heading: tk('Faces'),
    lines: [
      tk('Bow: shoots along the row, over water, for 1 damage. You stay where you are.'),
      tk('Knife: 2 damage to an enemy next to you.'),
      tk('Herb: face-down on a spring, heals 1.'),
      tk('Leaf: does nothing. Just a leaf.'),
    ],
  },
  {
    heading: tk('Creatures'),
    lines: [
      tk('Wolf (2 HP): hunts you, and bites for 1 when it reaches you.'),
      tk('You have 3 HP. Some levels start you hurt.'),
    ],
  },
  {
    heading: tk('Stars'),
    lines: [
      tk(
        'Stars are about moves: ★★★ at par or fewer, ★★ a few moves over, ★ for finishing. HP never costs stars, and your best result is kept. Undo and Retry are free.',
      ),
    ],
  },
  {
    heading: tk('Daily Trail'),
    lines: [
      tk(
        'Three new floors every day, the same for everyone. Your HP carries over, with no healing between floors. Your first finish of the day counts for your streak.',
      ),
    ],
  },
];
