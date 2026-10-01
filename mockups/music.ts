/**
 * Renders the music tracks offline to WAV (for listening outside the game).
 * tools/render-music.mjs opens this page and saves the files.
 */
import { TRACKS, createRoom, makeNoise, scheduleLoop, type TrackId } from '../src/game/music';

const RATE = 22050;

function wav(samples: Float32Array): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0.95 ? 0.95 / peak : 1;
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.round(s * norm * 32767), true));
  return new Uint8Array(buf);
}

async function render(id: TrackId, loops: number): Promise<string> {
  const track = TRACKS[id];
  const seconds = track.length * track.step * loops + 2;
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  const room = createRoom(ctx, master);
  const noise = makeNoise(ctx);
  let t = 0.05;
  for (let i = 0; i < loops; i++) t = scheduleLoop(ctx, room, noise, track, t);
  // Fade out the tail.
  master.gain.setValueAtTime(0.8, t - 1.5);
  master.gain.linearRampToValueAtTime(0, t + 1.5);
  const out = await ctx.startRendering();
  const bytes = wav(out.getChannelData(0));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

(window as unknown as { renderTrack: typeof render }).renderTrack = render;
document.title = 'ready';
