/**
 * Stars are about moves only: ★★★ at par or better, ★★ within a few moves of
 * par, ★ for finishing. HP doesn't cost stars. Pure.
 */

/** Most moves that still earn ★★: par plus a quarter (at least 2 extra moves). */
export function twoStarLimit(par: number): number {
  return par + Math.max(2, Math.ceil(par / 4));
}

export function starsFor(moves: number, par: number | undefined): 1 | 2 | 3 {
  if (par === undefined) return 3;
  return moves <= par ? 3 : moves <= twoStarLimit(par) ? 2 : 1;
}
