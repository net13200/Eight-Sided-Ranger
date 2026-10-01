/**
 * Everything the game needs from its host environment. Game code talks only
 * to this interface, so a new host (app store wrapper, portal, ...) is a new
 * implementation, not a rewrite. There is no analytics: the game collects
 * no data.
 */
export interface KeyValueStorage {
  /** Returns null if missing or if storage is unavailable. Never throws. */
  get(key: string): string | null;
  /** Returns false if the write failed (quota, private mode). Never throws. */
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

import type { Ads } from './ads';

export type ShareResult = 'shared' | 'copied' | 'failed';

export interface Platform {
  readonly storage: KeyValueStorage;
  /** Ad breaks and host events (none). */
  readonly ads: Ads;
  /** The link shared results point to, or null where outside links aren't allowed (portals). */
  readonly shareUrl: string | null;
  share(data: { text: string; title?: string }): Promise<ShareResult>;
  /** Calls back with false when the game is hidden, true when visible again. */
  onVisibilityChange(cb: (visible: boolean) => void): () => void;
  locale(): string;
  /** Wall-clock milliseconds (for timestamps, not simulation). */
  now(): number;
  prefersReducedMotion(): boolean;
}
