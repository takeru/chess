import { type Color, type Piece, type PieceType, type Position, parseSquare, squareName } from './types.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class FenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FenError';
  }
}

const PIECE_CHARS = 'pnbrqk';

export function pieceToChar(piece: Piece): string {
  return piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
}

export function parseFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4 || parts.length > 6) {
    throw new FenError('FEN must have 4 to 6 space separated fields');
  }
  const [placement, turn, castling, ep, halfmove = '0', fullmove = '1'] = parts as [
    string,
    string,
    string,
    string,
    string?,
    string?,
  ];

  const board: (Piece | null)[] = new Array(64).fill(null);
  const rows = placement.split('/');
  if (rows.length !== 8) throw new FenError('Piece placement must have 8 ranks');
  rows.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
      } else {
        const type = ch.toLowerCase();
        if (!PIECE_CHARS.includes(type)) throw new FenError(`Invalid piece character "${ch}"`);
        if (file > 7) throw new FenError(`Rank ${rank + 1} has too many squares`);
        board[rank * 8 + file] = {
          color: ch === type ? 'b' : 'w',
          type: type as PieceType,
        };
        file += 1;
      }
    }
    if (file !== 8) throw new FenError(`Rank ${rank + 1} must describe exactly 8 squares`);
  });

  if (turn !== 'w' && turn !== 'b') throw new FenError('Side to move must be "w" or "b"');
  if (!/^(-|K?Q?k?q?)$/.test(castling) || castling === '') {
    throw new FenError('Invalid castling field');
  }

  let epSquare: number | null = null;
  if (ep !== '-') {
    epSquare = parseSquare(ep);
    if (epSquare === null || (ep[1] !== '3' && ep[1] !== '6')) {
      throw new FenError('Invalid en passant square');
    }
  }

  const halfmoveClock = Number(halfmove);
  const fullmoveNumber = Number(fullmove);
  if (!Number.isInteger(halfmoveClock) || halfmoveClock < 0) throw new FenError('Invalid halfmove clock');
  if (!Number.isInteger(fullmoveNumber) || fullmoveNumber < 1) throw new FenError('Invalid fullmove number');

  for (const color of ['w', 'b'] as Color[]) {
    const kings = board.filter((p) => p?.type === 'k' && p.color === color).length;
    if (kings !== 1) throw new FenError(`${color === 'w' ? 'White' : 'Black'} must have exactly one king`);
  }
  for (let file = 0; file < 8; file++) {
    if (board[file]?.type === 'p' || board[56 + file]?.type === 'p') {
      throw new FenError('Pawns cannot stand on the first or last rank');
    }
  }

  return {
    board,
    turn,
    castling: {
      K: castling.includes('K') && board[4]?.type === 'k' && board[4].color === 'w' && board[7]?.type === 'r' && board[7].color === 'w',
      Q: castling.includes('Q') && board[4]?.type === 'k' && board[4].color === 'w' && board[0]?.type === 'r' && board[0].color === 'w',
      k: castling.includes('k') && board[60]?.type === 'k' && board[60].color === 'b' && board[63]?.type === 'r' && board[63].color === 'b',
      q: castling.includes('q') && board[60]?.type === 'k' && board[60].color === 'b' && board[56]?.type === 'r' && board[56].color === 'b',
    },
    epSquare,
    halfmoveClock,
    fullmoveNumber,
  };
}

export function toFen(pos: Position): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = pos.board[rank * 8 + file];
      if (piece) {
        if (empty) row += empty;
        empty = 0;
        row += pieceToChar(piece);
      } else {
        empty += 1;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  const { K, Q, k, q } = pos.castling;
  const castling = (K ? 'K' : '') + (Q ? 'Q' : '') + (k ? 'k' : '') + (q ? 'q' : '') || '-';
  const ep = pos.epSquare === null ? '-' : squareName(pos.epSquare);
  return `${rows.join('/')} ${pos.turn} ${castling} ${ep} ${pos.halfmoveClock} ${pos.fullmoveNumber}`;
}
