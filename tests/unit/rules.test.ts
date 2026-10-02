/** The d8 on a triangle grid, and the rules. */
import { describe, expect, it } from 'vitest';
import {
  D8,
  ORIENTATIONS,
  adjacent,
  faceAt,
  isUp,
  movesFrom,
  neighbor,
  parseLevel,
  roll,
  startState,
  step,
  type Dir,
  type State,
} from '../../src/engine';

/** Each home slot's face as a sign vector: a real octahedron (faces = the 8 octants). */
const HOME: Record<string, readonly [number, number, number]> = {
  bottom: [-1, -1, -1],
  left: [1, -1, -1],
  right: [-1, 1, -1],
  flat: [-1, -1, 1],
  top: [1, 1, 1],
  upperLeft: [-1, 1, 1],
  upperRight: [1, -1, 1],
  upperFlat: [1, 1, -1],
};
const LOADOUT = D8.slots.map((s) => s);
const vec = (orient: number, slot: string) =>
  HOME[faceAt(LOADOUT, orient, D8.slots.indexOf(slot))]!;
const sub = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v - b[i]!);
const det = (a: number[], b: number[], c: number[]) =>
  a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) -
  a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) +
  a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!);
const differ = (a: readonly number[], b: readonly number[]) =>
  a.filter((v, i) => v !== b[i]).length;

describe('the d8', () => {
  it('has the 24 orientations of an octahedron', () => {
    expect(ORIENTATIONS.perms).toHaveLength(24);
  });

  it('rolls like a real octahedron on triangles (random walks keep the geometry)', () => {
    let x = 4;
    let y = 2;
    let o = 0;
    let seed = 7;
    for (let i = 0; i < 500; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const moves = movesFrom(x, y);
      const d = moves[seed % 3]!;
      const n = neighbor(x, y, d)!;
      o = roll(o, d);
      x = n.x;
      y = n.y;
      const b = vec(o, 'bottom');
      // Lower faces share an edge with the bottom; the top is its opposite.
      for (const s of ['left', 'right', 'flat']) expect(differ(vec(o, s), b)).toBe(1);
      expect(differ(vec(o, 'top'), b)).toBe(3);
      for (const s of ['left', 'right', 'flat'])
        expect(differ(vec(o, `upper${s[0]!.toUpperCase()}${s.slice(1)}`), vec(o, s))).toBe(3);
      // Handedness follows the triangle: never a mirror image.
      const h = det(sub(vec(o, 'left'), b), sub(vec(o, 'right'), b), sub(vec(o, 'flat'), b));
      expect(Math.sign(h)).toBe(isUp(x, y) ? 1 : -1);
    }
  });

  it('rolling back undoes a roll', () => {
    for (let o = 0; o < 24; o++) {
      expect(roll(roll(o, 'W'), 'E')).toBe(o);
      expect(roll(roll(o, 'S'), 'N')).toBe(o);
    }
  });
});

describe('the triangle grid', () => {
  it('three moves per cell; vertical neighbours share the flat edge', () => {
    expect(movesFrom(0, 0)).toEqual(['W', 'E', 'S']);
    expect(movesFrom(1, 0)).toEqual(['W', 'E', 'N']);
    expect(neighbor(0, 0, 'N')).toBeNull();
    expect(neighbor(0, 1, 'S')).toBeNull();
    expect(adjacent(0, 0, 0, 1)).toBe(true);
    expect(adjacent(1, 0, 1, 1)).toBe(false);
    expect(adjacent(3, 2, 4, 2)).toBe(true);
  });
});

const LV = (grid: string, faces = 'Bow Knife Trap Rope Cloak Boots Herb Leaf') =>
  startState(parseLevel(`id: t\nname: T\nloadout: ${faces}\n---\n${grid}`));
const play = (s: State, dirs: string) => {
  for (const d of dirs) {
    const r = step(s, d as Dir);
    expect(r.consumed).toBe(true);
    s = r.state;
  }
  return s;
};
/** A loadout with `face` leading east from the start (the right slot). */
const facing = (face: string) => {
  const f = ['Leaf', 'Leaf', 'Leaf', face, 'Leaf', 'Leaf', 'Leaf', 'Leaf'];
  return f.join(' ');
};

