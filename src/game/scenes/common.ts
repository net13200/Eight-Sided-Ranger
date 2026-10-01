import type { Game } from '../game';
import { icon } from '../ui';
import { t } from '../../i18n';

/** A sound toggle that keeps its icon in sync with the setting. */
export function muteButton(game: Game): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn';
  b.dataset.testid = 'mute';
  const label = document.createElement('span');
  const sync = () => {
    b.replaceChildren(icon(game.muted ? 'muted' : 'sound'), label);
    label.textContent = t(game.muted ? 'Muted' : 'Sound');
    b.setAttribute('aria-label', t(game.muted ? 'Unmute sound' : 'Mute sound'));
    b.setAttribute('aria-pressed', String(game.muted));
  };
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    game.toggleMute();
  });
  game.stage.root.addEventListener('esr:settings', sync);
  sync();
  return b;
}
