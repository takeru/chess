/**
 * Tests for game rules
 */

import { GameRules } from '../../../domain/rules/gameRules';
import { Board } from '../../../domain/board';
import { Piece } from '../../../domain/piece';
import { Color, PieceType } from '../../../domain/types';

describe('GameRules', () => {
  describe('isInCheck', () => {
    test('should return false for initial position', () => {
      const board = Board.createStandard();

      expect(GameRules.isInCheck(board, Color.White)).toBe(false);
      expect(GameRules.isInCheck(board, Color.Black)).toBe(false);
    });

    test('should detect check from rook', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isInCheck(board, Color.White)).toBe(true);
      expect(GameRules.isInCheck(board, Color.Black)).toBe(false);
    });

    test('should detect check from bishop', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Bishop, Color.Black, { file: 0, rank: 4 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isInCheck(board, Color.White)).toBe(true);
    });

    test('should detect check from knight', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Knight, Color.Black, { file: 3, rank: 2 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isInCheck(board, Color.White)).toBe(true);
    });

    test('should detect check from pawn', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Pawn, Color.Black, { file: 3, rank: 5 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isInCheck(board, Color.White)).toBe(true);
    });

    test('should detect check from queen', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Queen, Color.Black, { file: 4, rank: 5 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isInCheck(board, Color.White)).toBe(true);
    });

    test('should not detect check when piece is blocked', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
        new Piece(PieceType.Pawn, Color.White, { file: 4, rank: 1 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isInCheck(board, Color.White)).toBe(false);
    });
  });

  describe('isSquareAttacked', () => {
    test('should detect attacked square', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isSquareAttacked(board, { file: 4, rank: 3 }, Color.White)).toBe(true);
    });

    test('should not detect attack on safe square', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isSquareAttacked(board, { file: 0, rank: 0 }, Color.White)).toBe(false);
    });
  });

  describe('isCheckmate', () => {
    test('should detect back rank checkmate', () => {
      // Queen checkmate: White king on a8 (corner), black queen on b7 (checkmate), black king on c6 (support)
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 0, rank: 7 }), // a8
        new Piece(PieceType.King, Color.Black, { file: 2, rank: 5 }), // c6
        new Piece(PieceType.Queen, Color.Black, { file: 1, rank: 6 }), // b7
      ];
      const board = new Board(pieces);

      expect(GameRules.isCheckmate(board, Color.White)).toBe(true);
    });

    test('should not detect checkmate when king can escape', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isCheckmate(board, Color.White)).toBe(false);
    });

    test('should not detect checkmate when piece can block', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Rook, Color.White, { file: 0, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isCheckmate(board, Color.White)).toBe(false);
    });

    test('should not detect checkmate when attacker can be captured', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Rook, Color.White, { file: 3, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 1 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isCheckmate(board, Color.White)).toBe(false);
    });
  });

  describe('isStalemate', () => {
    test('should detect stalemate', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 7, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 5, rank: 1 }),
        new Piece(PieceType.Queen, Color.Black, { file: 6, rank: 2 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isStalemate(board, Color.White)).toBe(true);
    });

    test('should not detect stalemate when player has legal moves', () => {
      const board = Board.createStandard();

      expect(GameRules.isStalemate(board, Color.White)).toBe(false);
    });

    test('should not detect stalemate when in check', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 7, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 7, rank: 6 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.isStalemate(board, Color.White)).toBe(false);
    });
  });

  describe('hasInsufficientMaterial', () => {
    test('should detect insufficient material with only kings', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.hasInsufficientMaterial(board)).toBe(true);
    });

    test('should detect insufficient material with king and bishop', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Bishop, Color.White, { file: 2, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.hasInsufficientMaterial(board)).toBe(true);
    });

    test('should detect insufficient material with king and knight', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Knight, Color.White, { file: 1, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.hasInsufficientMaterial(board)).toBe(true);
    });

    test('should detect sufficient material with king and rook', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Rook, Color.White, { file: 0, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.hasInsufficientMaterial(board)).toBe(false);
    });

    test('should detect sufficient material with king and queen', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Queen, Color.White, { file: 3, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.hasInsufficientMaterial(board)).toBe(false);
    });

    test('should detect sufficient material with king and pawn', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Pawn, Color.White, { file: 4, rank: 1 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);

      expect(GameRules.hasInsufficientMaterial(board)).toBe(false);
    });
  });

  describe('getLegalMoves', () => {
    test('should return legal moves for a piece', () => {
      const board = Board.createStandard();
      const pawn = board.getPiece({ file: 4, rank: 1 })!;

      const moves = GameRules.getLegalMoves(pawn, board);

      expect(moves.length).toBe(2);
    });

    test('should not return moves that leave king in check', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Rook, Color.White, { file: 4, rank: 1 }),
        new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const whiteRook = board.getPiece({ file: 4, rank: 1 })!;

      const moves = GameRules.getLegalMoves(whiteRook, board);

      // Rook is pinned and can only move along the file
      expect(moves.length).toBeGreaterThan(0);
      moves.forEach((move) => {
        expect(move.to.file).toBe(4);
      });
    });
  });

  describe('getAllLegalMoves', () => {
    test('should return all legal moves for initial position', () => {
      const board = Board.createStandard();

      const moves = GameRules.getAllLegalMoves(board, Color.White);

      // 16 pawn moves (8 pawns × 2 moves each) + 4 knight moves (2 knights × 2 moves each)
      expect(moves.length).toBe(20);
    });

    test('should return empty array when in checkmate', () => {
      // Same checkmate position as above
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 0, rank: 7 }), // a8
        new Piece(PieceType.King, Color.Black, { file: 2, rank: 5 }), // c6
        new Piece(PieceType.Queen, Color.Black, { file: 1, rank: 6 }), // b7
      ];
      const board = new Board(pieces);

      const moves = GameRules.getAllLegalMoves(board, Color.White);

      expect(moves.length).toBe(0);
    });
  });
});
