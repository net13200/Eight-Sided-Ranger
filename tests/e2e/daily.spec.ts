/** The Daily Trail: locked before the Edgewood, a whole run, practice, and resuming a run. */
import { seedSave } from '../../tools/lib/seed';
import { expect, test, type Page } from '@playwright/test';
import { startState } from '../../src/engine';
import { dailyFloor } from '../../src/meta/daily';
import { solve } from '../../src/solver/solve';

const DATE = '2026-10-01';
const KEY = { N: 'ArrowUp', E: 'ArrowRight', S: 'ArrowDown', W: 'ArrowLeft' } as const;
const seed = (n: number) => seedSave(n);
const routes = [1, 2, 3].map((f) => solve(startState(dailyFloor(DATE, 1, f))).path);

async function open(page: Page, levelsDone: number): Promise<void> {
  await page.clock.setFixedTime(new Date(`${DATE}T12:00:00Z`));
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('esr-save', s);
      sessionStorage.setItem('seeded', '1');
    }
  }, seed(levelsDone));
  await page.goto('/');
  await page.getByTestId('daily').click(); // the title screen's Daily Trail: the map, at the board
  await expect(page.getByTestId('map-announcer')).toHaveText('Daily Trail');
  await page.getByTestId('map-play').click();
}

async function playFloor(page: Page, f: number): Promise<void> {
  for (const d of routes[f]!) await page.keyboard.press(KEY[d]);
  await expect(page.getByTestId('won')).toBeVisible();
}

test.describe('Daily Trail', () => {
  test.beforeEach(({ page: _page }, info) => {
    test.skip(info.project.name !== 'phone-portrait', 'one size is enough');
  });

  test('locked until the Edgewood is beaten', async ({ page }) => {
    await open(page, 5);
    await expect(page.getByTestId('daily-start')).toBeDisabled();
  });

  test('a whole run at par: ★★★, a 1-day streak, then practice', async ({ page }) => {
    await open(page, 10);
    await page.getByTestId('daily-start').click();
    await playFloor(page, 0);
    await page.getByTestId('next').click();
    await playFloor(page, 1);
    await page.getByTestId('next').click();
    await playFloor(page, 2);
    await expect(page.getByTestId('stars')).toHaveText('★★★');
    const daily = await page.evaluate(() => JSON.parse(localStorage.getItem('esr-save')!).daily);
    expect(daily).toMatchObject({ streak: 1, run: null });
    expect(daily.results['2026-10-01'].stars).toBe(3);
    await page.getByTestId('next').click(); // back to the board
    await expect(page.getByTestId('daily-start')).toHaveText(/practice/);
    await expect(page.getByTestId('daily-share')).toBeVisible();
  });

  test('leaving mid-run and coming back resumes the floor', async ({ page }) => {
    await open(page, 10);
    await page.getByTestId('daily-start').click();
    await playFloor(page, 0);
    await page.getByTestId('next').click();
    await page.getByTestId('menu').click(); // leave on floor 2
    await expect(page.getByTestId('daily-start')).toHaveText(/floor 2/);
    await page.reload();
    await page.getByTestId('daily').click();
    await page.getByTestId('map-play').click();
    await page.getByTestId('daily-start').click();
    await playFloor(page, 1);
    await expect(page.getByTestId('won')).toContainText('Floor 2');
  });
});
