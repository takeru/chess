import { toFen } from './fen.js';
import {
  type Color,
  type Move,
  type Piece,
  type PieceType,
  type Position,
  type PromotionPiece,
  type Square,
  fileOf,
  opposite,
  rankOf,
} from './types.js';

type Delta = readonly [file: number, rank: number];

const KNIGHT_DELTAS: readonly Delta[] = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_DELTAS: readonly Delta[] = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_DIRS: readonly Delta[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: readonly Delta[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const PROMOTIONS: readonly PromotionPiece[] = ['q', 'r', 'b', 'n'];

function offset(sq: Square, [df, dr]: Delta): Square | null {
  const file = fileOf(sq) + df;
  const rank = rankOf(sq) + dr;
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return rank * 8 + file;
}

function pawnDir(color: Color): number {
  return color === 'w' ? 1 : -1;
}

export function findKing(pos: Position, color: Color): Square {
  const sq = pos.board.findIndex((p) => p?.type === 'k' && p.color === color);
  if (sq < 0) throw new Error(`No ${color} king on the board`);
  return sq;
}

/** Whether `sq` is attacked by any piece of color `by`. */
export function isSquareAttacked(board: (Piece | null)[], sq: Square, by: Color): boolean {
  // Pawns attack diagonally forward, so look one rank "behind" the target from the attacker's view.
  const dr = -pawnDir(by);
  for (const df of [-1, 1]) {
    const from = offset(sq, [df, dr]);
    const p = from === null ? null : board[from];
    if (p && p.color === by && p.type === 'p') return true;
  }
  for (const d of KNIGHT_DELTAS) {
    const from = offset(sq, d);
    const p = from === null ? null : board[from];
    if (p && p.color === by && p.type === 'n') return true;
  }
  for (const d of KING_DELTAS) {
    const from = offset(sq, d);
    const p = from === null ? null : board[from];
    if (p && p.color === by && p.type === 'k') return true;
  }
  const slide = (dirs: readonly Delta[], types: PieceType[]): boolean => {
    for (const d of dirs) {
      let cur = offset(sq, d);
      while (cur !== null) {
        const p = board[cur];
        if (p) {
          if (p.color === by && types.includes(p.type)) return true;
          break;
        }
        cur = offset(cur, d);
      }
    }
    return false;
  };
  return slide(ROOK_DIRS, ['r', 'q']) || slide(BISHOP_DIRS, ['b', 'q']);
}

export function isInCheck(pos: Position, color: Color = pos.turn): boolean {
  return isSquareAttacked(pos.board, findKing(pos, color), opposite(color));
}

/** Moves that obey piece movement rules but may leave the mover's king in check. */
export function pseudoLegalMoves(pos: Position): Move[] {
  const moves: Move[] = [];
  const us = pos.turn;
  const them = opposite(us);
  const board = pos.board;

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || piece.color !== us) continue;

    switch (piece.type) {
      case 'p': {
        const dir = pawnDir(us);
        const startRank = us === 'w' ? 1 : 6;
        const promoRank = us === 'w' ? 7 : 0;
        const addPawnMove = (to: Square, captured?: PieceType, kind: Move['kind'] = 'normal') => {
          if (rankOf(to) === promoRank) {
            for (const promotion of PROMOTIONS) {
              moves.push({ from, to, color: us, piece: 'p', kind, captured, promotion });
            }
          } else {
            moves.push({ from, to, color: us, piece: 'p', kind, captured });
          }
        };

        const one = offset(from, [0, dir]);
        if (one !== null && !board[one]) {
          addPawnMove(one);
          const two = offset(from, [0, 2 * dir]);
          if (rankOf(from) === startRank && two !== null && !board[two]) {
            moves.push({ from, to: two, color: us, piece: 'p', kind: 'double-push' });
          }
        }
        for (const df of [-1, 1]) {
          const to = offset(from, [df, dir]);
          if (to === null) continue;
          const target = board[to];
          if (target && target.color === them) {
            addPawnMove(to, target.type);
          } else if (to === pos.epSquare) {
            moves.push({ from, to, color: us, piece: 'p', kind: 'en-passant', captured: 'p' });
          }
        }
        break;
      }
      case 'n':
      case 'k': {
        for (const d of piece.type === 'n' ? KNIGHT_DELTAS : KING_DELTAS) {
          const to = offset(from, d);
          if (to === null) continue;
          const target = board[to];
          if (!target) moves.push({ from, to, color: us, piece: piece.type, kind: 'normal' });
          else if (target.color === them) {
            moves.push({ from, to, color: us, piece: piece.type, kind: 'normal', captured: target.type });
          }
        }
        if (piece.type === 'k') addCastling(pos, from, moves);
        break;
      }
      case 'b':
      case 'r':
      case 'q': {
        const dirs =
          piece.type === 'b' ? BISHOP_DIRS : piece.type === 'r' ? ROOK_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
        for (const d of dirs) {
          let to = offset(from, d);
          while (to !== null) {
            const target = board[to];
            if (!target) {
              moves.push({ from, to, color: us, piece: piece.type, kind: 'normal' });
            } else {
              if (target.color === them) {
                moves.push({ from, to, color: us, piece: piece.type, kind: 'normal', captured: target.type });
              }
              break;
            }
            to = offset(to, d);
          }
        }
        break;
      }
    }
  }
  return moves;
}

