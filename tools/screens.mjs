/**
 * Screenshots at the sizes that matter: phones (portrait, small, landscape),
 * a 16:9 desktop window, and CrazyGames' smallest iframe at DPR 1.
 *
 *   npx vite build && npx vite preview --port 4173 &
 *   node tools/screens.mjs [url-suffix] [out-dir]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const SIZES = [
  { name: 'phone', width: 412, height: 915, dpr: 2.6, mobile: true },
  { name: 'phone-small', width: 375, height: 667, dpr: 2, mobile: true },
  { name: 'phone-landscape', width: 915, height: 412, dpr: 2.6, mobile: true },
  { name: 'desktop-16x9', width: 1280, height: 720, dpr: 1, mobile: false },
  { name: 'crazygames-800x450', width: 800, height: 450, dpr: 1, mobile: false },
];
const suffix = process.argv[2] ?? '';
const out = process.argv[3] ?? 'screens';
const actions = process.env.KEYS ?? '';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const s of SIZES) {
  const page = await browser.newPage({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.dpr,
    isMobile: s.mobile,
    hasTouch: s.mobile,
  });
  await page.goto(`http://localhost:4173/${suffix}`);
  await page.waitForFunction(() => window.__esr);
  await page.waitForTimeout(300);
  for (const k of actions.split(',').filter(Boolean)) {
    if (k.startsWith('click:')) await page.getByTestId(k.slice(6)).click();
    else await page.keyboard.press(k);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${s.name}.png` });
  await page.close();
}
await browser.close();
console.log(`screenshots in ${out}/`);
