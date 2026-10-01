/**
 * A plain list of levels with their stars: a stand-in for the world map
 * until the map exists. Every level is open, for playtesting.
 */
import type { Game } from '../game';
import { el, place } from '../ui';
import { t } from '../../i18n';

export function openLevelList(game: Game, ui: HTMLElement, onClose: () => void): HTMLElement {
  const close = () => {
    sheet.remove();
    onClose();
  };
  const buttons = game.levels.map((lv, i) => {
    const stars = game.save.data.levels[lv.id]?.stars ?? 0;
    return el(
      'button',
      {
        className: 'btn level-row',
        testId: `level-${i + 1}`,
        label: t('Level {n}: {name}', { n: i + 1, name: t(lv.name) }),
        onClick: () => game.goPlay(i),
      },
      [
        el('span', { text: `${i + 1}. ${t(lv.name)}` }),
        el('small', { text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      ],
    );
  });
  const sheet = place(
    el('div', { className: 'sheet level-list', testId: 'level-list' }, [
      el('h2', { text: t('The Edgewood') }),
      el('div', { className: 'level-rows' }, buttons),
      el('button', {
        className: 'btn',
        testId: 'level-list-close',
        text: t('Close'),
        onClick: close,
      }),
    ]),
    16,
    56,
    308,
    418,
  );
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  ui.append(sheet);
  buttons[0]?.focus();
  return sheet;
}
