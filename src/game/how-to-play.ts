import { tk } from '../i18n';

/**
 * "How to play": a short text reference. It grows with the districts a
 * player has reached, so it never spoils what's ahead.
 */
export interface HowToSection {
  readonly heading: string;
  readonly lines: readonly string[];
}

/** A line, and the district (1-based) where it is first met. */
type Line = readonly [district: number, text: string];

const SECTIONS: readonly { readonly heading: string; readonly lines: readonly Line[] }[] = [
  {
    heading: tk('Rolling'),
    lines: [
      [
        1,
        tk(
          'You are a d8 on a board of triangles. Each triangle has three edges, so there are three ways to roll: left, right, and through the flat edge (down from a triangle pointing up, up from one pointing down).',
        ),
      ],
      [
        1,
        tk(
          'Swipe, tap a neighbouring triangle, or use the arrow keys. The face on the edge you roll across is the one that acts; the badges around the die show which. Tap the die to see all eight faces.',
        ),
      ],
      [1, tk('Rows are straight lines: arrows, leaps and swings go along the row.')],
    ],
  },
  {
    heading: tk('Faces'),
    lines: [
      [1, tk('Bow: shoots along the row, over water, for 1 damage. You stay where you are.')],
      [1, tk('Knife: 2 damage to an enemy next to you.')],
      [1, tk('Herb: face-down on a spring, heals 1.')],
      [2, tk('Trap: face-down on grass, lays a snare that holds a wolf for 3 turns.')],
      [2, tk('Cloak: on top, nobody can see you.')],
      [3, tk('Boots: leap over the next triangle in the row.')],
      [3, tk('Rope: swing along the row to the triangle before a post.')],
      [4, tk('Horn: blows the first animal in the row one triangle back; it loses its turn.')],
      [5, tk('Acorn: face-down on grass, plants a sapling that becomes a tree when you roll off.')],
      [1, tk('Leaf: does nothing. Just a leaf.')],
    ],
  },
  {
    heading: tk('Creatures'),
    lines: [
      [1, tk('Wolf (2 HP): hunts you, and bites for 1 when it reaches you.')],
      [1, tk('The Old Bear: can’t be hurt. Every other turn he rears up, then swipes or lumbers.')],
      [2, tk('Sleeping wolves wake when you stop within two rolls of them.')],
      [4, tk('Stag (3 HP): never moves; strikes for 1 down a clear row.')],
      [4, tk('Boar (2 HP): charges along a clear row and gores for 1.')],
      [5, tk('Owl (1 HP): hoots when it sees you along its row, and every sleeping wolf wakes.')],
      [1, tk('You have 3 HP. Some levels start you hurt.')],
    ],
  },
  {
    heading: tk('Places'),
    lines: [
      [3, tk('Currents carry you along the row; lily pads sink once you step off.')],
      [4, tk('Ferns hide you, like the Cloak.')],
      [5, tk('Brambles cost 1 HP, unless the Boots are face-down. Wolves keep out.')],
    ],
  },
  {
    heading: tk('Stars'),
    lines: [
      [
        1,
        tk(
          'Stars are about moves: ★★★ at par or fewer, ★★ a few moves over, ★ for finishing. HP never costs stars, and your best result is kept. Undo and Retry are free.',
        ),
      ],
    ],
  },
  {
    heading: tk('Daily Trail'),
    lines: [
      [
        1,
        tk(
          'Three new floors every day, the same for everyone. Your HP carries over, with no healing between floors. Your first finish of the day counts for your streak.',
        ),
      ],
    ],
  },
];

/** The sections for a player who has reached `reached` districts (empty sections left out). */
export function howToPlay(reached: number): HowToSection[] {
  return SECTIONS.map((s) => ({
    heading: s.heading,
    lines: s.lines.filter(([d]) => d <= Math.max(1, reached)).map(([, text]) => text),
  })).filter((s) => s.lines.length);
}
