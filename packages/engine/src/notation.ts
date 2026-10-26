import { applyMove, isInCheck, legalMoves } from './movegen.js';
import { type Move, type Position, fileOf, rankOf, squareName } from './types.js';

export function moveToUci(move: Move): string {
  return squareName(move.from) + squareName(move.to) + (move.promotion ?? '');
}

/** Standard Algebraic Notation for a legal `move` in `pos`, including check/mate suffix. */
export function moveToSan(pos: Position, move: Move, legal: Move[] = legalMoves(pos)): string {
  let san: string;
  if (move.kind === 'castle-king') {
    san = 'O-O';
  } else if (move.kind === 'castle-queen') {
    san = 'O-O-O';
  } else if (move.piece === 'p') {
    san = move.captured ? `${squareName(move.from)[0]}x` : '';
    san += squareName(move.to);
    if (move.promotion) san += `=${move.promotion.toUpperCase()}`;
  } else {
    const rivals = legal.filter(
      (m) => m.piece === move.piece && m.to === move.to && m.from !== move.from,
    );
    let disambiguation = '';
    if (rivals.length > 0) {
      const sameFile = rivals.some((m) => fileOf(m.from) === fileOf(move.from));
      const sameRank = rivals.some((m) => rankOf(m.from) === rankOf(move.from));
      const from = squareName(move.from);
      if (!sameFile) disambiguation = from[0]!;
      else if (!sameRank) disambiguation = from[1]!;
      else disambiguation = from;
    }
    san = move.piece.toUpperCase() + disambiguation + (move.captured ? 'x' : '') + squareName(move.to);
  }

  const next = applyMove(pos, move);
  if (isInCheck(next)) san += legalMoves(next).length === 0 ? '#' : '+';
  return san;
}

export class IllegalMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalMoveError';
  }
}

const SAN_PATTERN = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([QRBN]))?$/;

function stripAnnotations(san: string): string {
  return san
    .trim()
    .replace(/[+#!?]+$/, '')
    .replace(/\s*e\.p\.$/, '');
}

/**
 * Resolves a move written in UCI (`e2e4`, `e7e8q`) or SAN (`e4`, `Nxf3`, `O-O`, `e8=Q+`)
 * to a legal move in `pos`. Throws {@link IllegalMoveError} if it is not legal.
 */
export function parseMove(pos: Position, input: string, legal: Move[] = legalMoves(pos)): Move {
  const text = input.trim();
  if (!text) throw new IllegalMoveError('Empty move');

  const uci = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(text);
  if (uci) {
    const candidate = text.toLowerCase();
    const found = legal.find((m) => moveToUci(m) === candidate);
    if (found) return found;
    if (legal.some((m) => moveToUci(m).startsWith(candidate) && m.promotion)) {
      throw new IllegalMoveError(`Move ${text} needs a promotion piece, e.g. ${candidate}q`);
    }
    throw new IllegalMoveError(`Illegal move: ${text}`);
  }

  const san = stripAnnotations(text);
  let matches: Move[];
  if (/^(O-O|0-0)$/.test(san)) {
    matches = legal.filter((m) => m.kind === 'castle-king');
  } else if (/^(O-O-O|0-0-0)$/.test(san)) {
    matches = legal.filter((m) => m.kind === 'castle-queen');
  } else {
    const parts = SAN_PATTERN.exec(san);
    if (!parts) throw new IllegalMoveError(`Unrecognised move: ${text} (use SAN like Nf3 or UCI like g1f3)`);
    const [, pieceLetter, fromFile, fromRank, to, promotion] = parts;
    const piece = (pieceLetter ?? 'p').toLowerCase();
    matches = legal.filter((m) => {
      const from = squareName(m.from);
      return (
        m.piece === piece &&
        squareName(m.to) === to &&
        // A pawn move without a source file is a push, never a capture.
        (fromFile ? from[0] === fromFile : piece !== 'p' || from[0] === to![0]) &&
        (!fromRank || from[1] === fromRank) &&
        (m.promotion ?? '') === (promotion?.toLowerCase() ?? '')
      );
    });
    if (matches.length === 0 && piece === 'p' && !promotion && legal.some((m) => m.promotion && squareName(m.to) === to)) {
      throw new IllegalMoveError(`Move ${text} needs a promotion piece, e.g. ${san}=Q`);
    }
  }
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) throw new IllegalMoveError(`Ambiguous move: ${text}`);
  throw new IllegalMoveError(`Illegal move: ${text}`);
}
