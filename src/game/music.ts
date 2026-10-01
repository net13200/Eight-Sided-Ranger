/**
 * Background music, synthesized with WebAudio (no audio files). The tunes are
 * Six Sided Knight's, in a forest arrangement with an Elvish touch: a flute
 * with grace-note ornaments and a slow, wide vibrato instead of the
 * recorder, a ringing harp instead of the lute, a wordless choir ("ah")
 * instead of the plain pad, soft celesta chimes, no marching drum, a slower tempo
 * and a long echo, like a hall of trees.
 *
 * Tracks:
 * - glade:  title screen, map, story. The Knight's "Hall of the Die" in
 *           D dorian, 6/8, on flute over harp arpeggios and the choir.
 * - stones: levels and the Daily Trail. The Knight's "Quiet Stones" in
 *           A minor: slow harp, chimes, a warm pad, and now and then the
 *           title tune's shape on the flute.
 */

export type Voice = 'harp' | 'flute' | 'choir' | 'pad' | 'bass' | 'chime' | 'drum';

/** [start in steps, MIDI note (0 for drums), length in steps, volume 0..1] */
export type Note = readonly [number, number, number, number?];

export interface Part {
  readonly voice: Voice;
  readonly gain: number;
  readonly notes: readonly Note[];
  /**
   * Which passes of the arrangement cycle this part plays on (default: all).
   * Parts dropping in and out make each pass a little different, so the
   * music never sounds like it ends and starts again.
   */
  readonly passes?: readonly number[];
}

