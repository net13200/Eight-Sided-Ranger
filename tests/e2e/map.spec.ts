/** The world map: first launch, tapping levels, keys, returning from a level, laying a new road. */
import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

const seed = (n: number, ...flags: string[]) =>
  execFileSync('npx', ['tsx', 'tools/seed-save.ts', String(n), '', ...flags])
    .toString()
    .trim();
const withSave = async (page: Page, save: string) =>
  page.addInitScript((s) => localStorage.setItem('esr-save', s), save);
const scene = (page: Page) => page.evaluate(() => (window.__esr as { scene(): string }).scene());

test.describe('map', () => {
  test.skip(({ browserName }) => browserName !== 'chromium');

  test('a first-time player gets the story, then level 1; a returning one the title screen', async ({
    page,
  }) => {
    await page.goto('/');
    await expect.poll(() => scene(page)).toBe('story');
    await page.getByTestId('story-skip').click();
    await expect.poll(() => scene(page)).toBe('play');
    const page2 = await page.context().newPage();
    await withSave(page2, seed(3));
    await page2.goto('/');
    await expect.poll(() => scene(page2)).toBe('menu');
    await page2.getByTestId('play').click();
    await expect.poll(() => scene(page2)).toBe('map');
  });

  test('tap an open level, play it; Map brings you back to it', async ({ page }) => {
    await withSave(page, seed(5));
    await page.goto('/');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-7')).toBeDisabled();
    await page.getByTestId('level-5').click();
    await expect(page.getByTestId('map-announcer')).toHaveText(/Level 5/);
    await expect(page.getByTestId('map-play')).toBeEnabled();
    await page.getByTestId('map-play').click();
    await expect.poll(() => scene(page)).toBe('play');
    await page.getByTestId('menu').click();
    await expect.poll(() => scene(page)).toBe('map');
    await expect(page.getByTestId('map-announcer'))
      .toHaveText(/./, { timeout: 100 })
      .catch(() => {});
    await page.keyboard.press('Enter');
    await expect.poll(() => scene(page)).toBe('play');
    await expect
      .poll(() =>
        page.evaluate(
          () => (window.__esr as { state(): { level: { id: string } } }).state().level.id,
        ),
      )
      .toBe('1-05');
  });

  test('arrow keys hop to the next level; the end of the open road bumps', async ({ page }) => {
    await withSave(page, seed(2));
    await page.goto('/');
    await page.getByTestId('play').click();
    await page.keyboard.press('ArrowLeft'); // from level 3 to 2
    await expect(page.getByTestId('map-announcer')).toHaveText(/Level 2/);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // level 4 is locked: stays on 3
    await expect(page.getByTestId('map-announcer')).toHaveText(/Level 3/);
  });

  test('a newly opened level: the road lays itself, then the die goes there', async ({ page }) => {
    await withSave(page, seed(4, '--unseen'));
    await page.goto('/');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('map-play')).toBeDisabled();
    await expect(page.getByTestId('map-announcer')).toHaveText(/Level 5/);
    const seen = await page.evaluate(
      () => JSON.parse(localStorage.getItem('esr-save')!).seen['road:4'],
    );
    expect(seen).toBe(true);
  });

  test('dragging the map scrolls it and never presses a level', async ({ page }) => {
    await withSave(page, seed(5));
    await page.goto('/');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('map-announcer')).toHaveText(/Level 6/);
    const box = (await page.getByTestId('level-5').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 120, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('map-announcer')).toHaveText(/Level 6/);
  });
});
