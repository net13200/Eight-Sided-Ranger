/**
 * The Ranger's die: a d8 (an octahedron) rolling on triangles. A shape is
 * data (slots, which slot leads each way, how each roll permutes the slots),
 * compiled once into an orientation table so the rules and the solver work
 * with small integers.
 */
export type Dir = 'N' | 'E' | 'S' | 'W';
export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];
const DIR_INDEX: Readonly<Record<Dir, number>> = { N: 0, E: 1, S: 2, W: 3 };

/** Slots: top, bottom, the three lower faces at the cell's edges, and the three upper faces. */
const T = 0,
  B = 1,
  L = 2,
  R = 3,
  V = 4,
  OL = 5,
  OR = 6,
  OV = 7;

export const SLOT = { top: T, bottom: B, left: L, right: R, flat: V } as const;

/** `table[newSlot] = oldSlot`. */
function table(assign: Readonly<Record<number, number>>): number[] {
  return Array.from({ length: 8 }, (_, slot) => assign[slot]!);
}

/**
 * The octahedron. The lower faces (neighbours of the bottom) sit at the
 * cell's left, right and flat edges and are the ones that lead a roll; each
 * upper face `oX` is the one opposite lower face X. Rolling across an edge
 * tips that edge's face down; the upper face at each end of the edge becomes
 * the new face on the edge that shares that corner.
 */
export const D8 = {
  slots: [
    'top',
    'bottom',
    'left',
    'right',
    'flat',
    'upperLeft',
    'upperRight',
    'upperFlat',
  ] as readonly string[],
  leading: { W: L, E: R, N: V, S: V } as Readonly<Record<Dir, number>>,
  roll: {
    W: table({ [B]: L, [R]: B, [L]: OR, [V]: OV, [T]: OL, [OL]: R, [OR]: T, [OV]: V }),
    E: table({ [B]: R, [L]: B, [R]: OL, [V]: OV, [T]: OR, [OR]: L, [OL]: T, [OV]: V }),
    N: table({ [B]: V, [V]: B, [L]: OR, [R]: OL, [T]: OV, [OL]: R, [OR]: L, [OV]: T }),
    S: table({ [B]: V, [V]: B, [L]: OR, [R]: OL, [T]: OV, [OL]: R, [OR]: L, [OV]: T }),
  } as Readonly<Record<Dir, readonly number[]>>,
} as const;

/** All orientations reachable from the identity (slot → home slot), and the roll table. */
function compile(): { perms: number[][]; next: Int16Array } {
  const identity = D8.slots.map((_, i) => i);
  const perms: number[][] = [identity];
  const index = new Map([[identity.join(','), 0]]);
  const edges: number[] = [];
  for (let i = 0; i < perms.length; i++) {
    for (const dir of DIRS) {
      const q = D8.roll[dir].map((old) => perms[i]![old]!);
      const key = q.join(',');
      let j = index.get(key);
      if (j === undefined) {
        j = perms.length;
        perms.push(q);
        index.set(key, j);
      }
      edges[i * 4 + DIR_INDEX[dir]] = j;
    }
  }
  return { perms, next: Int16Array.from(edges) };
}

export const ORIENTATIONS = compile();

export function roll(orient: number, dir: Dir): number {
  return ORIENTATIONS.next[orient * 4 + DIR_INDEX[dir]]!;
}

/** The face in a slot for this orientation. */
export function faceAt(loadout: readonly string[], orient: number, slot: number): string {
  return loadout[ORIENTATIONS.perms[orient]![slot]!]!;
}

/** The face that acts when rolling `dir`: the one on that edge. */
export function leading(loadout: readonly string[], orient: number, dir: Dir): string {
  return faceAt(loadout, orient, D8.leading[dir]);
}
