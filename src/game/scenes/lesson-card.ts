/**
 * The lesson card over the board: the text types itself out, and play waits
 * for "Got it". A tap while it's typing shows the rest at once.
 */
import type { Lesson } from '../lessons';
import { el, place } from '../ui';
import { t } from '../../i18n';

/** Characters per second while typing. */
const CPS = 45;

export class LessonCard {
  private root: HTMLElement | null = null;
  private typed: HTMLElement | null = null;
  private button: HTMLButtonElement | null = null;
  private shown = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** The lesson, translated. */
  private readonly lesson: Lesson;

  constructor(
    lesson: Lesson,
    private readonly onClose: () => void,
    private readonly instant: boolean,
  ) {
    this.lesson = { title: t(lesson.title), text: t(lesson.text) };
  }

  /**
   * Keeps the card on the stage: a long lesson (some languages run long)
   * moves up, and if it still doesn't fit, its text gets a little smaller.
   * The whole text is laid out from the start (the untyped rest is only
   * hidden), so its size only changes when it is first laid out.
   */
  private fit(y: number): void {
    if (!this.root?.offsetHeight) return;
    const top = 54;
    const bottom = 474;
    this.root.style.top = `${y}px`;
    if (this.root.offsetHeight > bottom - top) this.root.classList.add('long');
    const h = this.root.offsetHeight;
    if (y + h > bottom) this.root.style.top = `${Math.max(top, bottom - h)}px`;
  }

  get typing(): boolean {
    return this.shown < this.lesson.text.length;
  }

  open(ui: HTMLElement, y: number): void {
    const title = el('h2', { text: this.lesson.title });
    title.id = 'lesson-title';
    // Screen readers get the whole text at once; the typed copy is visual only.
    const full = el('span', { className: 'sr-only', text: this.lesson.text });
    this.typed = el('span', {});
    this.typed.setAttribute('aria-hidden', 'true');
    this.button = el('button', {
      className: 'btn primary',
      testId: 'lesson-ok',
      text: t('Got it'),
      onClick: () => this.advance(),
    });
    this.root = el('div', { className: 'sheet lesson', testId: 'lesson' }, [
      el('small', { className: 'lesson-tag', text: t('Lesson') }),
      title,
      el('p', {}, [full, this.typed]),
      this.button,
    ]);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'lesson-title');
    // Tapping the card (not just the button) also finishes the typing.
    this.root.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.typing) this.finishTyping();
    });
    place(this.root, 22, y, 296, 0);
    this.root.style.height = 'auto';
    ui.append(this.root);
    // Measured once it's laid out (the stage may not be in the page yet).
    const root = this.root;
    if (typeof ResizeObserver !== 'undefined') {
      let fitting = false;
      new ResizeObserver(() => {
        if (fitting) return;
        fitting = true;
        this.fit(y);
        fitting = false;
      }).observe(root);
    }
    if (this.instant) this.finishTyping();
    else {
      this.render();
      this.timer = setInterval(() => {
        this.shown = Math.min(this.lesson.text.length, this.shown + 1);
        this.render();
        if (!this.typing) this.stopTimer();
      }, 1000 / CPS);
    }
    this.button.focus();
  }

  /** "Got it": finish typing first, then close. */
  advance(): void {
    if (this.typing) this.finishTyping();
    else this.close();
  }

  close(): void {
    this.stopTimer();
    this.root?.remove();
    this.root = null;
    this.onClose();
  }

  private finishTyping(): void {
    this.shown = this.lesson.text.length;
    this.stopTimer();
    this.render();
  }

  private render(): void {
    if (!this.typed || !this.button) return;
    const text = this.lesson.text;
    // The untyped rest is kept (invisible) so the card never changes size.
    this.typed.replaceChildren(
      text.slice(0, this.shown),
      el('span', { className: 'lesson-rest', text: text.slice(this.shown) }),
    );
    this.button.classList.toggle('waiting', this.typing);
  }

  private stopTimer(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
