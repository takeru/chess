/**
 * Core type definitions for the chess domain model
 */

/**
 * Chess piece colors
 */
export enum Color {
  White = 'white',
  Black = 'black',
}

/**
 * Types of chess pieces
 */
export enum PieceType {
  Pawn = 'pawn',
  Knight = 'knight',
  Bishop = 'bishop',
  Rook = 'rook',
  Queen = 'queen',
  King = 'king',
}

/**
 * Position on the chess board (0-7 for both file and rank)
 * File: a-h (0-7), Rank: 1-8 (0-7)
 */
export interface Position {
  readonly file: number; // 0-7 (a-h)
  readonly rank: number; // 0-7 (1-8)
}

/**
 * Algebraic notation for positions (e.g., "e4", "a1")
 */
export type AlgebraicNotation = string;

/**
 * Game result
 */
export enum GameResult {
  WhiteWin = 'white_win',
  BlackWin = 'black_win',
  Draw = 'draw',
  InProgress = 'in_progress',
}

/**
 * Reason for game ending
 */
export enum GameEndReason {
  Checkmate = 'checkmate',
  Stalemate = 'stalemate',
  Resignation = 'resignation',
  DrawAgreement = 'draw_agreement',
  InsufficientMaterial = 'insufficient_material',
  ThreefoldRepetition = 'threefold_repetition',
  FiftyMoveRule = 'fifty_move_rule',
  Timeout = 'timeout',
}

/**
 * Special move types
 */
export enum SpecialMoveType {
  None = 'none',
  EnPassant = 'en_passant',
  CastleKingside = 'castle_kingside',
  CastleQueenside = 'castle_queenside',
  PawnPromotion = 'pawn_promotion',
}

/**
 * Utility functions for working with positions
 */
export namespace PositionUtils {
  /**
   * Convert position to algebraic notation
   */
  export function toAlgebraic(pos: Position): AlgebraicNotation {
    const file = String.fromCharCode('a'.charCodeAt(0) + pos.file);
    const rank = (pos.rank + 1).toString();
    return file + rank;
  }

  /**
   * Convert algebraic notation to position
   */
  export function fromAlgebraic(notation: AlgebraicNotation): Position {
    if (notation.length !== 2) {
      throw new Error(`Invalid algebraic notation: ${notation}`);
    }
    const file = notation.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(notation[1], 10) - 1;

    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      throw new Error(`Invalid algebraic notation: ${notation}`);
    }

    return { file, rank };
  }

  /**
   * Check if position is within board bounds
   */
  export function isValid(pos: Position): boolean {
    return pos.file >= 0 && pos.file <= 7 && pos.rank >= 0 && pos.rank <= 7;
  }

  /**
   * Check if two positions are equal
   */
  export function equals(a: Position, b: Position): boolean {
    return a.file === b.file && a.rank === b.rank;
  }

  /**
   * Create a new position
   */
  export function create(file: number, rank: number): Position {
    return { file, rank };
  }
}

/**
 * Utility functions for working with colors
 */
export namespace ColorUtils {
  /**
   * Get the opposite color
   */
  export function opposite(color: Color): Color {
    return color === Color.White ? Color.Black : Color.White;
  }
}
