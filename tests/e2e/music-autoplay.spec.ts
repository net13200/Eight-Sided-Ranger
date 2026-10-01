import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { asReturningPlayer } from './returning';

const running = (page: Page) =>
  page.evaluate(() => (window.__esr as { audioRunning(): boolean }).audioRunning());
const localChromium = '/opt/pw-browsers/chromium';
const base = existsSync(localChromium) ? { executablePath: localChromium } : {};

// A browser that allows sound on load (e.g. an installed app): no tap needed.
test.use({ launchOptions: { ...base, args: ['--autoplay-policy=no-user-gesture-required'] } });

test.beforeEach(({ page }) => asReturningPlayer(page));

test('music plays on the title screen with no interaction at all', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => running(page)).toBe(true);
});

test('the glade tune on the title screen, the stones tune in a level', async ({ page }) => {
  const track = () => page.evaluate(() => (window.__esr as { music(): string }).music());
  await page.goto('/');
  await expect.poll(track).toBe('glade');
  await page.goto('/?level=2');
  await expect.poll(track).toBe('stones');
});