export interface Track {
  readonly name: string;
  /** Seconds per step. */
  readonly step: number;
  /** Loop length in steps. */
  readonly length: number;
  /** Passes before the arrangement repeats exactly. */
  readonly cycle: number;
  readonly parts: readonly Part[];
  /**
   * Semitones to lift each pass of the cycle by (default: none). The title
   * tune alternates between two keys: it rises a whole step, falls back, rises again.
   */
  readonly lift?: readonly number[];
  /** The chords, for the harmony test: steps per bar, and each bar's root and third (semitones). */
  readonly harmony: {
    readonly bar: number;
    readonly roots: readonly number[];
    readonly thirds: readonly number[];
  };
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// ---------- composition helpers ----------

function shift(notes: readonly Note[], by: number, transpose = 0, vol = 1): Note[] {
  return notes.map(([s, m, l, v = 1]) => [s + by, m === 0 ? 0 : m + transpose, l, v * vol]);
}

/**
 * Elvish ornaments: before each long note, a quick grace note from the scale
 * step above (a "cut", as on a whistle). `scale` lists the mode's pitch
 * classes; notes shorter than `minLen` steps are left plain.
 */
export function ornament(notes: readonly Note[], scale: readonly number[], minLen = 3): Note[] {
  const out: Note[] = [];
  for (const n of notes) {
    const [s, m, l, v = 1] = n;
    if (l >= minLen && m > 0 && s >= 0.25) {
      let up = m + 1;
      while (!scale.includes(up % 12)) up++;
      out.push([s - 0.25, up, 0.25, v * 0.55]);
    }
    out.push(n);
  }
  return out;
}

/** D dorian and A minor (natural), as pitch classes. */
const D_DORIAN = [2, 4, 5, 7, 9, 11, 0];
const A_MINOR = [9, 11, 0, 2, 4, 5, 7];

/**
 * The Ranger's signature: a falling leaf. Eight quick harp notes (one per
 * side of the d8) tumble down from `top`, two to a step, starting at
 * `start`. `notes` are the pitches, high to low, all gentle on the chord.
 */
export function fallingLeaf(start: number, notes: readonly number[]): Note[] {
  return notes.map((m, i) => [start + i * 0.5, m, 2, 1 - i * 0.06] as Note);
}

/** Over D minor (the glade's last bar): D C A G F D C A. */
const LEAF_D = [86, 84, 81, 79, 77, 74, 72, 69];
/** Over A minor (the stones' last bar): E D C A G E D C. */
const LEAF_A = [88, 86, 84, 81, 79, 76, 74, 72];

// ---------- "Glade" (title): the Knight's "Hall of the Die" ----------

const HALL_MELODY: Note[] = [
  // Dm
  [0, 69, 2],
  [2, 74, 1],
  [3, 76, 2],
  [5, 77, 1],
  // C
  [6, 79, 3],
  [9, 76, 2],
  [11, 72, 1],
  // Dm
  [12, 74, 2],
  [14, 76, 1],
  [15, 77, 1],
  [16, 76, 1],
  [17, 74, 1],
  // Am
  [18, 76, 6],
  // F
  [24, 81, 2],
  [26, 79, 1],
  [27, 77, 2],
  [29, 76, 1],
  // C
  [30, 79, 2],
  [32, 77, 1],
  [33, 76, 3],
  // G (the B natural gives it the dorian, old-tune colour)
  [36, 74, 2],
  [38, 76, 1],
  [39, 71, 2],
  [41, 74, 1],
  // Dm
  [42, 74, 6],
];
// Answer phrase for the second half: same shape, climbing higher.
const HALL_ANSWER: Note[] = [
  [0, 81, 2],
  [2, 79, 1],
  [3, 77, 2],
  [5, 76, 1],
  [6, 79, 3],
  [9, 77, 2],
  [11, 76, 1],
  [12, 74, 2],
  [14, 77, 1],
  [15, 81, 3],
  [18, 79, 4],
  [22, 77, 1],
  [23, 76, 1],
  [24, 77, 2],
  [26, 76, 1],
  [27, 74, 2],
  [29, 72, 1],
  [30, 74, 2],
  [32, 76, 1],
  [33, 79, 3],
  [36, 77, 2],
  [38, 76, 1],
  [39, 73, 2],
  [41, 76, 1],
  [42, 74, 6],
];
const HALL_ROOTS = [50, 48, 50, 45, 41, 48, 43, 50]; // D C D A F C G D (octave 3)
const HALL_MINOR = new Set([0, 2, 3]);
/** Harp arpeggios over each bar's chord, rising then falling. */
const gladeHarp = (roots: readonly number[]) =>
  roots.flatMap((root, bar) => {
    const third = HALL_MINOR.has(bar) || bar === 7 ? 3 : 4;
    const pat = [0, 7, 12, third + 12, 19, 12];
    return pat.map((o, i) => [bar * 6 + i, root + o, 3, i === 0 ? 1 : 0.65] as Note);
  });
const TUNE = [...ornament(HALL_MELODY, D_DORIAN), ...shift(ornament(HALL_ANSWER, D_DORIAN), 48)];

export const GLADE: Track = {
  name: 'Glade',
  harmony: {
    bar: 6,
    roots: HALL_ROOTS,
    thirds: HALL_ROOTS.map((_, b) => (HALL_MINOR.has(b) || b === 7 ? 3 : 4)),
  },
  step: 0.24,
  length: 96,
  // Pass 1 doubles the tune on chimes; pass 2 is harp and choir alone; pass 3
  // brings the tune back an octave lower, softer. Every other pass is lifted a
  // whole step (D, E, D, E): the tune rises, falls back, and rises again.
  cycle: 4,
  lift: [0, 2, 0, 2],
  parts: [
    // A leaf falls as each half of the tune comes to rest.
    { voice: 'harp', gain: 0.2, notes: [...fallingLeaf(43, LEAF_D), ...fallingLeaf(91, LEAF_D)] },
    { voice: 'flute', gain: 0.42, notes: TUNE, passes: [0, 1] },
    { voice: 'flute', gain: 0.3, notes: shift(TUNE, 0, -12), passes: [3] },
    {
      voice: 'chime',
      gain: 0.1,
      notes: [...shift(HALL_MELODY, 0, 12), ...shift(HALL_ANSWER, 48, 12)].filter(
        ([, , l]) => l >= 2,
      ),
      passes: [1],
    },
    {
      voice: 'harp',
      gain: 0.24,
      notes: [...gladeHarp(HALL_ROOTS), ...shift(gladeHarp(HALL_ROOTS), 48)],
    },
    {
      voice: 'choir',
      gain: 0.12,
      notes: [...HALL_ROOTS, ...HALL_ROOTS].flatMap((r, bar) => {
        const third = HALL_MINOR.has(bar % 8) || bar % 8 === 7 ? 3 : 4;
        return [[bar * 6, r + 12, 6] as Note, [bar * 6, r + 12 + third, 6, 0.6] as Note];
      }),
    },
    {
      voice: 'bass',
      gain: 0.32,
      notes: [...HALL_ROOTS, ...HALL_ROOTS].map((r, bar) => [bar * 6, r - 12, 6] as Note),
    },
    {
      // A soft frame drum, like a heartbeat in the trees, only now and then.
      voice: 'drum',
      passes: [1, 3],
      gain: 0.18,
      notes: Array.from({ length: 16 }, (_, bar) => [bar * 6, 0, 1, bar % 2 ? 0.6 : 1] as Note),
    },
  ],
};

// ---------- "Stones" (levels): the Knight's "Quiet Stones" ----------

const PUZZLE_ROOTS = [57, 53, 48, 55, 57, 50, 52, 57]; // Am F C G Am Dm E Am
const PUZZLE_QUALITY = [3, 4, 4, 4, 3, 3, 4, 3]; // minor/major third per bar
const stonesHarp = PUZZLE_ROOTS.flatMap((root, bar) => {
  const t = PUZZLE_QUALITY[bar]!;
  return [0, 7, 12, t + 12, 19, t + 12, 12, 7].map(
    (o, i) => [bar * 8 + i, root - 12 + o, 3, i === 0 ? 0.9 : 0.6] as Note,
  );
});
const PUZZLE_BELLS: Note[] = [
  [0, 76, 4],
  [6, 72, 2],
  [8, 69, 8],
  [16, 67, 3],
  [20, 76, 4],
  [24, 74, 8],
  [32, 72, 3],
  [36, 76, 4],
  [40, 77, 5],
  [46, 74, 2],
  [48, 71, 3],
  [52, 68, 4],
  [56, 69, 8],
];

/**
 * The title tune's rising shape, as a far-off flute in the second half. Every
 * long note sits on its bar's chord (F, C, Dm, E, Am), ending on G sharp to A.
 */
const STONES_FLUTE: Note[] = ornament(
  [
    [72, 69, 2],
    [74, 72, 1],
    [75, 77, 3],
    [80, 76, 2],
    [82, 72, 6],
    [104, 77, 2],
    [106, 76, 1],
    [107, 74, 3],
    [112, 71, 4],
    [116, 68, 3],
    [120, 69, 7],
  ],
  [...A_MINOR, 8],
);

export const STONES: Track = {
  name: 'Stones',
  harmony: { bar: 8, roots: PUZZLE_ROOTS, thirds: PUZZLE_QUALITY },
  step: 0.42,
  length: 128,
  // Pass 0: harp, chimes, pad. Pass 1: harp, pad and the far-off flute.
  // Pass 2: harp and chimes.
  cycle: 3,
  parts: [
    // A leaf falls at the end of each half.
    {
      voice: 'harp',
      gain: 0.22,
      notes: [...fallingLeaf(59, LEAF_A), ...fallingLeaf(123, LEAF_A)],
    },
    { voice: 'harp', gain: 0.44, notes: [...stonesHarp, ...shift(stonesHarp, 64)] },
    {
      voice: 'chime',
      gain: 0.25,
      notes: [...shift(PUZZLE_BELLS, 0, 0, 0.6), ...shift(PUZZLE_BELLS, 64, 0, 0.8)],
      passes: [0, 2],
    },
    {
      // A warm pad under the harp: each bar's full chord (the choir sounded
      // ghostly here, humming bare roots in A minor).
      voice: 'pad',
      gain: 0.1,
      notes: [...PUZZLE_ROOTS, ...PUZZLE_ROOTS].flatMap((r, bar) => [
        [bar * 8, r - 12, 8] as Note,
        [bar * 8, r - 12 + PUZZLE_QUALITY[bar % 8]!, 8, 0.7] as Note,
        [bar * 8, r - 5, 8, 0.6] as Note,
      ]),
      passes: [0, 1],
    },
    { voice: 'flute', gain: 0.32, notes: STONES_FLUTE, passes: [1] },
  ],
};

export const TRACKS = { glade: GLADE, stones: STONES } as const;
export type TrackId = keyof typeof TRACKS;

// ---------- instruments ----------

/**
 * The chime's overtones: [multiple of the note's pitch, loudness, decay in
 * seconds]. Whole-number multiples only, so every overtone is in tune (the
 * first version used 2.4 and 4.1, like metal chimes, and sounded sour).
 */
export const CHIME_PARTIALS: readonly (readonly [number, number, number])[] = [
  [1, 1, 2.2],
  [2, 0.22, 1],
  [3, 0.06, 0.45],
];

/** Schedules one note. Works with live and offline audio contexts. */
export function playVoice(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  voice: Voice,
  midi: number,
  t: number,
  dur: number,
  vol: number,
): void {
  const env = (g: GainNode, attack: number, peak: number, release: number, hold = 0) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    if (hold > 0) g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return t + attack + hold + release + 0.05;
  };
  const osc = (type: OscillatorType, f: number, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    return o;
  };
  const f = hz(midi);
  switch (voice) {
    case 'harp': {
      // A Celtic harp: a bright pluck that darkens and rings on.
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3000, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 0.6);
      const a = osc('triangle', f);
      const b = osc('sine', f * 2, 3);
      const bg = ctx.createGain();
      bg.gain.value = 0.18;
      const end = env(g, 0.003, vol, 2.2);
      a.connect(lp);
      b.connect(bg).connect(lp);
      lp.connect(g).connect(out);
      for (const o of [a, b]) {
        o.start(t);
        o.stop(end);
      }
      break;
    }
    case 'flute': {
      // A breathy wooden flute: a slow, wide vibrato that blooms in, and air.
      const g = ctx.createGain();
      const a = osc('sine', f);
      const b = osc('sine', f * 2);
      const bg = ctx.createGain();
      bg.gain.value = 0.08;
      const lfo = osc('sine', 4.4);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * 0.009, t + Math.min(0.5, dur));
      lfo.connect(lg).connect(a.frequency);
      const breath = ctx.createBufferSource();
      breath.buffer = noise;
      breath.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f * 1.5;
      bp.Q.value = 2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vol * 0.1, t);
      ng.gain.exponentialRampToValueAtTime(vol * 0.025, t + 0.15);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
      const end = env(g, 0.06, vol, 0.2, Math.max(0, dur - 0.12));
      a.connect(g);
      b.connect(bg).connect(g);
      g.connect(out);
      breath.connect(bp).connect(ng).connect(out);
      for (const o of [a, b, lfo, breath]) {
        o.start(t);
        o.stop(end);
      }
      break;
    }
    case 'choir': {
      // Wordless voices singing "ah": detuned saws through two vowel formants.
      const g = ctx.createGain();
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = 800;
      f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 1150;
      f2.Q.value = 6;
      const mix = ctx.createGain();
      mix.gain.value = 2.2;
      const oscs = [osc('sawtooth', f, -9), osc('sawtooth', f, 8), osc('sawtooth', f / 2, 3)];
      const lfo = osc('sine', 5);
      const lg = ctx.createGain();
      lg.gain.value = 6;
      const end = env(
        g,
        Math.min(1.4, dur / 3),
        vol,
        Math.min(1.8, dur / 2),
        Math.max(0, dur - 1.6),
      );
      for (const o of oscs) {
        lfo.connect(lg).connect(o.detune);
        o.connect(f1);
        o.connect(f2);
        o.start(t);
        o.stop(end);
      }
      lfo.start(t);
      lfo.stop(end);
      f1.connect(mix);
      f2.connect(mix);
      mix.connect(g).connect(out);
      break;
    }
    case 'pad': {
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const oscs = [osc('sawtooth', f, -7), osc('sawtooth', f, 7), osc('triangle', f / 2)];
      const end = env(
        g,
        Math.min(1.2, dur / 3),
        vol,
        Math.min(1.5, dur / 3),
        Math.max(0, dur - 1.6),
      );
      for (const o of oscs) {
        o.connect(lp);
        o.start(t);
        o.stop(end);
      }
      lp.connect(g).connect(out);
      break;
    }
    case 'bass': {
      const g = ctx.createGain();
      const o = osc('sine', f);
      const end = env(g, 0.02, vol, Math.min(1.6, dur));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(end);
      break;
    }
    case 'chime': {
      // A soft celesta: in-tune overtones (an octave and a fifth above), each
      // dying away faster than the one below.
      for (const [ratio, amp, decay] of CHIME_PARTIALS) {
        const g = ctx.createGain();
        const o = osc('sine', f * ratio);
        const end = env(g, 0.006, vol * amp, decay);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(end);
      }
      break;
    }
    case 'drum': {
      // A soft frame drum: a low thump, barely any skin noise.
      const g = ctx.createGain();
      const o = osc('sine', 100);
      o.frequency.setValueAtTime(100, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.3);
      const end = env(g, 0.004, vol, 0.4);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(end);
      break;
    }
  }
}

