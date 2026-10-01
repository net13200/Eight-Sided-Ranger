/** Playing a level in the browser: lesson card, moves, winning with stars. */
import { expect, test } from '@playwright/test';

test('the lesson card, then the par route wins ★★★', async ({ page }) => {
  await page.goto('/?level=2');
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
  // The die starts on the top-left triangle; its right-hand neighbour is at board cell (1, 0).
  const box = (await page.locator('.stage-canvas').boundingBox())!;
  const k = box.width / 340;
  await page.mouse.click(box.x + (10 + 32 + 32) * k, box.y + (56 + 18) * k);
  await expect.poll(moves).toBe(1);
  await page.getByTestId('undo').click();
  await expect.poll(moves).toBe(0);
});

test('every button is at least 44 px', async ({ page }) => {
  await page.goto('/?level=3');
  for (const b of await page.locator('button:visible').all()) {
    const r = (await b.boundingBox())!;
    expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(44);
  }
});

declare global {
  interface Window {
    __esr?: unknown;
  }
}
