import { applyMove, isInCheck, legalMoves } from './movegen.js';
import { type Move, type PieceType, type Position, fileOf, rankOf } from './types.js';

const VALUES: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100_000;

/** Small positional bonus: knights and bishops like the centre, pawns like to advance. */
function positional(type: PieceType, sq: number, white: boolean): number {
  const file = fileOf(sq);
  const rank = white ? rankOf(sq) : 7 - rankOf(sq);
  const centre = 3.5 - Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5));
  switch (type) {
    case 'p':
      return rank * 6 + (file >= 2 && file <= 5 ? centre * 4 : 0);
    case 'n':
    case 'b':
      return centre * 10;
    case 'q':
      return centre * 3;
    case 'k':
      return rank === 0 ? 10 : -rank * 10;
    default:
      return 0;
  }
}

/** Static evaluation from the point of view of the side to move. */
export function evaluate(pos: Position): number {
  let score = 0;
  pos.board.forEach((p, sq) => {
    if (!p) return;
    const value = VALUES[p.type] + positional(p.type, sq, p.color === 'w');
    score += p.color === 'w' ? value : -value;
  });
  return pos.turn === 'w' ? score : -score;
}

function orderMoves(moves: Move[]): Move[] {
  const score = (m: Move) =>
    (m.captured ? 10 * VALUES[m.captured] - VALUES[m.piece] : 0) + (m.promotion ? VALUES[m.promotion] : 0);
  return moves.sort((a, b) => score(b) - score(a));
}

function negamax(pos: Position, depth: number, alpha: number, beta: number, ply: number): number {
  const moves = legalMoves(pos);
  if (moves.length === 0) return isInCheck(pos) ? -MATE + ply : 0;
  if (depth === 0) return evaluate(pos);
  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    const score = -negamax(applyMove(pos, move), depth - 1, -beta, -alpha, ply + 1);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

export interface SearchOptions {
  /** Search depth in plies (default 3). */
  depth?: number;
  /** Source of randomness used to break ties between equally good moves. */
  random?: () => number;
}

/** Picks a move with a fixed-depth alpha-beta search. Returns null if there are no legal moves. */
export function findBestMove(pos: Position, { depth = 3, random = Math.random }: SearchOptions = {}): Move | null {
  const moves = orderMoves(legalMoves(pos));
  if (moves.length === 0) return null;
  let bestScore = -Infinity;
  let best: Move[] = [];
  for (const move of moves) {
    const score = -negamax(applyMove(pos, move), depth - 1, -Infinity, -bestScore + 1, 1);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[Math.floor(random() * best.length)]!;
}
