/**
 * What kind of play a level is: a campaign level, or a floor of the Daily
 * Trail. The play screen is the same; the mode decides its titles, its par
 * (a run has one par for all its floors), what winning does, and where Back
 * goes.
 */
import type { Level } from '../engine';
import { DISTRICT_NAMES, fingerprint } from '../meta/progress';
import { DISTRICT_SIZE } from './world/layout';
import type { Game } from './game';
import { starsFor } from './stars';
import { t } from '../i18n';

export interface WinPanel {
  readonly title: string;
  readonly text: string;
  /** Stars to show, or null (a floor in the middle of a run). */
  readonly stars: number | null;
  readonly next: { readonly label: string; readonly go: () => void };
  /** Play the same thing again (campaign). */
  readonly again?: () => void;
  /** Share the result (the Daily Trail, finished). */
  readonly share?: () => void;
}

export interface PlayMode {
  /** The top bar's title. */
  title(level: Level): string;
  /** The side panel's heading (wide screens). */
  heading(): string;
  /** Moves made before this level started (the earlier floors of a run). */
  readonly movesBefore: number;
  /** The par shown and scored against (a run's par covers all its floors). */
  readonly par: number | undefined;
  /** Show the level's lesson card on first play. */
  readonly lessons: boolean;
  /** The level was won; returns what the win panel says. */
  won(level: Level, moves: number, hp: number): WinPanel;
  /** Leave (Map, Esc). */
  back(): void;
}

export class CampaignMode implements PlayMode {
  readonly movesBefore = 0;
  readonly lessons = true;
  readonly par: number | undefined;

  constructor(
    private readonly game: Game,
    readonly index: number,
  ) {
    this.par = game.levels[index]?.par;
  }

  title(level: Level): string {
    return t('{n}. {name}', { n: this.index + 1, name: t(level.name) });
  }

  heading(): string {
    return t(DISTRICT_NAMES[Math.floor(this.index / DISTRICT_SIZE)] ?? '');
  }

  won(level: Level, moves: number): WinPanel {
    const stars = starsFor(moves, level.par);
    this.game.save.recordWin(level.id, fingerprint(level), moves, stars);
    const last = this.index + 1 >= this.game.levels.length;
    return {
      title: t('{name}: done!', { name: t(level.name) }),
      text: t('{n} moves (par {par}).', { n: moves, par: level.par ?? 0 }),
      stars,
      next: {
        label: t(last ? 'Map' : 'Next level'),
        go: () => (last ? this.game.goMap(this.index) : this.game.goPlay(this.index + 1)),
      },
      again: () => this.game.goPlay(this.index),
    };
  }

  back(): void {
    this.game.goMap(this.index);
  }
}
