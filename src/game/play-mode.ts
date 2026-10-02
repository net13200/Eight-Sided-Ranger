/**
 * What kind of play a level is: a campaign level, or a floor of the Daily
 * Trail. The play screen is the same; the mode decides its titles, its par
 * (a run has one par for all its floors), what winning does, and where Back
 * goes.
 */
import type { Level } from '../engine';
import { DISTRICT_NAMES, fingerprint, runPar } from '../meta/progress';
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

/** Where a gauntlet run stands: the floor being played (0 = the first), the HP and moves so far. */
export interface GauntletRun {
  readonly floor: number;
  readonly movesBefore: number;
}

/**
 * A campaign level. A gauntlet is played floor after floor in this mode:
 * HP carries over (no healing in between), moves add up, and the run is
 * scored against one par for all its floors. Leaving restarts it.
 */
export class CampaignMode implements PlayMode {
  readonly movesBefore: number;
  readonly lessons: boolean;
  readonly par: number | undefined;
  private readonly main: Level;

  constructor(
    private readonly game: Game,
    readonly index: number,
    private readonly run: GauntletRun = { floor: 0, movesBefore: 0 },
  ) {
    this.main = game.levels[index]!;
    this.par = runPar(this.main);
    this.movesBefore = run.movesBefore;
    this.lessons = true; // floors can have their own lesson (the Great Oak)
  }

  private get floors(): number {
    return 1 + (this.main.floors?.length ?? 0);
  }

  title(): string {
    const name = t('{n}. {name}', { n: this.index + 1, name: t(this.main.name) });
    return this.floors > 1
      ? `${name} · ${t('floor {n} of {m}', { n: this.run.floor + 1, m: this.floors })}`
      : name;
  }

  heading(): string {
    return t(DISTRICT_NAMES[Math.floor(this.index / DISTRICT_SIZE)] ?? '');
  }

  won(_level: Level, moves: number, hp: number): WinPanel {
    const total = this.run.movesBefore + moves;
    const floor = this.run.floor;
    if (floor + 1 < this.floors) {
      const next = { ...this.main.floors![floor]!, hp };
      const run = { floor: floor + 1, movesBefore: total };
      return {
        title: t('Floor {n} cleared', { n: floor + 1 }),
        text: t('{hp} of 3 HP carries over, with no healing. {n} moves so far.', { hp, n: total }),
        stars: null,
        next: {
          label: t('Floor {n}', { n: floor + 2 }),
          go: () => this.game.playLevel(next, new CampaignMode(this.game, this.index, run)),
        },
      };
    }
    const level = this.main;
    const stars = starsFor(total, this.par);
    this.game.save.recordWin(level.id, fingerprint(level), total, stars);
    const last = this.index + 1 >= this.game.levels.length;
    return {
      title: t('{name}: done!', { name: t(level.name) }),
      text: t('{n} moves (par {par}).', { n: total, par: this.par ?? 0 }),
      stars,
      next: {
        label: t(last ? 'The end' : 'Next level'),
        go: () => (last ? this.game.goEnding(this.index) : this.game.goPlay(this.index + 1)),
      },
      again: () => this.game.goPlay(this.index),
    };
  }

  back(): void {
    this.game.goMap(this.index);
  }
}
