/** Entry point: wires the platform, stage, input and loop to the game. */
import { Game } from './game/game';
import { bindInput } from './game/input';
import { Loop } from './game/loop';
import { autoFitLabels } from './game/ui';
import { Stage } from './game/view/stage';
import { loadLang } from './i18n';
import { createBrowserPlatform } from './platform/browser';
import { createPortalPlatform } from './platform/portal';
import { IS_PORTAL, PORTAL, PORTAL_OPTIONS } from './platform/target';
import { runSplash } from './splash';
import { VERSION_LABEL } from './version';
import './style.css';

if (!IS_PORTAL || PORTAL_OPTIONS.splash) runSplash();
else document.getElementById('splash')?.remove();

const params = new URLSearchParams(location.search);
// Developer shortcuts (?level, the test hook) stay out of portal builds, except for automated test browsers.
const devTools = !IS_PORTAL || navigator.webdriver;

const platform = PORTAL ? createPortalPlatform(PORTAL) : createBrowserPlatform();
const stage = new Stage(document.getElementById('app')!);
autoFitLabels(stage.ui);
const game = new Game(stage, platform);

bindInput(
  { surface: stage.canvas, toLogical: (x, y) => stage.toLogical(x, y) },
  (cmd) => game.command(cmd),
  () => game.audio.unlock(),
);
for (const t of ['pointerdown', 'touchend', 'click', 'keydown'] as const)
  window.addEventListener(t, () => game.audio.unlock(), true);
window.addEventListener('pageshow', () => game.audio.resume());

const loop = new Loop(
  (dt) => game.update(dt),
  () => void game.render(),
);
platform.onVisibilityChange((visible) => {
  loop.setPaused(!visible);
  if (visible) game.audio.resume();
  else game.audio.suspend();
});

await loadLang(game.save.data.settings.lang);

const levelParam = devTools ? Number(params.get('level')) : 0;
game.goPlay(levelParam >= 1 ? levelParam - 1 : 0);
loop.start();
platform.ads.loaded();

declare global {
  interface Window {
    __esr?: unknown;
  }
}
if (devTools)
  window.__esr = {
    version: VERSION_LABEL,
    scene: () => game.scene?.name,
    state: () =>
      game.scene && 'state' in game.scene ? (game.scene as { state: unknown }).state : null,
  };
