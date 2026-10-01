import type { Command } from '../input';
import type { BackdropTheme, SideRenderer } from '../view/backdrop';

export interface Scene {
  readonly name: string;
  /** Build DOM UI into `ui` (cleared automatically on exit). */
  enter(ui: HTMLElement): void;
  exit?(): void;
  update?(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** True when only gentle idle animation is on screen: the game redraws at half rate. */
  idle?(): boolean;
  command?(cmd: Command): void;
  /** The scenery around the game on wide screens. */
  readonly backdrop?: BackdropTheme;
  /** Fills the side panels on wide screens (see view/backdrop.ts). */
  renderSide?: SideRenderer;
}