export function playsOnPass(part: Part, track: Track, pass: number): boolean {
  return !part.passes || part.passes.includes(pass % track.cycle);
}

/** Schedules one full pass of a track starting at time `t0`. Returns when it ends. */
/** Semitones a pass is lifted by. */
export function liftOf(track: Track, pass: number): number {
  return track.lift?.[pass % track.cycle] ?? 0;
}

export function scheduleLoop(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  track: Track,
  t0: number,
  pass = 0,
): number {
  for (const part of track.parts) {
    if (!playsOnPass(part, track, pass)) continue;
    for (const [s, m, l, v = 1] of part.notes) {
      if (s >= track.length) continue;
      const lifted = m === 0 ? m : m + liftOf(track, pass);
      playVoice(
        ctx,
        out,
        noise,
        part.voice,
        lifted,
        t0 + s * track.step,
        l * track.step,
        part.gain * v,
      );
    }
  }
  return t0 + track.length * track.step;
}

export function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 987654321;
  for (let i = 0; i < len; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  return buf;
}

/**
 * A hall of trees: three filtered feedback delays, longer than the Knight's
 * stone hall, mixed under the dry signal. Returns the node to play into.
 */
export function createRoom(ctx: BaseAudioContext, out: AudioNode): AudioNode {
  const input = ctx.createGain();
  input.connect(out);
  for (const [time, fb, level] of [
    [0.173, 0.34, 0.2],
    [0.311, 0.32, 0.16],
    [0.457, 0.28, 0.12],
  ] as const) {
    const d = ctx.createDelay(1);
    d.delayTime.value = time;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const feedback = ctx.createGain();
    feedback.gain.value = fb;
    const wet = ctx.createGain();
    wet.gain.value = level;
    input.connect(d);
    d.connect(lp).connect(feedback).connect(d);
    lp.connect(wet).connect(out);
  }
  return input;
}

