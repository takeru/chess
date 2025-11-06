/**
 * Chess piece entity
 */

import { Color, PieceType, Position } from './types';

/**
 * Represents a chess piece on the board
 */
export class Piece {
  constructor(
    public readonly type: PieceType,
    public readonly color: Color,
    public readonly position: Position,
    public readonly hasMoved: boolean = false
  ) {}

  /**
   * Create a new piece with updated position
   */
  moveTo(newPosition: Position): Piece {
    return new Piece(this.type, this.color, newPosition, true);
  }

  /**
   * Create a copy of this piece
   */
  clone(): Piece {
    return new Piece(this.type, this.color, { ...this.position }, this.hasMoved);
  }

  /**
   * Check if this piece is the same as another (by position, type, and color)
   */
  equals(other: Piece): boolean {
    return (
      this.type === other.type &&
      this.color === other.color &&
      this.position.file === other.position.file &&
      this.position.rank === other.position.rank
    );
  }

  /**
   * Get piece notation (K, Q, R, B, N, or empty for pawn)
   */
  getNotation(): string {
    switch (this.type) {
      case PieceType.King:
        return 'K';
      case PieceType.Queen:
        return 'Q';
      case PieceType.Rook:
        return 'R';
      case PieceType.Bishop:
        return 'B';
      case PieceType.Knight:
        return 'N';
      case PieceType.Pawn:
        return '';
      default:
        return '';
    }
  }

  /**
   * Get piece value for simple evaluation (standard piece values)
   */
  getValue(): number {
    switch (this.type) {
      case PieceType.Pawn:
        return 1;
      case PieceType.Knight:
        return 3;
      case PieceType.Bishop:
        return 3;
      case PieceType.Rook:
        return 5;
      case PieceType.Queen:
        return 9;
      case PieceType.King:
        return 0; // King is invaluable
      default:
        return 0;
    }
  }

  /**
   * Get unicode symbol for the piece
   */
  getSymbol(): string {
    const symbols: Record<Color, Record<PieceType, string>> = {
      [Color.White]: {
        [PieceType.King]: '♔',
        [PieceType.Queen]: '♕',
        [PieceType.Rook]: '♖',
        [PieceType.Bishop]: '♗',
        [PieceType.Knight]: '♘',
        [PieceType.Pawn]: '♙',
      },
      [Color.Black]: {
        [PieceType.King]: '♚',
        [PieceType.Queen]: '♛',
        [PieceType.Rook]: '♜',
        [PieceType.Bishop]: '♝',
        [PieceType.Knight]: '♞',
        [PieceType.Pawn]: '♟',
      },
    };
    return symbols[this.color][this.type];
  }

  /**
   * Create a promoted piece (used when pawn reaches end)
   */
  promote(newType: PieceType): Piece {
    if (this.type !== PieceType.Pawn) {
      throw new Error('Only pawns can be promoted');
    }
    if (newType === PieceType.Pawn || newType === PieceType.King) {
      throw new Error('Cannot promote to pawn or king');
    }
    return new Piece(newType, this.color, this.position, true);
  }
}
