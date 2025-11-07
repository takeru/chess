/**
 * Chess board entity
 */

import { Piece } from './piece';
import { Color, PieceType, Position, PositionUtils } from './types';

/**
 * Represents a chess board with pieces
 */
export class Board {
  private pieces: Map<string, Piece>;

  constructor(pieces?: Piece[]) {
    this.pieces = new Map();
    if (pieces) {
      pieces.forEach((piece) => {
        this.setPiece(piece);
      });
    }
  }

  /**
   * Get position key for map storage
   */
  private getPositionKey(pos: Position): string {
    return `${pos.file},${pos.rank}`;
  }

  /**
   * Get piece at position
   */
  getPiece(pos: Position): Piece | undefined {
    return this.pieces.get(this.getPositionKey(pos));
  }

  /**
   * Set piece at position
   */
  setPiece(piece: Piece): void {
    this.pieces.set(this.getPositionKey(piece.position), piece);
  }

  /**
   * Remove piece at position
   */
  removePiece(pos: Position): void {
    this.pieces.delete(this.getPositionKey(pos));
  }

  /**
   * Move piece from one position to another
   */
  movePiece(from: Position, to: Position): void {
    const piece = this.getPiece(from);
    if (!piece) {
      throw new Error(`No piece at position ${PositionUtils.toAlgebraic(from)}`);
    }

    this.removePiece(from);
    this.setPiece(piece.moveTo(to));
  }

  /**
   * Get all pieces on the board
   */
  getAllPieces(): Piece[] {
    return Array.from(this.pieces.values());
  }

  /**
   * Get all pieces of a specific color
   */
  getPiecesByColor(color: Color): Piece[] {
    return this.getAllPieces().filter((piece) => piece.color === color);
  }

  /**
   * Get all pieces of a specific type
   */
  getPiecesByType(type: PieceType): Piece[] {
    return this.getAllPieces().filter((piece) => piece.type === type);
  }

  /**
   * Find the king of a specific color
   */
  getKing(color: Color): Piece | undefined {
    return this.getAllPieces().find((piece) => piece.type === PieceType.King && piece.color === color);
  }

  /**
   * Check if a position is empty
   */
  isEmpty(pos: Position): boolean {
    return this.getPiece(pos) === undefined;
  }

  /**
   * Check if a position is occupied by opponent's piece
   */
  isOpponentPiece(pos: Position, color: Color): boolean {
    const piece = this.getPiece(pos);
    return piece !== undefined && piece.color !== color;
  }

  /**
   * Clone the board
   */
  clone(): Board {
    const clonedPieces = this.getAllPieces().map((piece) => piece.clone());
    return new Board(clonedPieces);
  }

