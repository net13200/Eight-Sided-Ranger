/**
 * Playing the Daily Trail: three floors in a row. HP carries from floor to
 * floor (no healing in between), moves add up, and the run is scored against
 * one par for all three floors. Each floor's start is saved, so leaving and
 * coming back resumes it; Undo and Retry work within a floor.
 */
import type { Level } from '../engine';
import {
  DAILY_FLOORS,
  currentStreak,
  dailyFloor,
  recordDaily,
  runPar,
  shareText,
  utcDate,
} from '../meta/daily';
import type { DailyRun } from '../meta/save';
import type { Game } from './game';
import type { PlayMode, WinPanel } from './play-mode';
import { starsFor } from './stars';
import { t } from '../i18n';

const cache = new Map<string, Level[]>();

/** The day's three floors (built once per session). */
export function trailFloors(date: string, tier: number): Level[] {
  const k = `${date}:${tier}`;
  let floors = cache.get(k);
  if (!floors) {
    floors = Array.from({ length: DAILY_FLOORS }, (_, i) => dailyFloor(date, tier, i + 1));
    cache.set(k, floors);
  }
  return floors;
}

export function today(game: Game): string {
  return utcDate(game.platform.now());
}

/** Starts the day's trail from floor 1. */
export function startTrail(game: Game, tier: number): void {
  const run: DailyRun = { date: today(game), tier, floor: 1, hp: 3, moves: 0 };
  game.save.update((d) => (d.daily.run = run));
  playFloor(game, run);
}

/** Plays the floor a run is on, entered with the run's HP. */
export function playFloor(game: Game, run: DailyRun): void {
  const floors = trailFloors(run.date, run.tier);
  const level = { ...floors[run.floor - 1]!, hp: run.hp };
  game.playLevel(level, new TrailMode(game, run, runPar(floors)));
}

class TrailMode implements PlayMode {
  readonly lessons = false;
  readonly movesBefore: number;

  constructor(
    private readonly game: Game,
    private readonly run: DailyRun,
    readonly par: number,
  ) {
    this.movesBefore = run.moves;
  }

  title(): string {
    return t('Daily Trail · floor {n} of {m}', { n: this.run.floor, m: DAILY_FLOORS });
  }

  heading(): string {
    return t('Daily Trail');
  }

  won(_level: Level, moves: number, hp: number): WinPanel {
    const run = this.run;
    const total = run.moves + moves;
    if (run.floor < DAILY_FLOORS) {
      const next: DailyRun = { ...run, floor: run.floor + 1, hp, moves: total };
      this.game.save.update((d) => (d.daily.run = next));
      return {
        title: t('Floor {n} cleared', { n: run.floor }),
        text: t('{hp} of 3 HP carries over, with no healing. {n} moves so far.', {
          hp,
          n: total,
        }),
        stars: null,
        next: { label: t('Floor {n}', { n: run.floor + 1 }), go: () => playFloor(this.game, next) },
      };
    }
    const stars = starsFor(total, this.par);
    const result = { moves: total, par: this.par, stars };
    let counted = false;
    this.game.save.update((d) => {
      counted = recordDaily(d, run.date, result);
      d.daily.run = null;
    });
    const streak = currentStreak(this.game.save.data, run.date);
    return {
      title: t('Daily Trail done!'),
      text:
        t('{n} moves (par {par}).', { n: total, par: this.par }) +
        ' ' +
        (counted
          ? t('Streak: {n} days.', { n: streak })
          : t("Practice: today's first result is kept.")),
      stars,
      next: { label: t('Back to the Trail'), go: () => this.game.goDaily() },
      share: () => {
        const r = this.game.save.data.daily.results[run.date] ?? result;
        void this.game.platform.share({
          text: shareText(run.date, r, streak, this.game.platform.shareUrl),
        });
      },
    };
  }

  back(): void {
    this.game.goDaily();
  }
}