/** Note start times (seconds) over several passes, as the player schedules them. */
export function noteTimes(track: Track, passes: number): number[] {
  const times: number[] = [];
  for (let pass = 0; pass < passes; pass++) {
    const t0 = pass * track.length * track.step;
    for (const part of track.parts) {
      if (!playsOnPass(part, track, pass)) continue;
      for (const [s] of part.notes) if (s < track.length) times.push(t0 + s * track.step);
    }
  }
  return times.sort((a, b) => a - b);
}

// ---------- the live player ----------

interface Event {
  readonly step: number;
  readonly part: Part;
  readonly note: Note;
}

/**
 * Plays tracks endlessly. Notes are scheduled a few seconds ahead in small
 * batches (so a track can stop or change at any moment), and each pass
 * starts exactly where the last one ended: no gap, no restart feeling.
 * Changing track cross-fades.
 */
export class MusicPlayer {
  private bus: GainNode;
  private room: AudioNode;
  private noise: AudioBuffer;
  private current: {
    id: TrackId;
    gain: GainNode;
    events: Event[];
    index: number;
    pass: number;
    passStart: number;
  } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volume = 0.4;

  constructor(
    private readonly ctx: AudioContext,
    out: AudioNode,
  ) {
    this.bus = ctx.createGain();
    this.bus.gain.value = this.volume;
    this.bus.connect(out);
    this.room = createRoom(ctx, this.bus);
    this.noise = makeNoise(ctx);
    this.timer = setInterval(() => this.pump(), 250);
  }