  /**
   * Create a board with standard starting position
   */
  static createStandard(): Board {
    const pieces: Piece[] = [];

    // Pawns
    for (let file = 0; file < 8; file++) {
      pieces.push(new Piece(PieceType.Pawn, Color.White, { file, rank: 1 }));
      pieces.push(new Piece(PieceType.Pawn, Color.Black, { file, rank: 6 }));
    }

    // Rooks
    pieces.push(new Piece(PieceType.Rook, Color.White, { file: 0, rank: 0 }));
    pieces.push(new Piece(PieceType.Rook, Color.White, { file: 7, rank: 0 }));
    pieces.push(new Piece(PieceType.Rook, Color.Black, { file: 0, rank: 7 }));
    pieces.push(new Piece(PieceType.Rook, Color.Black, { file: 7, rank: 7 }));

    // Knights
    pieces.push(new Piece(PieceType.Knight, Color.White, { file: 1, rank: 0 }));
    pieces.push(new Piece(PieceType.Knight, Color.White, { file: 6, rank: 0 }));
    pieces.push(new Piece(PieceType.Knight, Color.Black, { file: 1, rank: 7 }));
    pieces.push(new Piece(PieceType.Knight, Color.Black, { file: 6, rank: 7 }));

    // Bishops
    pieces.push(new Piece(PieceType.Bishop, Color.White, { file: 2, rank: 0 }));
    pieces.push(new Piece(PieceType.Bishop, Color.White, { file: 5, rank: 0 }));
    pieces.push(new Piece(PieceType.Bishop, Color.Black, { file: 2, rank: 7 }));
    pieces.push(new Piece(PieceType.Bishop, Color.Black, { file: 5, rank: 7 }));

    // Queens
    pieces.push(new Piece(PieceType.Queen, Color.White, { file: 3, rank: 0 }));
    pieces.push(new Piece(PieceType.Queen, Color.Black, { file: 3, rank: 7 }));

    // Kings
    pieces.push(new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }));
    pieces.push(new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }));

    return new Board(pieces);
  }

  /**
   * Create an empty board
   */
  static createEmpty(): Board {
    return new Board([]);
  }

  /**
   * Create a board from FEN notation (position part only)
   * @param fen - FEN position string
   * @param castlingRights - Castling rights string (e.g., "KQkq", "Kq", "-")
   */
  static fromFEN(fen: string, castlingRights: string = '-'): Board {
    const pieces: Piece[] = [];
    const rows = fen.split('/');

    if (rows.length !== 8) {
      throw new Error('Invalid FEN: must have 8 ranks');
    }

    // Parse castling rights to determine which pieces have moved
    const canWhiteCastleKingside = castlingRights.includes('K');
    const canWhiteCastleQueenside = castlingRights.includes('Q');
    const canBlackCastleKingside = castlingRights.includes('k');
    const canBlackCastleQueenside = castlingRights.includes('q');

    for (let rank = 7; rank >= 0; rank--) {
      let file = 0;
      const row = rows[7 - rank];

      for (const char of row) {
        if (char >= '1' && char <= '8') {
          // Empty squares
          file += parseInt(char, 10);
        } else {
          // Piece
          const color = char === char.toUpperCase() ? Color.White : Color.Black;
          const pieceChar = char.toUpperCase();
          let pieceType: PieceType;

          switch (pieceChar) {
            case 'K':
              pieceType = PieceType.King;
              break;
            case 'Q':
              pieceType = PieceType.Queen;
              break;
            case 'R':
              pieceType = PieceType.Rook;
              break;
            case 'B':
              pieceType = PieceType.Bishop;
              break;
            case 'N':
              pieceType = PieceType.Knight;
              break;
            case 'P':
              pieceType = PieceType.Pawn;
              break;
            default:
              throw new Error(`Invalid FEN: unknown piece ${char}`);
          }

          // Determine if piece has moved based on castling rights and position
          let hasMoved = true; // Default to true (most pieces have moved or can move)

          if (pieceType === PieceType.King) {
            // King hasn't moved if it's in starting position and can castle
            if (color === Color.White && file === 4 && rank === 0) {
              hasMoved = !(canWhiteCastleKingside || canWhiteCastleQueenside);
            } else if (color === Color.Black && file === 4 && rank === 7) {
              hasMoved = !(canBlackCastleKingside || canBlackCastleQueenside);
            }
          } else if (pieceType === PieceType.Rook) {
            // Rook hasn't moved if it's in starting position and castling is available
            if (color === Color.White && rank === 0) {
              if (file === 7) {
                hasMoved = !canWhiteCastleKingside;
              } else if (file === 0) {
                hasMoved = !canWhiteCastleQueenside;
              }
            } else if (color === Color.Black && rank === 7) {
              if (file === 7) {
                hasMoved = !canBlackCastleKingside;
              } else if (file === 0) {
                hasMoved = !canBlackCastleQueenside;
              }
            }
          } else if (pieceType === PieceType.Pawn) {
            // Pawns on starting rank haven't moved
            if ((color === Color.White && rank === 1) || (color === Color.Black && rank === 6)) {
              hasMoved = false;
            }
          }

          pieces.push(new Piece(pieceType, color, { file, rank }, hasMoved));
          file++;
        }
      }

      if (file !== 8) {
        throw new Error(`Invalid FEN: rank ${rank + 1} has wrong number of squares`);
      }
    }

    return new Board(pieces);
  }

  /**
   * Get FEN (Forsyth-Edwards Notation) representation of the board position
   */
  toFEN(): string {
    let fen = '';
    for (let rank = 7; rank >= 0; rank--) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        const piece = this.getPiece({ file, rank });
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount.toString();
            emptyCount = 0;
          }
          const notation = piece.getNotation() || 'P';
          fen += piece.color === Color.White ? notation : notation.toLowerCase();
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount.toString();
      }
      if (rank > 0) {
        fen += '/';
      }
    }
    return fen;
  }

  /**
   * Get a string representation of the board for display
   */
  toString(): string {
    let result = '  a b c d e f g h\n';
    for (let rank = 7; rank >= 0; rank--) {
      result += `${rank + 1} `;
      for (let file = 0; file < 8; file++) {
        const piece = this.getPiece({ file, rank });
        result += piece ? piece.getSymbol() : '·';
        result += ' ';
      }
      result += `${rank + 1}\n`;
    }
    result += '  a b c d e f g h\n';
    return result;
  }
}
