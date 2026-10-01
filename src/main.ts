/** Entry point: wires the platform, stage, input and loop to the game. */
import { Game } from './game/game';
import { bindInput } from './game/input';
import { Loop } from './game/loop';
import { autoFitLabels } from './game/ui';
import { center } from './game/view/board';
import { Stage } from './game/view/stage';
import { loadLang } from './i18n';
import { createBrowserPlatform } from './platform/browser';
import { runSplash } from './splash';
import { VERSION_LABEL } from './version';
import './style.css';

runSplash();

const params = new URLSearchParams(location.search);

const platform = createBrowserPlatform();
const stage = new Stage(document.getElementById('app')!);
autoFitLabels(stage.ui);
const game = new Game(stage, platform);

bindInput(
  { surface: stage.canvas, toLogical: (x, y) => stage.toLogical(x, y) },
  (cmd) => game.command(cmd),
  () => game.audio.unlock(),
);
// The board's focus ring is for keyboard players only.
window.addEventListener('keydown', () => document.body.classList.add('kbd'), true);
window.addEventListener('pointerdown', () => document.body.classList.remove('kbd'), true);
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

const levelParam = Number(params.get('level'));
if (levelParam >= 1) game.goPlay(levelParam - 1, { story: false });
// A first-time player goes from the logo straight into the story and level 1; everyone else to the title screen.
else if (Object.keys(game.save.data.levels).length === 0) game.goPlay(0);
else game.goMenu();
loop.start();
platform.ads.loaded();

declare global {
  interface Window {
    __esr?: unknown;
  }
}
window.__esr = {
  version: VERSION_LABEL,
  scene: () => game.scene?.name,
  /** A board cell's centre, in logical stage units (for tests that tap the board). */
  cellCenter: (x: number, y: number) => center(x, y),
  audioRunning: () => game.audio.running,
  music: () => game.audio.currentTrack,
  state: () =>
    game.scene && 'state' in game.scene ? (game.scene as { state: unknown }).state : null,
};
