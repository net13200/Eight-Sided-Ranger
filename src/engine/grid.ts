/**
 * The board: `width` triangles per row, `height` rows. Cell (x, y) points up
 * when (x + y) is even. Every cell has three edges, so three moves: left (W)
 * and right (E) stay in the row; the flat edge leads down (S) from an up
 * triangle and up (N) from a down triangle. Rows are straight lines.
 */
import type { Dir } from './die';

export interface Pos {
  readonly x: number;
  readonly y: number;
}

export const isUp = (x: number, y: number): boolean => (x + y) % 2 === 0;

/** The neighbour across an edge, or null when that edge isn't there (N from an up cell, S from a down cell). */
export function neighbor(x: number, y: number, dir: Dir): Pos | null {
  if (dir === 'E') return { x: x + 1, y };
  if (dir === 'W') return { x: x - 1, y };
  if (dir === 'S') return isUp(x, y) ? { x, y: y + 1 } : null;
  return isUp(x, y) ? null : { x, y: y - 1 };
}

/** The three moves possible from a cell. */
export function movesFrom(x: number, y: number): Dir[] {
  return isUp(x, y) ? ['W', 'E', 'S'] : ['W', 'E', 'N'];
}

/** Two cells share an edge. */
export function adjacent(ax: number, ay: number, bx: number, by: number): boolean {
  if (ay === by) return Math.abs(ax - bx) === 1;
  if (ax !== bx || Math.abs(ay - by) !== 1) return false;
  // Vertical neighbours share the flat edge: the upper one points up.
  return isUp(ax, Math.min(ay, by));
}
