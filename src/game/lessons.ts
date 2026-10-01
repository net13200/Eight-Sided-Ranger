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
  Leaf: tk('Just a leaf.'),
};
