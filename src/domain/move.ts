/**
 * Move representation and related types
 */

import { Piece } from './piece';
import { Position, PositionUtils, SpecialMoveType, PieceType } from './types';

/**
 * Represents a chess move
 */
export class Move {
  constructor(
    public readonly from: Position,
    public readonly to: Position,
    public readonly piece: Piece,
    public readonly capturedPiece?: Piece,
    public readonly specialMove: SpecialMoveType = SpecialMoveType.None,
    public readonly promotionType?: PieceType
  ) {}

  /**
   * Get algebraic notation for this move (simplified)
   */
  toAlgebraic(): string {
    const pieceNotation = this.piece.getNotation();
    const fromSquare = PositionUtils.toAlgebraic(this.from);
    const toSquare = PositionUtils.toAlgebraic(this.to);
    const capture = this.capturedPiece ? 'x' : '';

    if (this.specialMove === SpecialMoveType.CastleKingside) {
      return 'O-O';
    }
    if (this.specialMove === SpecialMoveType.CastleQueenside) {
      return 'O-O-O';
    }

    let notation = pieceNotation + fromSquare + capture + toSquare;

    if (this.promotionType) {
      notation += '=' + new Piece(this.promotionType, this.piece.color, this.to).getNotation();
    }

    return notation;
  }

  /**
   * Check if this is a capture move
   */
  isCapture(): boolean {
    return this.capturedPiece !== undefined;
  }

  /**
   * Check if this is a castling move
   */
  isCastling(): boolean {
    return (
      this.specialMove === SpecialMoveType.CastleKingside ||
      this.specialMove === SpecialMoveType.CastleQueenside
    );
  }

  /**
   * Check if this is an en passant move
   */
  isEnPassant(): boolean {
    return this.specialMove === SpecialMoveType.EnPassant;
  }

  /**
   * Check if this is a pawn promotion move
   */
  isPromotion(): boolean {
    return this.specialMove === SpecialMoveType.PawnPromotion;
  }

  /**
   * Clone this move
   */
  clone(): Move {
    return new Move(
      { ...this.from },
      { ...this.to },
      this.piece.clone(),
      this.capturedPiece?.clone(),
      this.specialMove,
      this.promotionType
    );
  }
}

/**
 * Result of attempting to make a move
 */
export interface MoveResult {
  readonly success: boolean;
  readonly move?: Move;
  readonly newState?: any; // GameState (avoiding circular dependency)
  readonly error?: string;
  readonly isCheck?: boolean;
  readonly isCheckmate?: boolean;
  readonly isStalemate?: boolean;
}

/**
 * Move validation result
 */
export interface MoveValidation {
  readonly valid: boolean;
  readonly reason?: string;
}
