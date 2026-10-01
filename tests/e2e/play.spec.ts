/** Playing a level in the browser: lesson card, moves, winning with stars. */
import { expect, test } from '@playwright/test';

test('the lesson card, then the par route wins ★★★', async ({ page }) => {
  await page.goto('/?level=3');
  await expect(page.getByTestId('lesson')).toBeVisible();
  await page.getByTestId('lesson-ok').click(); // finish typing
  await page.getByTestId('lesson-ok').click(); // close
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  for (const d of 'SEEEEESE') {
    await page.keyboard.press(
      { N: 'ArrowUp', E: 'ArrowRight', S: 'ArrowDown', W: 'ArrowLeft' }[d]!,
    );
  }
  await expect(page.getByTestId('won')).toBeVisible();
  await expect(page.getByTestId('stars')).toHaveText('★★★');
});

test('a tap on a neighbouring triangle rolls there; undo takes it back', async ({ page }) => {
  await page.goto('/?level=1');
  await page.getByTestId('lesson-ok').click();
  await page.getByTestId('lesson-ok').click();
  const moves = () =>
    page.evaluate(() => (window.__esr as { state(): { moves: number } }).state().moves);
  // The die starts on the top-left triangle; tap its right-hand neighbour, cell (1, 0).
  const p = await page.evaluate(() =>
    (window.__esr as { cellCenter(x: number, y: number): { x: number; y: number } }).cellCenter(
      1,
      0,
    ),
  );
  const box = (await page.locator('.stage-canvas').boundingBox())!;
  const k = box.width / 340;
  await page.mouse.click(box.x + p.x * k, box.y + p.y * k);
  await expect.poll(moves).toBe(1);
  await page.getByTestId('undo').click();
  await expect.poll(moves).toBe(0);
});

test('every button is at least 44 px, on a level and on the map', async ({ page }) => {
  for (const url of ['/?level=3', '/']) {
    if (url === '/')
      await page.evaluate(() =>
        localStorage.setItem(
          'esr-save',
          JSON.stringify({
            version: 1,
            levels: { '1-01': { stars: 3, bestMoves: 7, completions: 1, fp: 'x' } },
            seen: { 'road:1': true },
            settings: {},
          }),
        ),
      );
    await page.goto(url);
    await page.waitForTimeout(300);
    for (const b of await page.locator('button:visible').all()) {
      const r = (await b.boundingBox())!;
      expect([await b.getAttribute('data-testid'), Math.min(r.width, r.height) >= 44]).toEqual([
        await b.getAttribute('data-testid'),
        true,
      ]);
    }
  }
});

declare global {
  interface Window {
    __esr?: unknown;
  }
}
