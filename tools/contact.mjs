/**
 * A contact sheet of levels at phone size: one screenshot per level, the
 * lesson card closed (needs vite preview on :4173).
 *
 *   node tools/contact.mjs 1 10 out-dir
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [from = '1', to = '10', out = 'screens/levels'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 340, height: 480 }, deviceScaleFactor: 2 });
for (let n = Number(from); n <= Number(to); n++) {
  await page.goto(`http://localhost:4173/?level=${n}`);
  await page.waitForFunction(() => window.__esr);
  for (let i = 0; i < 2; i++)
    if (await page.getByTestId('lesson-ok').isVisible())
      await page.getByTestId('lesson-ok').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${String(n).padStart(2, '0')}.png` });
}
await browser.close();
