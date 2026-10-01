/**
 * The Daily Trail's notice board: today's date, the streak, how far today's
 * trail has got, and Start / Continue / Play again (practice) / Share.
 */
import { DAILY_FLOORS, currentStreak, dailyTier } from '../../meta/daily';
import { dailyOpen, districtsReached } from '../../meta/progress';
import { playFloor, startTrail, today } from '../daily-run';
import type { Game } from '../game';
import type { Command } from '../input';
import { el, icon, iconButton, place } from '../ui';
import { drawControls, sideCard, touchFirst, wrap } from '../view/backdrop';
import { C } from '../view/palette';
import { DAILY_SPOT, drawStar } from './map';
import type { Scene } from './scene';
import { shareText } from '../../meta/daily';
import { t } from '../../i18n';

export class DailyScene implements Scene {
  readonly name = 'daily';
  readonly backdrop = 'forest' as const;
  private readonly date: string;
  private readonly tier: number;
  private toast: HTMLElement | null = null;

  constructor(private readonly game: Game) {
    this.date = today(game);
    this.tier = dailyTier(this.date, districtsReached(game.levels, game.save.data));
    // Yesterday's unfinished trail is gone.
    const run = game.save.data.daily.run;
    if (run && run.date !== this.date) game.save.update((d) => (d.daily.run = null));
  }

  private get open(): boolean {
    return dailyOpen(this.game.levels, this.game.save.data);
  }

  enter(ui: HTMLElement): void {
    const d = this.game.save.data.daily;
    const done = d.results[this.date];
    const run = d.run;
    const primary = el('button', {
      className: 'btn primary',
      testId: 'daily-start',
      onClick: () => {
        if (run) playFloor(this.game, run);
        else startTrail(this.game, this.tier);
      },
    });
    const label = run
      ? t('Continue: floor {n}', { n: run.floor })
      : done
        ? t('Play again (practice)')
        : t('Start');
    primary.replaceChildren(icon('play'), el('span', { text: label }));
    primary.disabled = !this.open;
    ui.append(
      place(primary, 74, 416, 262, 60),
      place(
        iconButton('back', t('Map'), () => this.game.goMap(DAILY_SPOT), 'daily-back'),
        4,
        414,
        64,
        62,
      ),
    );
    if (done && this.open) {
      const share = el('button', {
        className: 'btn small',
        testId: 'daily-share',
        text: t('Share result'),
        onClick: () => void this.share(),
      });
      ui.append(place(share, 95, 294, 150, 60));
    }
  }

  private async share(): Promise<void> {
    const d = this.game.save.data.daily;
    const r = d.results[this.date];
    if (!r) return;
    const how = await this.game.platform.share({
      text: shareText(
        this.date,
        r,
        currentStreak(this.game.save.data, this.date),
        this.game.platform.shareUrl,
      ),
    });
    if (how === 'copied' && this.toast === null) {
      this.toast = place(el('div', { className: 'toast', text: t('Copied') }), 120, 300, 100, 32);
      this.game.stage.ui.append(this.toast);
      setTimeout(() => {
        this.toast?.remove();
        this.toast = null;
      }, 1500);
    }
  }

  command(cmd: Command): void {
    if (cmd.type === 'back') this.game.goMap(DAILY_SPOT);
    else if (cmd.type === 'confirm' && this.open)
      (
        this.game.stage.ui.querySelector('[data-testid="daily-start"]') as HTMLButtonElement
      )?.click();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, 340, 480);
    // The board: two posts, a plank frame, a parchment.
    ctx.fillStyle = '#5a3b1f';
    ctx.fillRect(40, 60, 12, 340);
    ctx.fillRect(288, 60, 12, 340);
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.roundRect(24, 40, 292, 340, 10);
    ctx.fill();
    ctx.fillStyle = '#6e4622';
    for (let y = 58; y < 370; y += 34) ctx.fillRect(30, y, 280, 2);
    ctx.fillStyle = '#efe2c0';
    ctx.beginPath();
    ctx.roundRect(42, 58, 256, 306, 6);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    for (const x of [56, 284]) {
      ctx.beginPath();
      ctx.arc(x, 70, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const ink = '#3a2614';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(t('Daily Trail'), 170, 94, 230);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#6e5233';
    ctx.fillText(this.date, 170, 118);
    if (!this.open) {
      ctx.fillStyle = ink;
      ctx.font = '15px system-ui, sans-serif';
      wrap2(
        ctx,
        t('Three new floors every day, the same for everyone. Opens after the Edgewood.'),
        196,
      );
      return;
    }
    const d = this.game.save.data.daily;
    const done = d.results[this.date];
    const run = d.run;
    // Three floors as a little trail of triangles.
    for (let i = 0; i < DAILY_FLOORS; i++) {
      const x = 110 + i * 60;
      const y = 170;
      const cleared = done || (run && run.floor > i + 1);
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.lineTo(x + 18, y + 13);
      ctx.lineTo(x - 18, y + 13);
      ctx.closePath();
      ctx.fillStyle = cleared ? '#7fa858' : run?.floor === i + 1 ? '#e2b650' : '#d8c9a2';
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.fillText(String(i + 1), x, y + 4);
      if (i < DAILY_FLOORS - 1) {
        ctx.fillStyle = '#a58a5c';
        ctx.beginPath();
        ctx.arc(x + 30, y + 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = ink;
    ctx.font = '14px system-ui, sans-serif';
    if (done) {
      for (let s = 0; s < 3; s++) drawStar(ctx, 146 + s * 24, 222, 10, s < done.stars, true);
      ctx.fillStyle = ink;
      ctx.fillText(t('{n} moves (par {par})', { n: done.moves, par: done.par }), 170, 250);
    } else if (run) {
      ctx.fillText(
        t('Floor {n}: {hp} of 3 HP, {m} moves so far', { n: run.floor, hp: run.hp, m: run.moves }),
        170,
        226,
        240,
      );
    } else {
      wrap2(
        ctx,
        t('Three floors in a row. Your HP carries over, with no healing in between.'),
        214,
      );
    }
    const streak = currentStreak(this.game.save.data, this.date);
    ctx.fillStyle = '#6e5233';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(
      t('Streak: {n} days · best {m}', { n: streak, m: d.bestStreak }),
      170,
      done ? 276 : 300,
      240,
    );
  }

  renderSide(ctx: CanvasRenderingContext2D, side: 'left' | 'right', w: number, h: number): void {
    const cardH = 200;
    ctx.save();
    ctx.translate(0, (h - cardH) / 2);
    if (side === 'left') {
      const y = sideCard(ctx, w, cardH, t('Daily Trail'));
      ctx.fillStyle = C.textDim;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      wrap(
        ctx,
        t(
          'A new trail every day (UTC). Your first finish counts for the streak; later ones are practice.',
        ),
        16,
        y + 8,
        w - 32,
        17,
      );
    } else {
      const y = sideCard(ctx, w, cardH, t('How to play'));
      drawControls(
        ctx,
        w,
        y + 4,
        touchFirst()
          ? [[t('Tap'), t('Start or continue')]]
          : [
              ['Enter', t('Start or continue')],
              ['Esc', t('Back to the map')],
            ],
      );
    }
    ctx.restore();
  }
}

function wrap2(ctx: CanvasRenderingContext2D, text: string, y: number): void {
  ctx.textAlign = 'left';
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 220 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, 170, y + i * 20));
}
