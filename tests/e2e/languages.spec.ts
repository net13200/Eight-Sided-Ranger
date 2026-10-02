/** Translations in the browser: a chosen language shows, and long text still fits. */
import { expect, test } from '@playwright/test';
import { LANGS } from '../../src/i18n';

const saveWith = (lang: string) =>
  JSON.stringify({
    version: 1,
    levels: {},
    seen: {},
    settings: { muted: true, lang, reducedMotion: true },
    daily: { results: {}, streak: 0, bestStreak: 0, lastDate: null },
  });

for (const { id } of LANGS) {
  test(`${id}: the longest lesson card fits on the stage, button and all`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'phone-portrait', 'one size is enough');
    await page.addInitScript((s) => localStorage.setItem('esr-save', s), saveWith(id));
    await page.goto('/?level=10'); // the Old Bear's lesson: the longest
    await expect(page.getByTestId('lesson-ok')).toBeVisible();
    const box = await page.getByTestId('lesson').evaluate((el) => {
      const card = el as HTMLElement;
      return { top: card.offsetTop, bottom: card.offsetTop + card.offsetHeight };
    });
    expect(box.top).toBeGreaterThanOrEqual(50);
    expect(box.bottom).toBeLessThanOrEqual(480);
  });
}

test('choosing a language in Settings changes the game', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone-portrait', 'one size is enough');
  // English to start with, and one level played (so the title screen says Continue).
  const save = JSON.parse(saveWith('en'));
  save.levels = { '1-01': { stars: 3, bestMoves: 3, completions: 1 } };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('esr-save', s);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));
  await page.goto('/');
  await page.getByTestId('settings').click();
  await page.getByTestId('setting-lang').selectOption('fr');
  await expect(page.getByTestId('settings-sheet').locator('h2')).toHaveText('Réglages');
  await expect(page.getByTestId('play')).toContainText('Continuer');
});
