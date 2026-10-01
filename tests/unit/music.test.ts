import { describe, expect, it, vi } from 'vitest';
import { MusicPlayer, TRACKS, noteTimes, playsOnPass } from '../../src/game/music';

describe('background music', () => {
  for (const [id, track] of Object.entries(TRACKS)) {
    it(`${id}: every note fits in the loop and every pass has music`, () => {
      for (const part of track.parts) {
        for (const [s, , l] of part.notes) {
          expect(s, `${id} ${part.voice}`).toBeGreaterThanOrEqual(0);
          expect(s, `${id} ${part.voice}`).toBeLessThan(track.length);
          expect(l).toBeGreaterThan(0);
        }
        for (const p of part.passes ?? []) expect(p).toBeLessThan(track.cycle);
      }
      for (let pass = 0; pass < track.cycle; pass++) {
        const playing = track.parts.filter((p) => playsOnPass(p, track, pass));
        expect(playing.length, `${id} pass ${pass}`).toBeGreaterThanOrEqual(2);
      }
    });

    it(`${id}: every held note sits well on its chord (no semitone or tritone rubs)`, () => {
      const { bar, roots, thirds } = track.harmony;
      for (const part of track.parts) {
        if (part.voice === 'drum') continue;
        for (const [s, m, l] of part.notes) {
          if (l < 3 || m === 0) continue;
          const b = Math.floor(s / bar) % roots.length;
          const r = roots[b]! % 12;
          const chord = [r, (r + thirds[b]!) % 12, (r + 7) % 12];
          const pc = m % 12;
          const rub =
            !chord.includes(pc) && chord.some((c) => [1, 6, 11].includes((pc - c + 12) % 12));
          expect(rub, `${id} ${part.voice} note ${m} at step ${s}`).toBe(false);
        }
      }
    });

    it(`${id}: never falls silent, even across loop boundaries (feels endless)`, () => {
      const times = noteTimes(track, track.cycle * 2 + 1);
      let gap = 0;
      for (let i = 1; i < times.length; i++) gap = Math.max(gap, times[i]! - times[i - 1]!);
      expect(gap).toBeLessThan(2.5);
    });
  }
});

/** A fake AudioContext: every node is a no-op, and oscillator start times are recorded. */
function fakeContext() {
  const starts: number[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    setTargetAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  });
  const node = (): Record<string, unknown> => ({
    connect: (n: unknown) => n,
    disconnect: () => undefined,
    gain: param(),
    frequency: param(),
    detune: param(),
    delayTime: param(),
    Q: param(),
    start: (t: number) => starts.push(t),
    stop: () => undefined,
    type: '',
    buffer: null,
    loop: false,
  });
  const ctx = {
    currentTime: 0,
    state: 'running',
    sampleRate: 8000,
    createGain: node,
    createOscillator: node,
    createBiquadFilter: node,
    createDelay: node,
    createBufferSource: node,
    createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
  };
  return { ctx, starts };
}

describe('the live music player', () => {
  it('plays on without gaps across many passes and survives a track change', () => {
    vi.useFakeTimers();
    const { ctx, starts } = fakeContext();
    const player = new MusicPlayer(ctx as unknown as AudioContext, ctx as unknown as AudioNode);
    player.play('stones');
    // Run for 3+ minutes of audio time (several full arrangement cycles).
    for (let t = 0; t < 200; t += 0.25) {
      ctx.currentTime = t;
      vi.advanceTimersByTime(250);
    }
    const unique = [...new Set(starts.map((t) => Math.round(t * 1000) / 1000))].sort(
      (a, b) => a - b,
    );
    let gap = 0;
    for (let i = 1; i < unique.length; i++) gap = Math.max(gap, unique[i]! - unique[i - 1]!);
    expect(unique.at(-1)!).toBeGreaterThan(195);
    expect(gap).toBeLessThan(2.5);
    // Switching tracks keeps music going.
    const before = starts.length;
    player.play('glade');
    for (let t = 200; t < 210; t += 0.25) {
      ctx.currentTime = t;
      vi.advanceTimersByTime(250);
    }
    expect(starts.length).toBeGreaterThan(before);
    player.dispose();
    vi.useRealTimers();
  });
});
