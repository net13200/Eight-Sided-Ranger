/** Every level's par route, played with the arrow keys, wins ★★★ in the browser (a gauntlet floor by floor). */
import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parseLevel, startState } from '../../src/engine';
import { withFloors } from '../../src/levels/floors';
import { solve } from '../../src/solver/solve';

const KEY = { N: 'ArrowUp', E: 'ArrowRight', S: 'ArrowDown', W: 'ArrowLeft' } as const;
const read = (d: string) =>
  Object.fromEntries(
    readdirSync(d)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => [`${d}/${f}`, readFileSync(`${d}/${f}`, 'utf8')]),
  );
const levels = withFloors(
  Object.values(read('src/levels/data'))
    .map((text) => parseLevel(text))
    .sort((a, b) => a.id.localeCompare(b.id)),
  read('src/levels/gauntlets'),
);

test.describe('par routes', () => {
  levels.forEach((lv, i) => {
    test(lv.id, async ({ page }, info) => {
      test.skip(info.project.name !== 'phone-portrait', 'one size is enough');
      await page.goto(`/?level=${i + 1}`);
      await page.waitForFunction(() => window.__esr);
      const floors = [lv, ...(lv.floors ?? [])];
      for (let f = 0; f < floors.length; f++) {
        for (let k = 0; k < 2; k++)
          if (await page.getByTestId('lesson-ok').isVisible())
            await page.getByTestId('lesson-ok').click();
        const path = solve(startState(floors[f]!), { maxNodes: 400_000 }).path;
        for (const d of path) await page.keyboard.press(KEY[d]);
        await expect(page.getByTestId('won')).toBeVisible();
        if (f + 1 < floors.length) await page.getByTestId('next').click();
      }
      await expect(page.getByTestId('stars')).toHaveText('★★★');
    });
  });
});
