/**
 * The game: owns the stage, the save and the current scene, and draws each
 * frame (the scene on the stage, the backdrop around it).
 */
import type { Level } from '../engine';
import { loadLevels } from '../levels/campaign';
import { Save } from '../meta/save';
import type { Platform } from '../platform/platform';
import { Audio } from './audio';
import type { Command } from './input';
import { DailyScene } from './scenes/daily';
import { MapScene } from './scenes/map';
import { MenuScene } from './scenes/menu';
import { CampaignMode, type PlayMode } from './play-mode';
import { PlayScene } from './scenes/play';
import { StoryScene } from './scenes/story';
import { storyBeforeLevel, type StoryPage } from './story';
import { isCompleted } from '../meta/progress';
import { tk } from '../i18n';
import type { Scene } from './scenes/scene';
import { drawBackdrop } from './view/backdrop';
import type { Stage } from './view/stage';

export class Game {
  readonly save: Save;
  readonly audio = new Audio();
  readonly levels: Level[] = loadLevels();
  scene: Scene | null = null;
  private frame = 0;

  constructor(
    readonly stage: Stage,
    readonly platform: Platform,
  ) {
    this.save = new Save(platform.storage);
    this.audio.muted = this.save.data.settings.muted;
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  toggleMute(): void {
    this.audio.muted = !this.audio.muted;
    this.save.update((d) => (d.settings.muted = this.audio.muted));
    this.stage.root.dispatchEvent(new Event('esr:settings'));
  }

  /** Reduce motion: the player's choice, or the system setting. */
  get reducedMotion(): boolean {
    return this.save.data.settings.reducedMotion || this.platform.prefersReducedMotion();
  }

  /** The player is playing (a move) or stopped (level end, a card). */
  setPlaying(on: boolean): void {
    if (on) this.platform.ads.gameplayStart();
    else this.platform.ads.gameplayStop();
  }

  private go(next: Scene): void {
    this.scene?.exit?.();
    this.stage.ui.replaceChildren();
    this.scene = next;
    this.stage.root.dataset.scene = next.name;
    // The stones tune while playing a level; the glade tune everywhere else.
    this.audio.setTrack(next.name === 'play' ? 'stones' : 'glade');
    this.platform.ads.gameplayStop();
    next.enter(this.stage.ui);
  }

  /** Plays campaign level `index`, after any story pages due first (the intro, a district's card). */
  goPlay(index: number, opts: { story?: boolean } = {}): void {
    const i = Math.max(0, Math.min(index, this.levels.length - 1));
    const level = this.levels[i]!;
    const play = () => this.go(new PlayScene(this, level, new CampaignMode(this, i)));
    const seen = this.save.data.seen;
    const due =
      opts.story === false
        ? { pages: [], keys: [] }
        : storyBeforeLevel(i, (k) => !!seen[k], isCompleted(this.save.data, level));
    if (!due.pages.length) return play();
    this.goStory(
      due.pages,
      () => {
        this.save.update((d) => due.keys.forEach((k) => (d.seen[k] = true)));
        play();
      },
      tk('Play'),
    );
  }

  goStory(pages: readonly StoryPage[], done: () => void, finalLabel?: string): void {
    this.go(new StoryScene(this, pages, done, finalLabel));
  }

  /** Plays any level in any mode (a Daily Trail floor). */
  playLevel(level: Level, mode: PlayMode): void {
    this.go(new PlayScene(this, level, mode));
  }

  /** The map, with the die on level `at` (default: where to pick up). */
  goMap(at?: number): void {
    this.go(new MapScene(this, at));
  }

  goMenu(): void {
    this.go(new MenuScene(this));
  }

  goDaily(): void {
    this.go(new DailyScene(this));
  }

  command(cmd: Command): void {
    if (cmd.type === 'mute') this.toggleMute();
    else this.scene?.command?.(cmd);
  }

  update(dt: number): void {
    this.scene?.update?.(dt);
  }

  /** Draws a frame. Returns false when the frame was skipped (idle, half rate). */
  render(): boolean {
    this.frame++;
    if (this.frame % 2 === 1 && this.scene?.idle?.()) return false;
    const ctx = this.stage.beginFrame();
    this.scene?.render(ctx);
    const { box, view } = this.stage;
    if (!(box.x < 1 && box.y < 1 && box.w >= view.w - 1 && box.h >= view.h - 1)) {
      const t = this.reducedMotion ? 0 : performance.now() / 1000;
      const s = this.scene;
      drawBackdrop(this.stage, s?.backdrop ?? 'forest', t, s?.renderSide?.bind(s));
    }
    return true;
  }
}
