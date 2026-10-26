export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface Piece {
  color: Color;
  type: PieceType;
}

/**
 * Board squares are indexed 0..63 as `rank * 8 + file`,
 * so a1 = 0, h1 = 7, a8 = 56, h8 = 63.
 */
export type Square = number;

export type MoveKind = 'normal' | 'double-push' | 'en-passant' | 'castle-king' | 'castle-queen';

export interface Move {
  from: Square;
  to: Square;
  color: Color;
  piece: PieceType;
  kind: MoveKind;
  captured?: PieceType;
  promotion?: PromotionPiece;
}

export interface CastlingRights {
  /** White king side (K) */
  K: boolean;
  /** White queen side (Q) */
  Q: boolean;
  /** Black king side (k) */
  k: boolean;
  /** Black queen side (q) */
  q: boolean;
}

export interface Position {
  /** 64 entries indexed by {@link Square}. */
  board: (Piece | null)[];
  turn: Color;
  castling: CastlingRights;
  /** Square a pawn may capture onto en passant, or null. */
  epSquare: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export type GameResult = '1-0' | '0-1' | '1/2-1/2';

/** Reasons a game can end by the rules of chess alone. */
export type RuleTermination =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient_material'
  | 'fifty_move_rule'
  | 'threefold_repetition';

export type RuleStatus =
  | { over: false }
  | { over: true; result: GameResult; reason: RuleTermination };

export const FILES = 'abcdefgh';
export const RANKS = '12345678';

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function fileOf(sq: Square): number {
  return sq & 7;
}

export function rankOf(sq: Square): number {
  return sq >> 3;
}

export function squareName(sq: Square): string {
  return FILES[fileOf(sq)]! + RANKS[rankOf(sq)]!;
}

export function parseSquare(name: string): Square | null {
  if (!/^[a-h][1-8]$/.test(name)) return null;
  return (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
}
