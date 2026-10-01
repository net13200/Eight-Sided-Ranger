import { MusicPlayer, type TrackId } from './music';

/**
 * Sound effects synthesized with WebAudio (no audio files). The context is
 * created at startup; where the browser blocks sound until the player
 * interacts, it starts on the first touch or key press anywhere.
 */
export type SfxName =
  | 'roll'
  | 'bump'
  | 'shoot'
  | 'hit'
  | 'kill'
  | 'swing'
  | 'leap'
  | 'snare'
  | 'hurt'
  | 'heal'
  | 'win'
  | 'lose'
  | 'undo'
  | 'click';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlayed = new Map<SfxName, number>();
  private music: MusicPlayer | null = null;
  private track: TrackId | null = null;
  private musicVolume = 0.5;
  private isMuted = false;

  /** Mutes sound effects and music. */
  get muted(): boolean {
    return this.isMuted;
  }
  set muted(on: boolean) {
    this.isMuted = on;
    this.applyMusicVolume();
  }

  /** The music track the game wants playing (for tests and debugging). */
  get currentTrack(): TrackId | null {
    return this.track;
  }

  /** Background music track to play (starts after the first user gesture). */
  setTrack(id: TrackId | null): void {
    this.track = id;
    this.music?.play(id);
  }

  /** Music volume 0 (off) to 1. */
  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.applyMusicVolume();
  }

  private applyMusicVolume(): void {
    // Music sits under the sound effects.
    this.music?.setVolume(this.isMuted ? 0 : this.musicVolume * 0.6);
  }

  /** Whether sound is actually playing (not blocked by the browser or suspended). */
  get running(): boolean {
    return this.ctx?.state === 'running' && !this.stalled;
  }

  /** The page is in the background (we paused sound on purpose). */
  private hidden = false;
  /** The context says "running" but its clock stopped (seen on iOS after switching apps). */
  private stalled = false;
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  /**
   * Starts sound, or brings it back. Called at startup (works where the
   * browser allows sound without a gesture), on every touch or key press,
   * and when the page becomes visible again. Safe to call repeatedly.
   */
  unlock(): void {
    const ctx = this.ctx;
    if (!ctx) {
      this.create();
      return;
    }
    const state = ctx.state as string;
    if (state === 'closed' || this.stalled) {
      // The browser closed it, or it's stuck: start over with a fresh one.
      this.rebuild();
      return;
    }
    // 'suspended', or iOS's 'interrupted' after switching apps or a call.
    if (state !== 'running') {
      ctx.resume().then(
        () => this.checkClock(),
        () => {},
      );
    }
  }

  private create(): void {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      this.ctx = ctx;
      this.stalled = false;
      this.master = ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(ctx.destination);
      this.music = new MusicPlayer(ctx, this.master);
      this.applyMusicVolume();
      this.music.play(this.track);
      const len = Math.floor(ctx.sampleRate * 0.3);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = (seed / 4294967296) * 2 - 1;
      }
      // The system can pause sound on its own (another app, a call). When
      // that happens while the game is on screen, ask for it back.
      ctx.addEventListener('statechange', () => {
        if (this.ctx !== ctx || this.hidden) return;
        const state = ctx.state as string;
        if (state === 'closed') this.rebuild();
        else if (state !== 'running') ctx.resume().catch(() => {});
      });
    } catch {
      this.ctx = null;
    }
  }

  /** Throws the old context away and starts a fresh one, keeping the track and volume. */
  private rebuild(): void {
    const old = this.ctx;
    this.music?.dispose();
    this.music = null;
    this.master = null;
    this.ctx = null;
    this.stalled = false;
    if (old && (old.state as string) !== 'closed') old.close().catch(() => {});
    this.create();
  }

  /**
   * After a resume, make sure the clock really moves: some browsers report
   * "running" but stay silent. If so, the next call to unlock() rebuilds.
   */
  private checkClock(): void {
    const ctx = this.ctx;
    if (!ctx || this.watchdog) return;
    const t0 = ctx.currentTime;
    this.watchdog = setTimeout(() => {
      this.watchdog = null;
      if (this.ctx !== ctx || this.hidden || ctx.state !== 'running') return;
      if (ctx.currentTime - t0 < 0.1) {
        this.stalled = true;
        this.rebuild();
      }
    }, 600);
  }

  /** The page went to the background: pause sound. */
  suspend(): void {
    this.hidden = true;
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  /** The page is back: bring sound back (the next touch does it if the browser insists). */
  resume(): void {
    this.hidden = false;
    this.unlock();
  }

  play(name: SfxName, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime + delay;
    // Avoid stacking the same sound many times in one instant (e.g. splash).
    const last = this.lastPlayed.get(name) ?? -1;
    if (Math.abs(t - last) < 0.03) return;
    this.lastPlayed.set(name, t);

    switch (name) {
      case 'roll':
        // A wooden die tipping onto grass: a soft knock and a rustle.
        this.noiseHit(t, 0.07, 1400, 0.18);
        this.tone(t, 'triangle', 210, 140, 0.08, 0.16);
        break;
      case 'bump':
        this.tone(t, 'sine', 110, 80, 0.08, 0.25);
        break;
      case 'shoot':
        // The bowstring's twang, then the arrow's hiss.
        this.tone(t, 'triangle', 196, 180, 0.18, 0.18);
        this.tone(t, 'sine', 392, 370, 0.12, 0.06);
        this.noiseHit(t + 0.03, 0.12, 5200, 0.1);
        break;
      case 'hit':
        this.noiseHit(t, 0.06, 3000, 0.3);
        this.tone(t, 'square', 640, 380, 0.07, 0.07);
        break;
      case 'kill':
        // A wolf gives up and slinks off: a falling whimper.
        this.tone(t, 'sine', 700, 350, 0.25, 0.12);
        this.noiseHit(t + 0.02, 0.12, 1200, 0.2);
        break;
      case 'swing':
        // The rope's whoosh.
        this.noiseHit(t, 0.28, 900, 0.18);
        this.tone(t, 'sine', 260, 520, 0.26, 0.06);
        break;
      case 'leap':
        this.tone(t, 'triangle', 330, 660, 0.12, 0.12);
        this.tone(t + 0.12, 'triangle', 660, 440, 0.1, 0.08);
        break;
      case 'snare':
        // A twig snaps, a loop pulls tight.
        this.noiseHit(t, 0.03, 4000, 0.3);
        this.tone(t + 0.03, 'triangle', 500, 260, 0.1, 0.12);
        break;
      case 'hurt':
        this.tone(t, 'sawtooth', 220, 110, 0.18, 0.13);
        break;
      case 'heal':
        // A little harp run up a pentatonic scale.
        [587, 659, 784, 880, 1175].forEach((f, i) =>
          this.tone(t + i * 0.05, 'triangle', f, f, 0.3, 0.12),
        );
        break;
      case 'win':
        [587, 740, 880, 1175].forEach((f, i) =>
          this.tone(t + i * 0.09, 'triangle', f, f, 0.35, 0.18),
        );
        this.tone(t + 0.36, 'sine', 1760, 1760, 0.6, 0.05);
        break;
      case 'lose':
        [440, 392, 330].forEach((f, i) =>
          this.tone(t + i * 0.16, 'triangle', f, f * 0.97, 0.28, 0.18),
        );
        break;
      case 'undo':
        this.tone(t, 'sine', 500, 300, 0.08, 0.12);
        break;
      case 'click':
        this.tone(t, 'sine', 700, 700, 0.04, 0.1);
        break;
    }
  }

  private tone(
    t: number,
    type: OscillatorType,
    from: number,
    to: number,
    dur: number,
    vol: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseHit(t: number, dur: number, cutoff: number, vol: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