function addCastling(pos: Position, from: Square, moves: Move[]): void {
  const us = pos.turn;
  const them = opposite(us);
  const home = us === 'w' ? 4 : 60;
  if (from !== home) return;
  const board = pos.board;
  const kingSide = us === 'w' ? pos.castling.K : pos.castling.k;
  const queenSide = us === 'w' ? pos.castling.Q : pos.castling.q;
  if (!kingSide && !queenSide) return;
  if (isSquareAttacked(board, home, them)) return;

  if (
    kingSide &&
    !board[home + 1] &&
    !board[home + 2] &&
    !isSquareAttacked(board, home + 1, them) &&
    !isSquareAttacked(board, home + 2, them)
  ) {
    moves.push({ from, to: home + 2, color: us, piece: 'k', kind: 'castle-king' });
  }
  if (
    queenSide &&
    !board[home - 1] &&
    !board[home - 2] &&
    !board[home - 3] &&
    !isSquareAttacked(board, home - 1, them) &&
    !isSquareAttacked(board, home - 2, them)
  ) {
    moves.push({ from, to: home - 2, color: us, piece: 'k', kind: 'castle-queen' });
  }
}

const CASTLING_SQUARE_RIGHTS: Record<number, keyof Position['castling']> = {
  0: 'Q',
  7: 'K',
  56: 'q',
  63: 'k',
};

/** Returns the position after `move`. The input position is not modified. */
export function applyMove(pos: Position, move: Move): Position {
  const board = pos.board.slice();
  const us = move.color;
  const them = opposite(us);
  const castling = { ...pos.castling };

  board[move.from] = null;
  board[move.to] = { color: us, type: move.promotion ?? move.piece };

  if (move.kind === 'en-passant') {
    board[move.to - 8 * pawnDir(us)] = null;
  } else if (move.kind === 'castle-king') {
    board[move.from + 1] = board[move.from + 3]!;
    board[move.from + 3] = null;
  } else if (move.kind === 'castle-queen') {
    board[move.from - 1] = board[move.from - 4]!;
    board[move.from - 4] = null;
  }

  if (move.piece === 'k') {
    if (us === 'w') castling.K = castling.Q = false;
    else castling.k = castling.q = false;
  }
  for (const sq of [move.from, move.to]) {
    const right = CASTLING_SQUARE_RIGHTS[sq];
    if (right) castling[right] = false;
  }

  // Only record an en passant square when an enemy pawn could actually capture there,
  // so that otherwise identical positions compare equal for repetition.
  let epSquare: Square | null = null;
  if (move.kind === 'double-push') {
    const passed = move.from + 8 * pawnDir(us);
    const adjacent = [offset(move.to, [-1, 0]), offset(move.to, [1, 0])];
    if (adjacent.some((sq) => sq !== null && board[sq]?.type === 'p' && board[sq]?.color === them)) {
      epSquare = passed;
    }
  }

  return {
    board,
    turn: them,
    castling,
    epSquare,
    halfmoveClock: move.piece === 'p' || move.captured ? 0 : pos.halfmoveClock + 1,
    fullmoveNumber: us === 'b' ? pos.fullmoveNumber + 1 : pos.fullmoveNumber,
  };
}

export function legalMoves(pos: Position): Move[] {
  return pseudoLegalMoves(pos).filter((move) => !isInCheck(applyMove(pos, move), move.color));
}

/**
 * Identifies a position for the repetition rule: placement, side to move, castling rights,
 * and the en passant square only when an en passant capture is actually legal.
 */
export function positionKey(pos: Position): string {
  const [placement, turn, castling] = toFen(pos).split(' ');
  const epLegal = pos.epSquare !== null && legalMoves(pos).some((m) => m.kind === 'en-passant');
  return `${placement} ${turn} ${castling} ${epLegal ? pos.epSquare : '-'}`;
}

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(pos);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) nodes += perft(applyMove(pos, move), depth - 1);
  return nodes;
}
