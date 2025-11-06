/**
 * Game rules implementation (check, checkmate, stalemate, etc.)
 */

import { Board } from '../board';
import { Move } from '../move';
import { Piece } from '../piece';
import { Color, ColorUtils, Position, PositionUtils, SpecialMoveType, PieceType } from '../types';
import { PieceRulesFactory } from './pieceRules';

/**
 * Game rules engine
 */
export class GameRules {
  /**
   * Check if a king is in check
   */
  static isInCheck(board: Board, color: Color): boolean {
    const king = board.getKing(color);
    if (!king) {
      return false; // No king means not in check (shouldn't happen in valid game)
    }

    return this.isSquareAttacked(board, king.position, color);
  }

  /**
   * Check if a square is attacked by opponent pieces
   */
  static isSquareAttacked(board: Board, position: Position, defenderColor: Color): boolean {
    const attackerColor = ColorUtils.opposite(defenderColor);
    const attackers = board.getPiecesByColor(attackerColor);

    for (const attacker of attackers) {
      const possibleMoves = PieceRulesFactory.getPossibleMoves(attacker, board);
      if (possibleMoves.some((move) => PositionUtils.equals(move, position))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all legal moves for a piece (considering check)
   */
  static getLegalMoves(piece: Piece, board: Board, enPassantTarget?: Position): Move[] {
    const pseudoLegalMoves = PieceRulesFactory.getPossibleMoves(piece, board);
    const legalMoves: Move[] = [];

    for (const targetPos of pseudoLegalMoves) {
      const move = new Move(
        piece.position,
        targetPos,
        piece,
        board.getPiece(targetPos)
      );

      if (this.isMoveLegal(move, board)) {
        legalMoves.push(move);
      }
    }

    // Add castling moves
    if (piece.type === PieceType.King) {
      legalMoves.push(...this.getCastlingMoves(piece, board));
    }

    // Add en passant moves
    if (piece.type === PieceType.Pawn && enPassantTarget) {
      const enPassantMove = this.getEnPassantMove(piece, board, enPassantTarget);
      if (enPassantMove) {
        legalMoves.push(enPassantMove);
      }
    }

    return legalMoves;
  }

  /**
   * Check if a move is legal (doesn't leave king in check)
   */
  static isMoveLegal(move: Move, board: Board): boolean {
    const testBoard = board.clone();
    this.applyMove(testBoard, move);
    return !this.isInCheck(testBoard, move.piece.color);
  }

  /**
   * Apply a move to a board (for testing purposes)
   */
  private static applyMove(board: Board, move: Move): void {
    board.removePiece(move.from);
    if (move.capturedPiece) {
      board.removePiece(move.capturedPiece.position);
    }
    board.setPiece(move.piece.moveTo(move.to));
  }

  /**
   * Get castling moves for a king
   */
  static getCastlingMoves(king: Piece, board: Board): Move[] {
    const moves: Move[] = [];

    if (king.type !== PieceType.King || king.hasMoved) {
      return moves;
    }

    const rank = king.position.rank;

    // Kingside castling
    const kingsideRook = board.getPiece({ file: 7, rank });
    if (
      kingsideRook &&
      kingsideRook.type === PieceType.Rook &&
      !kingsideRook.hasMoved &&
      board.isEmpty({ file: 5, rank }) &&
      board.isEmpty({ file: 6, rank }) &&
      !this.isSquareAttacked(board, { file: 4, rank }, king.color) &&
      !this.isSquareAttacked(board, { file: 5, rank }, king.color) &&
      !this.isSquareAttacked(board, { file: 6, rank }, king.color)
    ) {
      moves.push(
        new Move(
          king.position,
          { file: 6, rank },
          king,
          undefined,
          SpecialMoveType.CastleKingside
        )
      );
    }

    // Queenside castling
    const queensideRook = board.getPiece({ file: 0, rank });
    if (
      queensideRook &&
      queensideRook.type === PieceType.Rook &&
      !queensideRook.hasMoved &&
      board.isEmpty({ file: 1, rank }) &&
      board.isEmpty({ file: 2, rank }) &&
      board.isEmpty({ file: 3, rank }) &&
      !this.isSquareAttacked(board, { file: 4, rank }, king.color) &&
      !this.isSquareAttacked(board, { file: 3, rank }, king.color) &&
      !this.isSquareAttacked(board, { file: 2, rank }, king.color)
    ) {
      moves.push(
        new Move(
          king.position,
          { file: 2, rank },
          king,
          undefined,
          SpecialMoveType.CastleQueenside
        )
      );
    }

    return moves;
  }

  /**
   * Get en passant move for a pawn
   */
  static getEnPassantMove(pawn: Piece, board: Board, enPassantTarget: Position): Move | null {
    if (pawn.type !== PieceType.Pawn) {
      return null;
    }

    const direction = pawn.color === Color.White ? 1 : -1;
    const captureFiles = [pawn.position.file - 1, pawn.position.file + 1];

    for (const captureFile of captureFiles) {
      if (
        captureFile === enPassantTarget.file &&
        pawn.position.rank + direction === enPassantTarget.rank
      ) {
        const capturedPawnPos = {
          file: enPassantTarget.file,
          rank: pawn.position.rank,
        };
        const capturedPawn = board.getPiece(capturedPawnPos);

        if (capturedPawn && capturedPawn.type === PieceType.Pawn) {
          const move = new Move(
            pawn.position,
            enPassantTarget,
            pawn,
            capturedPawn,
            SpecialMoveType.EnPassant
          );

          if (this.isMoveLegal(move, board)) {
            return move;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get all legal moves for a color
   */
  static getAllLegalMoves(board: Board, color: Color, enPassantTarget?: Position): Move[] {
    const pieces = board.getPiecesByColor(color);
    const allMoves: Move[] = [];

    for (const piece of pieces) {
      const moves = this.getLegalMoves(piece, board, enPassantTarget);
      allMoves.push(...moves);
    }

    return allMoves;
  }

  /**
   * Check if the game is in checkmate
   */
  static isCheckmate(board: Board, color: Color, enPassantTarget?: Position): boolean {
    if (!this.isInCheck(board, color)) {
      return false;
    }

    const legalMoves = this.getAllLegalMoves(board, color, enPassantTarget);
    return legalMoves.length === 0;
  }

  /**
   * Check if the game is in stalemate
   */
  static isStalemate(board: Board, color: Color, enPassantTarget?: Position): boolean {
    if (this.isInCheck(board, color)) {
      return false;
    }

    const legalMoves = this.getAllLegalMoves(board, color, enPassantTarget);
    return legalMoves.length === 0;
  }

  /**
   * Check for insufficient material draw
   */
  static hasInsufficientMaterial(board: Board): boolean {
    const pieces = board.getAllPieces();

    // King vs King
    if (pieces.length === 2) {
      return true;
    }

    // King and Bishop vs King
    // King and Knight vs King
    if (pieces.length === 3) {
      const nonKings = pieces.filter((p) => p.type !== PieceType.King);
      if (nonKings.length === 1) {
        const piece = nonKings[0];
        return piece.type === PieceType.Bishop || piece.type === PieceType.Knight;
      }
    }

    // King and Bishop vs King and Bishop (same color squares)
    if (pieces.length === 4) {
      const bishops = pieces.filter((p) => p.type === PieceType.Bishop);
      if (bishops.length === 2) {
        const square1 = (bishops[0].position.file + bishops[0].position.rank) % 2;
        const square2 = (bishops[1].position.file + bishops[1].position.rank) % 2;
        return square1 === square2;
      }
    }

    return false;
  }
}
