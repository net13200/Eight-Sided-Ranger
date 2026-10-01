/**
 * Sound. A placeholder with the final interface: the WebAudio version (sound
 * effects and music, unlocked on the first gesture, resumed after iOS
 * interrupts it) comes in its own step.
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
  | 'undo';

export class Audio {
  muted = false;
  unlock(): void {}
  suspend(): void {}
  resume(): void {}
  play(_name: SfxName): void {}
}
