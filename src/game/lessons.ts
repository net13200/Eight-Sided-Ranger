/** Lessons (a card on a level's first play) and what each face does. */
import { tk } from '../i18n';

export interface Lesson {
  readonly title: string;
  readonly text: string;
}

export const LESSONS: Record<string, Lesson> = {
  '1-01': {
    title: tk('Three ways to roll'),
    text: tk(
      'You are a d8, rolling on triangles. Every triangle has three edges, so there are three ways to roll: left, right, and through the flat edge (down from a triangle that points up, up from one that points down). The badges show which face leads each way.',
    ),
  },
  '1-03': {
    title: tk('The Bow'),
    text: tk(
      'Rows are straight lines. Roll the Bow toward a wolf in your row and the arrow flies to it, over water, without you moving. A wolf takes two arrows.',
    ),
  },
  '1-06': {
    title: tk('The Knife'),
    text: tk(
      'Up close, the Knife ends a wolf in one stab. Wolves bite when they reach you, and you have 3 HP.',
    ),
  },
  '1-08': {
    title: tk('The Herb'),
    text: tk(
      'You took a bite at the border, and the hearts show it. Land with the Herb face-down on a spring to heal 1. Springs never run dry.',
    ),
  },
};

/** Lessons from Wolf Hollow on. */
Object.assign(LESSONS, {
  '2-01': {
    title: tk('The Trap'),
    text: tk(
      'Land with the Trap face-down on grass to lay a snare. A wolf that steps in is caught for 3 turns.',
    ),
  },
  '2-03': {
    title: tk('The Cloak'),
    text: tk('With the Cloak on top, nobody can see you: wolves stop hunting and lose your trail.'),
  },
  '2-05': {
    title: tk('Sleeping wolves'),
    text: tk(
      'Some wolves are asleep. Stop within two rolls of one and it wakes, and hunts you from the next turn. With the Cloak on top, you wake no one.',
    ),
  },
  '2-10': {
    title: tk('Gauntlet'),
    text: tk(
      'Three floors in a row, and your HP carries over: nothing heals between floors. Moves add up against one par for the whole run. Leave, and the gauntlet starts over.',
    ),
  },
} satisfies Record<string, Lesson>);

/** Lessons for the Braided River. */
Object.assign(LESSONS, {
  '3-01': {
    title: tk('The Boots'),
    text: tk(
      'Roll the Boots toward the next triangle in your row and you leap over it: water, a snare, even a wolf. You land two triangles along.',
    ),
  },
  '3-03': {
    title: tk('The Rope'),
    text: tk(
      'Roll the Rope toward a post along your row, two to five triangles away, and you swing to the triangle before it, over water. The die doesn’t roll on the way.',
    ),
  },
  '3-05': {
    title: tk('Currents'),
    text: tk(
      'Land on a current and it carries you along the row, the way the arrows point, until you reach the bank. Your faces stay as they are.',
    ),
  },
  '3-06': {
    title: tk('Lily pads'),
    text: tk('A lily pad holds you once. Step off, and it sinks behind you.'),
  },
} satisfies Record<string, Lesson>);

export const FACE_INFO: Readonly<Record<string, string>> = {
  Bow: tk('Shoots along the row: 1 damage, over water.'),
  Knife: tk('Stabs an enemy next to you: 2 damage.'),
  Trap: tk('Face-down: lays a snare. Wolves get caught for 3 turns.'),
  Rope: tk('Swings you along the row to a post.'),
  Cloak: tk('On top: nobody can see you.'),
  Boots: tk('Leap over the next triangle in the row.'),
  Herb: tk('Face-down on a spring: heal 1.'),
  Acorn: tk('Face-down on grass: plants a sapling. Step off and it grows into a tree.'),
  Horn: tk('Blows the first animal in the row one triangle back. It loses its turn.'),
  Leaf: tk('Just a leaf.'),
};

/** Lessons for Antler Meadow. */
Object.assign(LESSONS, {
  '4-01': {
    title: tk('Stags'),
    text: tk(
      'A stag never moves, but end your roll anywhere in its row with nothing between you and it strikes: 1 damage. Trees and water block its view along the row.',
    ),
  },
  '4-03': {
    title: tk('Ferns'),
    text: tk('Stand in a fern and nobody sees you: wolves lose your trail and stags hold still.'),
  },
  '4-05': {
    title: tk('The Horn'),
    text: tk(
      'Roll the Horn along your row toward an animal and, instead of rolling, you blow it: the first animal in the row is pushed one triangle further away and, startled, loses its turn. Into a snare is even better.',
    ),
  },
  '4-07': {
    title: tk('Boars'),
    text: tk(
      'A boar charges along its row when it sees you, stops right beside you and gores you. Get out of its row, or let a snare stop the charge.',
    ),
  },
} satisfies Record<string, Lesson>);

/** Lessons for the Hush. */
Object.assign(LESSONS, {
  '5-01': {
    title: tk('Owls'),
    text: tk(
      'An owl never moves or bites, but end your roll in its row with nothing between you, and it hoots: every sleeping wolf wakes. Its row is shaded pale.',
    ),
  },
  '5-03': {
    title: tk('Brambles'),
    text: tk(
      'You can roll into brambles, but the thorns cost 1 HP. Wolves and boars won’t go into them at all.',
    ),
  },
  '5-04': {
    title: tk('Boots in the thorns'),
    text: tk('Land in brambles with the Boots face-down and the thorns can’t hurt you.'),
  },
  '5-05': {
    title: tk('The Acorn'),
    text: tk(
      'Land with the Acorn face-down on grass and you plant a sapling. When you roll off, it grows into a tree: nothing gets past it, nothing sees through it.',
    ),
  },
} satisfies Record<string, Lesson>);
