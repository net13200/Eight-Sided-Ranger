/**
 * The title screen: Play (or Continue) in one tap, the Daily Trail, and
 * Story, How to play, Settings and Sound. First-time players never see it:
 * they go from the logo straight into the story and level 1.
 */
import { currentStreak, utcDate } from '../../meta/daily';
import { dailyOpen, districtsReached } from '../../meta/progress';
import { VERSION_LABEL } from '../../version';
import type { Game } from '../game';
import { HOW_TO_PLAY } from '../how-to-play';
import type { Command } from '../input';
import { storySoFar } from '../story';
import { el, icon, iconButton, place } from '../ui';
import { drawOctahedron } from '../view/board';
import { C } from '../view/palette';
import { muteButton } from './common';
import { DAILY_SPOT } from './map';
import type { Scene } from './scene';
import { t } from '../../i18n';

export class MenuScene implements Scene {
  readonly name = 'menu';
  readonly backdrop = 'forest' as const;
  private t = 0;
  private sheet: HTMLElement | null = null;
  private ui: HTMLElement | null = null;

  constructor(private readonly game: Game) {}

  enter(ui: HTMLElement): void {
    this.ui = ui;
    const started = Object.keys(this.game.save.data.levels).length > 0;
    const play = el('button', {
      className: 'btn primary',
      testId: 'play',
      onClick: () => (started ? this.game.goMap() : this.game.goPlay(0)),
    });
    play.replaceChildren(icon('play'), el('span', { text: t(started ? 'Continue' : 'Play') }));
    const save = this.game.save.data;
    const open = dailyOpen(this.game.levels, save);
    const date = utcDate(this.game.platform.now());
    const daily = el('button', {
      className: 'btn mode',
      testId: 'daily',
      onClick: () => this.game.goMap(DAILY_SPOT),
    });
    daily.replaceChildren(
      el('span', { text: t('Daily Trail') }),
      el('small', {
        text: !open
          ? t('Opens after the Edgewood')
          : save.daily.results[date]
            ? t('Done today · streak {n}', { n: currentStreak(save, date) })
            : t('New today'),
      }),
    );
    ui.append(
      place(play, 60, 262, 220, 62),
      place(daily, 60, 334, 220, 62),
      place(
        iconButton('book', t('Story'), () => this.openStory(), 'story'),
        4,
        414,
        64,
        62,
      ),
      place(
        iconButton('help', t('How to play'), () => this.openHowTo(), 'how-to'),
        72,
        414,
        64,
        62,
      ),
      place(
        iconButton('gear', t('Settings'), () => this.openSettings(), 'settings'),
        204,
        414,
        64,
        62,
      ),
      place(muteButton(this.game), 272, 414, 64, 62),
    );
    play.focus();
  }

  private openStory(): void {
    const reached = districtsReached(this.game.levels, this.game.save.data);
    const seen = this.game.save.data.seen;
    this.game.goStory(
      storySoFar(reached, (k) => !!seen[k]),
      () => this.game.goMenu(),
      'Close',
    );
  }

  private closeSheet(): void {
    this.sheet?.remove();
    this.sheet = null;
    this.ui?.querySelector<HTMLButtonElement>('[data-testid="play"]')?.focus();
  }

  private openSheet(id: string, title: string, body: HTMLElement[]): void {
    if (!this.ui || this.sheet) return;
    const close = el('button', {
      className: 'btn',
      testId: `${id}-close`,
      text: t('Close'),
      onClick: () => this.closeSheet(),
    });
    this.sheet = place(
      el('div', { className: `sheet ${id}`, testId: `${id}-sheet` }, [
        el('h2', { text: title }),
        ...body,
        close,
      ]),
      16,
      24,
      308,
      440,
    );
    this.sheet.setAttribute('role', 'dialog');
    this.sheet.setAttribute('aria-modal', 'true');
    this.ui.append(this.sheet);
    close.focus();
  }

  private openHowTo(): void {
    const body = el('div', { className: 'how-to-body' });
    for (const s of HOW_TO_PLAY)
      body.append(el('h3', { text: t(s.heading) }), ...s.lines.map((l) => el('p', { text: t(l) })));
    this.openSheet('how-to', t('How to play'), [body]);
  }

  private openSettings(): void {
    const toggle = (
      id: string,
      label: string,
      note: string,
      on: boolean,
      set: (v: boolean) => void,
    ) => {
      const input = el('input', { testId: id });
      input.type = 'checkbox';
      input.checked = on;
      input.addEventListener('change', () => set(input.checked));
      return el('label', { className: 'toggle' }, [
        input,
        el('span', {}, [el('strong', { text: label }), el('small', { text: note })]),
      ]);
    };
    this.openSheet('settings', t('Settings'), [
      el('div', { className: 'settings-body' }, [
        toggle(
          'setting-sound',
          t('Sound'),
          t('Sound effects and music.'),
          !this.game.muted,
          (v) => {
            if (v === this.game.muted) this.game.toggleMute();
          },
        ),
        toggle(
          'setting-motion',
          t('Reduce motion'),
          t('Fewer moving effects. Follows your device setting until you change it.'),
          this.game.reducedMotion,
          (v) => this.game.save.update((d) => (d.settings.reducedMotion = v)),
        ),
        // A language choice joins these once the translations exist.
        el('p', {
          className: 'fine',
          text: t('Progress is saved on this device only. The game collects no data.'),
        }),
        el('p', { className: 'fine', text: VERSION_LABEL }),
      ]),
    ]);
  }

  command(cmd: Command): void {
    if (this.sheet) {
      if (cmd.type === 'back') this.closeSheet();
      return;
    }
    if (cmd.type === 'confirm')
      this.ui?.querySelector<HTMLButtonElement>('[data-testid="play"]')?.click();
  }

  update(dt: number): void {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, 340, 480);
    const time = this.game.reducedMotion ? 0.6 : this.t * 0.6;
    const g = ctx.createRadialGradient(170, 120, 0, 170, 120, 150);
    g.addColorStop(0, 'rgba(156,196,122,0.25)');
    g.addColorStop(1, 'rgba(156,196,122,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 340, 300);
    // A few falling leaves that never quite land.
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 52;
      const y = 40 + ((i * 53) % 140) + Math.sin(this.t + i) * 3;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(i + Math.sin(this.t * 0.7 + i) * 0.2);
      ctx.fillStyle = i % 2 ? '#e09a3a' : '#c86a2a';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(0, -5, 6, 0);
      ctx.quadraticCurveTo(0, 5, -6, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(170, 182, 40, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    drawOctahedron(ctx, 170, 120, 54, time);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.accent;
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(t('Eight-Sided Ranger'), 170, 222, 320);
  }
}
