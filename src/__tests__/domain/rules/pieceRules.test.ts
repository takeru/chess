/**
 * Tests for piece movement rules
 */

import { PieceRulesFactory } from '../../../domain/rules/pieceRules';
import { Board } from '../../../domain/board';
import { Piece } from '../../../domain/piece';
import { Color, PieceType } from '../../../domain/types';

describe('PieceRules', () => {
  describe('PawnRules', () => {
    test('should allow pawn to move one square forward', () => {
      const board = Board.createStandard();
      const pawn = board.getPiece({ file: 4, rank: 1 })!;

      const moves = PieceRulesFactory.getPossibleMoves(pawn, board);

      expect(moves.some((m) => m.file === 4 && m.rank === 2)).toBe(true);
    });

    test('should allow pawn to move two squares from starting position', () => {
      const board = Board.createStandard();
      const pawn = board.getPiece({ file: 4, rank: 1 })!;

      const moves = PieceRulesFactory.getPossibleMoves(pawn, board);

      expect(moves.some((m) => m.file === 4 && m.rank === 3)).toBe(true);
    });

    test('should not allow pawn to move two squares if not at starting position', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Pawn, Color.White, { file: 4, rank: 3 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const pawn = board.getPiece({ file: 4, rank: 3 })!;

      const moves = PieceRulesFactory.getPossibleMoves(pawn, board);

      expect(moves.some((m) => m.rank === 5)).toBe(false);
      expect(moves.some((m) => m.rank === 4)).toBe(true);
    });

    test('should not allow pawn to move forward if blocked', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Pawn, Color.White, { file: 4, rank: 1 }),
        new Piece(PieceType.Pawn, Color.Black, { file: 4, rank: 2 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const whitePawn = board.getPiece({ file: 4, rank: 1 })!;

      const moves = PieceRulesFactory.getPossibleMoves(whitePawn, board);

      expect(moves).toHaveLength(0);
    });

    test('should allow pawn to capture diagonally', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Pawn, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.Pawn, Color.Black, { file: 3, rank: 5 }),
        new Piece(PieceType.Pawn, Color.Black, { file: 5, rank: 5 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const whitePawn = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(whitePawn, board);

      expect(moves.some((m) => m.file === 3 && m.rank === 5)).toBe(true);
      expect(moves.some((m) => m.file === 5 && m.rank === 5)).toBe(true);
    });

    test('should work correctly for black pawns', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
        new Piece(PieceType.Pawn, Color.Black, { file: 4, rank: 6 }),
      ];
      const board = new Board(pieces);
      const blackPawn = board.getPiece({ file: 4, rank: 6 })!;

      const moves = PieceRulesFactory.getPossibleMoves(blackPawn, board);

      expect(moves.some((m) => m.file === 4 && m.rank === 5)).toBe(true);
      expect(moves.some((m) => m.file === 4 && m.rank === 4)).toBe(true);
    });
  });

  describe('KnightRules', () => {
    test('should return all 8 possible moves from center', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Knight, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const knight = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(knight, board);

      expect(moves).toHaveLength(8);
    });

    test('should return 2 moves from starting position', () => {
      const board = Board.createStandard();
      const knight = board.getPiece({ file: 1, rank: 0 })!;

      const moves = PieceRulesFactory.getPossibleMoves(knight, board);

      expect(moves).toHaveLength(2);
      expect(moves.some((m) => m.file === 0 && m.rank === 2)).toBe(true);
      expect(moves.some((m) => m.file === 2 && m.rank === 2)).toBe(true);
    });

    test('should be able to capture opponent pieces', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Knight, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.Pawn, Color.Black, { file: 3, rank: 2 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const knight = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(knight, board);

      expect(moves.some((m) => m.file === 3 && m.rank === 2)).toBe(true);
    });

    test('should not be able to capture own pieces', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Knight, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.Pawn, Color.White, { file: 3, rank: 2 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const knight = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(knight, board);

      expect(moves.some((m) => m.file === 3 && m.rank === 2)).toBe(false);
    });
  });

  describe('BishopRules', () => {
    test('should move diagonally', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Bishop, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const bishop = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(bishop, board);

      // Should have moves in all 4 diagonal directions
      expect(moves.length).toBe(13);
      expect(moves.some((m) => m.file === 0 && m.rank === 0)).toBe(true);
      expect(moves.some((m) => m.file === 7 && m.rank === 7)).toBe(true);
    });

    test('should be blocked by pieces', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Bishop, Color.White, { file: 2, rank: 0 }),
        new Piece(PieceType.Pawn, Color.White, { file: 4, rank: 2 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const bishop = board.getPiece({ file: 2, rank: 0 })!;

      const moves = PieceRulesFactory.getPossibleMoves(bishop, board);

      // Cannot move through own pawn at e3
      expect(moves.some((m) => m.file === 5 && m.rank === 3)).toBe(false);
    });

    test('should capture opponent pieces', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Bishop, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.Pawn, Color.Black, { file: 6, rank: 6 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const bishop = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(bishop, board);

      expect(moves.some((m) => m.file === 6 && m.rank === 6)).toBe(true);
      // Cannot move beyond captured piece
      expect(moves.some((m) => m.file === 7 && m.rank === 7)).toBe(false);
    });
  });

  describe('RookRules', () => {
    test('should move horizontally and vertically', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Rook, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const rook = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(rook, board);

      expect(moves.length).toBe(13);
      expect(moves.some((m) => m.file === 4 && m.rank === 7)).toBe(true);
      expect(moves.some((m) => m.file === 0 && m.rank === 4)).toBe(true);
    });

    test('should be blocked by pieces', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Rook, Color.White, { file: 0, rank: 0 }),
        new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 1 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const rook = board.getPiece({ file: 0, rank: 0 })!;

      const moves = PieceRulesFactory.getPossibleMoves(rook, board);

      // Blocked by pawn above
      expect(moves.some((m) => m.file === 0 && m.rank === 2)).toBe(false);
    });
  });

  describe('QueenRules', () => {
    test('should move like rook and bishop combined', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.Queen, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const queen = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(queen, board);

      // Should have both diagonal and straight moves
      expect(moves.length).toBe(26);
      // Diagonal
      expect(moves.some((m) => m.file === 0 && m.rank === 0)).toBe(true);
      // Horizontal
      expect(moves.some((m) => m.file === 0 && m.rank === 4)).toBe(true);
      // Vertical
      expect(moves.some((m) => m.file === 4 && m.rank === 7)).toBe(true);
    });
  });

  describe('KingRules', () => {
    test('should move one square in any direction', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 4 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const king = board.getPiece({ file: 4, rank: 4 })!;

      const moves = PieceRulesFactory.getPossibleMoves(king, board);

      expect(moves).toHaveLength(8);
    });

    // Note: Castling and attack square checks are handled by GameRules.getLegalMoves,
    // not by PieceRulesFactory.getPossibleMoves
  });
});
