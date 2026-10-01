/** The title screen: story, how to play, settings that stick. */
import { expect, test, type Page } from '@playwright/test';

const scene = (page: Page) => page.evaluate(() => (window.__esr as { scene(): string }).scene());

test.beforeEach(async ({ page }) => {
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
  await page.goto('/');
  await expect.poll(() => scene(page)).toBe('menu');
});

test('the story so far pages through and comes back', async ({ page }) => {
  await page.getByTestId('story').click();
  await expect.poll(() => scene(page)).toBe('story');
  await expect(page.getByTestId('story-text')).toContainText('edge of Oddmere');
  for (let i = 0; i < 5; i++) await page.getByTestId('story-next').click();
  await expect.poll(() => scene(page)).toBe('menu');
});

test('how to play opens and closes', async ({ page }) => {
  await page.getByTestId('how-to').click();
  await expect(page.getByTestId('how-to-sheet')).toContainText('three ways to roll');
  await page.getByTestId('how-to-close').click();
  await expect(page.locator('.sheet')).toHaveCount(0);
});

test('settings: sound and reduced motion are saved', async ({ page }) => {
  await page.getByTestId('settings').click();
  await page.getByTestId('setting-sound').uncheck();
  await page.getByTestId('setting-motion').check();
  await page.getByTestId('settings-close').click();
  await page.reload();
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('esr-save')!).settings);
  expect(s).toMatchObject({ muted: true, reducedMotion: true });
  await expect(page.getByTestId('mute')).toHaveAttribute('aria-pressed', 'true');
});
