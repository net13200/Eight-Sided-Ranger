/**
 * Saved progress: the best result per level, which lessons were seen, and
 * settings. Versioned JSON in the platform's storage; a broken or unknown
 * save starts fresh rather than crashing.
 */
import type { KeyValueStorage } from '../platform/platform';

export const SAVE_KEY = 'esr-save';
export const SAVE_VERSION = 1;

export interface LevelRecord {
  /** Best stars (1-3). */
  stars: number;
  bestMoves: number;
  completions: number;
  /** The level's fingerprint when it was beaten (see progress.ts); missing in the earliest saves. */
  fp?: string;
}

export interface SaveData {
  version: number;
  levels: Record<string, LevelRecord>;
  /** Things shown once: lessons, story pages. */
  seen: Record<string, boolean>;
  settings: { muted: boolean; lang: string | null; reducedMotion: boolean };
  daily: DailySave;
}

export interface DailySave {
  streak: number;
  bestStreak: number;
  lastDate: string | null;
  /** First finish per date (the last 90 days). */
  results: Record<string, { moves: number; par: number; stars: number }>;
  /** A trail in progress: leaving and coming back resumes it. */
  run: DailyRun | null;
}

export interface DailyRun {
  date: string;
  tier: number;
  /** The floor being played (1-3), the HP and moves it was entered with. */
  floor: number;
  hp: number;
  moves: number;
}

export function freshSave(): SaveData {
  return {
    version: SAVE_VERSION,
    levels: {},
    seen: {},
    settings: { muted: false, lang: null, reducedMotion: false },
    daily: { streak: 0, bestStreak: 0, lastDate: null, results: {}, run: null },
  };
}

export function parseSave(raw: string | null): SaveData {
  if (!raw) return freshSave();
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.version !== SAVE_VERSION) return freshSave();
    const f = freshSave();
    return {
      version: SAVE_VERSION,
      levels: { ...d.levels },
      seen: { ...d.seen },
      settings: { ...f.settings, ...d.settings },
      daily: { ...f.daily, ...d.daily },
    };
  } catch {
    return freshSave();
  }
}

export class Save {
  data: SaveData;

  constructor(private readonly storage: KeyValueStorage) {
    this.data = parseSave(storage.get(SAVE_KEY));
  }

  update(fn: (d: SaveData) => void): void {
    fn(this.data);
    this.storage.set(SAVE_KEY, JSON.stringify(this.data));
  }

  /**
   * Records a win, keeping the best result. A win on a changed level (a new
   * fingerprint) starts its record over: the old stars were for another puzzle.
   */
  recordWin(id: string, fp: string, moves: number, stars: number): void {
    this.update((d) => {
      const prev = d.levels[id]?.fp === fp ? d.levels[id] : undefined;
      d.levels[id] = {
        stars: Math.max(prev?.stars ?? 0, stars),
        bestMoves: prev ? Math.min(prev.bestMoves, moves) : moves,
        completions: (d.levels[id]?.completions ?? 0) + 1,
        fp,
      };
    });
  }
}
