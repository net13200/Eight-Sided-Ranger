/** Every level's par route, played with the arrow keys, wins ★★★ in the browser. */
import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parseLevel, startState } from '../../src/engine';
import { solve } from '../../src/solver/solve';

const KEY = { N: 'ArrowUp', E: 'ArrowRight', S: 'ArrowDown', W: 'ArrowLeft' } as const;
const files = readdirSync('src/levels/data')
  .filter((f) => f.endsWith('.txt'))
  .sort();

test.describe('par routes', () => {
  files.forEach((f, i) => {
    test(f, async ({ page }, info) => {
      test.skip(info.project.name !== 'phone-portrait', 'one size is enough');
      const lv = parseLevel(readFileSync(`src/levels/data/${f}`, 'utf8'));
      const path = solve(startState(lv), { maxNodes: 400_000 }).path;
      await page.goto(`/?level=${i + 1}`);
      await page.waitForFunction(() => window.__esr);
      for (let k = 0; k < 2; k++)
        if (await page.getByTestId('lesson-ok').isVisible())
          await page.getByTestId('lesson-ok').click();
      for (const d of path) await page.keyboard.press(KEY[d]);
      await expect(page.getByTestId('won')).toBeVisible();
      await expect(page.getByTestId('stars')).toHaveText('★★★');
    });
  });
});
