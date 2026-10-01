/** Lessons (a card on a level's first play) and what each face does. */
import { tk } from '../i18n';

export interface Lesson {
  readonly title: string;
  readonly text: string;
}

export const LESSONS: Readonly<Record<string, Lesson>> = {
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