  get trackId(): TrackId | null {
    return this.current?.id ?? null;
  }

  /** 0 (off) to 1. */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(this.volume, t, 0.08);
  }

  /** Switches to a track (cross-fading), or keeps playing if it's already on. */
  play(id: TrackId | null): void {
    if (this.current?.id === id) return;
    const t = this.ctx.currentTime;
    if (this.current) {
      const old = this.current.gain;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0, t + 1.5);
      setTimeout(() => old.disconnect(), 4000);
      this.current = null;
    }
    if (!id) return;
    const track = TRACKS[id];
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 1.2);
    gain.connect(this.room);
    const events: Event[] = track.parts
      .flatMap((part) => part.notes.map((note) => ({ step: note[0], part, note })))
      .filter((e) => e.step < track.length)
      .sort((a, b) => a.step - b.step);
    this.current = { id, gain, events, index: 0, pass: 0, passStart: t + 0.1 };
    this.pump();
  }

  /** Schedules everything due in the next few seconds. */
  private pump(): void {
    const cur = this.current;
    if (!cur || this.ctx.state !== 'running') return;
    const track = TRACKS[cur.id];
    const horizon = this.ctx.currentTime + 3;
    // Never schedule into the past (e.g. after the app was in the background).
    if (cur.passStart + track.length * track.step < this.ctx.currentTime) {
      cur.passStart = this.ctx.currentTime + 0.05;
      cur.index = 0;
      cur.pass++;
    }
    for (;;) {
      if (cur.index >= cur.events.length) {
        // Next pass starts exactly where this one ends.
        cur.passStart += track.length * track.step;
        cur.pass++;
        cur.index = 0;
      }
      const e = cur.events[cur.index]!;
      const t = cur.passStart + e.step * track.step;
      if (t > horizon) break;
      cur.index++;
      if (t < this.ctx.currentTime || !playsOnPass(e.part, track, cur.pass)) continue;
      const [, midi, len, v = 1] = e.note;
      playVoice(
        this.ctx,
        cur.gain,
        this.noise,
        e.part.voice,
        midi === 0 ? 0 : midi + liftOf(track, cur.pass),
        t,
        len * track.step,
        e.part.gain * v,
      );
    }
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.bus.disconnect();
  }
}