describe('rules', () => {
  it('rolls to the exit', () => {
    const s = play(LV('@.>'), 'EE');
    expect(s.status).toBe('won');
    expect(s.moves).toBe(2);
  });

  it('a level can start the Ranger hurt; Herb on a spring heals', () => {
    const lv = parseLevel(
      'id: t\nname: T\nhp: 1\nloadout: Leaf Leaf Leaf Herb Leaf Leaf Leaf Leaf\n---\n@+.',
    );
    let s = startState(lv);
    expect(s.hp).toBe(1);
    s = play(s, 'E'); // Herb (right slot) lands face-down on the spring
    expect(s.hp).toBe(2);
    expect(() =>
      parseLevel('id: t\nname: T\nhp: 4\nloadout: ' + 'Leaf '.repeat(8) + '\n---\n@.'),
    ).toThrow();
  });

  it('a sleeping wolf lies still until the Ranger comes within two rolls, then hunts', () => {
    let s = LV('@.....z.');
    s = play(s, 'E'); // 5 rolls away: still asleep
    expect(s.enemies[0]).toMatchObject({ x: 6, asleep: true });
    s = play(s, 'EEE'); // now 2 rolls away: it wakes (and doesn't move yet)
    expect(s.enemies[0]).toMatchObject({ x: 6, asleep: false });
    s = play(s, 'W'); // awake: it hunts
    expect(s.enemies[0]!.x).toBe(5);
  });

  it('the Cloak lets you slip past a sleeping wolf; an arrow wakes it', () => {
    // The Cloak is the upper-left face: rolling W puts it on top, two rolls from the wolf.
    const s = play(LV('..@z...', 'Leaf Leaf Leaf Leaf Leaf Cloak Leaf Leaf'), 'W');
    expect(faceAt(s.level.loadout, s.orient, 0)).toBe('Cloak');
    expect(s.enemies[0]).toMatchObject({ x: 3, asleep: true });
    const shot = play(LV('@...z', facing('Bow')), 'E');
    expect(shot.enemies[0]).toMatchObject({ hp: 1, asleep: false });
  });

  it('a current carries the die along the row, faces unchanged, until it is off the current', () => {
    const s = play(LV('@}}}..>'), 'E');
    expect(s).toMatchObject({ x: 4 });
    expect(s.orient).toBe(roll(0, 'E'));
  });

  it('a current stops at a tree; two currents facing each other just hold the die', () => {
    expect(play(LV('@}}#..'), 'E').x).toBe(2);
    expect(play(LV('@}{...'), 'E').x).toBeLessThanOrEqual(2);
  });

  it('a lily pad holds once, then sinks; wolves keep off pads and currents', () => {
    let s = play(LV('@o.....'), 'E');
    expect(s.tiles[1]).toBe('pad');
    s = play(s, 'E');
    expect(s.tiles[1]).toBe('water');
    const w = play(LV('@..o.w'), 'E');
    expect(w.enemies[0]!.x).toBe(5); // the pad is in its way: it waits
  });

  it('standing in a fern hides you: the wolf loses your trail, the stag holds still', () => {
    const s = play(LV('@f...w'), 'E');
    expect(s.enemies[0]!.x).toBe(5);
    const st = play(LV('@f...s'), 'E');
    expect(st.hp).toBe(3);
  });

  it('the Horn pushes the first animal in the row one triangle away, into a snare too', () => {
    const s = play(LV('@..w..', facing('Horn')), 'E');
    expect(s.x).toBe(0); // the die stays
    expect(s.enemies[0]!.x).toBe(4);
    const snared = play(LV('@..wx.', facing('Horn')), 'E');
    expect(snared.enemies[0]).toMatchObject({ x: 4, snared: 3 });
  });

  it('a Horn with nothing to push (or a tree behind the animal) just rolls', () => {
    expect(play(LV('@.....', facing('Horn')), 'E').x).toBe(1);
    expect(play(LV('@..w#.', facing('Horn')), 'E').x).toBe(1);
  });

  it('a boar charges along the row to you and hits; water stops it', () => {
    const s = play(LV('..@.....b'), 'W');
    expect(s.enemies[0]!.x).toBe(2);
    expect(s.hp).toBe(2);
    const wet = play(LV('..@...~.b'), 'W');
    expect(wet.enemies[0]!.x).toBe(7);
    expect(wet.hp).toBe(3);
  });

  it('a boar that charges into a snare is caught short', () => {
    const s = play(LV('.@.x....b'.replace('.@', '@.')), 'E');
    expect(s.enemies[0]).toMatchObject({ x: 3, snared: 3 });
    expect(s.hp).toBe(3);
  });

  it('an owl that sees you along its row hoots, and sleeping wolves wake', () => {
    const blank = 'Leaf Leaf Leaf Leaf Leaf Leaf Leaf Leaf';
    // Out of the owl's row: nothing.
    expect(play(LV('...h\n.@...\n....z', blank), 'E').enemies[1]!.asleep).toBe(true);
    const r = step(LV('h.@...\n.....z', blank), 'E');
    expect(r.events.map((e) => e.type)).toContain('hooted');
    const wolf = r.state.enemies[1]!;
    expect(wolf).toMatchObject({ asleep: false, x: 5, y: 1 }); // awake, not moved yet
    // A tree between, or a fern to stand in: the owl can't see.
    expect(play(LV('h#@...\n.....z', blank), 'E').enemies[1]!.asleep).toBe(true);
    expect(play(LV('h.@f..\n.....z', blank), 'E').enemies[1]!.asleep).toBe(true);
  });

  it('brambles prick (1 HP) unless the Boots are face-down; wolves keep out of them', () => {
    const blank = 'Leaf Leaf Leaf Leaf Leaf Leaf Leaf Leaf';
    expect(play(LV('@%.', blank), 'E').hp).toBe(2);
    // Boots in the flat slot land face-down rolling S (no leap across a flat edge).
    expect(play(LV('@.\n%.', 'Leaf Leaf Leaf Leaf Boots Leaf Leaf Leaf'), 'S').hp).toBe(3);
    // The wolf can't reach the Ranger except through the thorns: it stays put.
    const s = play(LV('w%@.', blank), 'E');
    expect(s.enemies[0]!.x).toBe(0);
    expect(s.hp).toBe(3);
    const hurt = startState(parseLevel(`id: t\nname: T\nhp: 1\nloadout: ${blank}\n---\n@%.`));
    expect(play(hurt, 'E').status).toBe('lost');
  });

  it('the Acorn face-down plants a sapling that grows into a tree when you leave', () => {
    let s = play(LV('@....', facing('Acorn')), 'E');
    expect(s.tiles[1]).toBe('sapling');
    s = play(s, 'E');
    expect(s.tiles[1]).toBe('tree');
    expect(step(s, 'W').consumed).toBe(false); // can't roll back into the tree
  });

  it('the Old Bear rests, rears up, then swipes or lumbers: every other turn', () => {
    const blank = 'Leaf Leaf Leaf Leaf Leaf Leaf Leaf Leaf';
    let s = LV('@.....B', blank);
    s = play(s, 'E'); // it rears up: the tell
    expect(s.enemies[0]).toMatchObject({ x: 6, ready: true });
    s = play(s, 'E'); // now it lumbers one step
    expect(s.enemies[0]).toMatchObject({ x: 5, ready: false });
    s = play(s, 'E');
    expect(s.enemies[0]!.x).toBe(5); // resting
    s = play(s, 'E'); // adjacent and ready: a swipe
    expect(s.hp).toBe(2);
    expect(s.enemies[0]!.x).toBe(5);
  });

  it('nothing hurts the Old Bear; a snare still holds it', () => {
    const r = step(LV('@B....', facing('Knife')), 'E');
    expect(r.events.map((e) => e.type)).toContain('shrugged');
    expect(r.state.enemies[0]!.hp).toBe(4);
    const shot = step(LV('@...B.', facing('Bow')), 'E');
    expect(shot.state.enemies[0]!.hp).toBe(4);
    let s = play(LV('..@x.B', 'Leaf Leaf Leaf Leaf Leaf Leaf Leaf Leaf'), 'W'); // rears
    s = play(s, 'E'); // lumbers one step
    expect(s.enemies[0]).toMatchObject({ x: 4, snared: 0 });
    s = play(s, 'WE'); // rests, then lumbers on, into the snare
    expect(s.enemies[0]).toMatchObject({ x: 3, snared: 3 });
  });

  it('the Great Oak is reached with the Leaf face-down, not otherwise', () => {
    const leafDown = 'Bow Knife Trap Leaf Cloak Boots Herb Bow';
    expect(play(LV('@O', leafDown), 'E').status).toBe('won');
    const s = play(LV('@O', facing('Knife')), 'E');
    expect(s.status).toBe('playing');
    expect(s.x).toBe(1);
  });

  it('the Bow shoots along the row, over water; a wolf takes two arrows', () => {
    let s = LV('@.~~.w.#', facing('Bow'));
    s = play(s, 'E');
    expect(s.x).toBe(0); // shot, didn't move
    expect(s.enemies[0]).toMatchObject({ hp: 1 });
  });

  it('the Knife kills a wolf in one stab', () => {
    const s = play(LV('@w.', facing('Knife')), 'E');
    expect(s.enemies).toHaveLength(0);
  });

  it('Boots leap over water', () => {
    const s = play(LV('@~.>', facing('Boots')), 'E');
    expect(s.x).toBe(2);
  });

  it('the Rope swings to a post across water without rolling', () => {
    const s = play(LV('@~~.P', facing('Rope')), 'E');
    expect(s).toMatchObject({ x: 3, orient: 0 });
  });

  it('a wolf steps into a snare and is caught', () => {
    // Trap is the right face: roll E and it lands face-down, laying a snare.
    let s = LV('..@...w', facing('Trap'));
    s = play(s, 'E');
    expect(s.tiles[3]).toBe('snare');
    s = play(s, 'WW'); // back off; the wolf follows onto the snare
    expect(s.enemies[0]).toMatchObject({ x: 3, snared: 3 });
    expect(s.tiles[3]).toBe('grass');
  });

  it('with the Cloak on top, wolves lose you', () => {
    // Cloak in the left slot: rolling W twice... find a roll that puts it on top.
    const lv = LV('..@....w', 'Leaf Leaf Leaf Leaf Leaf Cloak Leaf Leaf');
    // upperLeft becomes the top after rolling W (see D8).
    const s = play(lv, 'W');
    expect(faceAt(s.level.loadout, s.orient, 0)).toBe('Cloak');
    expect(s.enemies[0]!.x).toBe(7);
  });
});
