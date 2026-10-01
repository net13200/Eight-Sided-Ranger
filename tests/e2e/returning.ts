/** A returning player's save, so the game opens on the title screen (for tests that need its buttons). */
import type { Page } from '@playwright/test';

export async function asReturningPlayer(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!localStorage.getItem('esr-save'))
      localStorage.setItem(
        'esr-save',
        JSON.stringify({
          version: 1,
          levels: { '1-01': { stars: 3, bestMoves: 7, completions: 1 } },
          seen: { 'road:1': true, 'story:intro': true, 'story:d1': true },
          settings: {},
        }),
      );
  });
}
