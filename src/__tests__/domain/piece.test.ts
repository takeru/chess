/**
 * Tests for Piece entity
 */

import { Piece } from '../../domain/piece';
import { Color, PieceType } from '../../domain/types';

describe('Piece', () => {
  describe('constructor', () => {
    test('should create a piece with correct properties', () => {
      const piece = new Piece(PieceType.Pawn, Color.White, { file: 4, rank: 1 });

      expect(piece.type).toBe(PieceType.Pawn);
      expect(piece.color).toBe(Color.White);
      expect(piece.position).toEqual({ file: 4, rank: 1 });
      expect(piece.hasMoved).toBe(false);
    });

    test('should create a piece with hasMoved flag', () => {
      const piece = new Piece(PieceType.Rook, Color.Black, { file: 0, rank: 7 }, true);

      expect(piece.hasMoved).toBe(true);
    });
  });

  describe('moveTo', () => {
    test('should create a new piece at the new position', () => {
      const piece = new Piece(PieceType.Knight, Color.White, { file: 1, rank: 0 });
      const movedPiece = piece.moveTo({ file: 2, rank: 2 });

      expect(movedPiece.position).toEqual({ file: 2, rank: 2 });
      expect(movedPiece.hasMoved).toBe(true);
      expect(movedPiece.type).toBe(PieceType.Knight);
      expect(movedPiece.color).toBe(Color.White);

      // Original piece should be unchanged
      expect(piece.position).toEqual({ file: 1, rank: 0 });
      expect(piece.hasMoved).toBe(false);
    });
  });

  describe('promote', () => {
    test('should promote pawn to queen', () => {
      const pawn = new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 6 });
      const queen = pawn.promote(PieceType.Queen);

      expect(queen.type).toBe(PieceType.Queen);
      expect(queen.color).toBe(Color.White);
      expect(queen.position).toEqual({ file: 0, rank: 6 });
    });

    test('should promote pawn to rook', () => {
      const pawn = new Piece(PieceType.Pawn, Color.Black, { file: 3, rank: 1 });
      const rook = pawn.promote(PieceType.Rook);

      expect(rook.type).toBe(PieceType.Rook);
    });

    test('should throw error when promoting non-pawn', () => {
      const knight = new Piece(PieceType.Knight, Color.White, { file: 0, rank: 0 });

      expect(() => knight.promote(PieceType.Queen)).toThrow('Only pawns can be promoted');
    });

    test('should throw error when promoting to invalid piece type', () => {
      const pawn = new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 6 });

      expect(() => pawn.promote(PieceType.Pawn)).toThrow('Cannot promote to pawn or king');
      expect(() => pawn.promote(PieceType.King)).toThrow('Cannot promote to pawn or king');
    });
  });

  describe('clone', () => {
    test('should create a deep copy of the piece', () => {
      const piece = new Piece(PieceType.Bishop, Color.Black, { file: 2, rank: 7 }, true);
      const clone = piece.clone();

      expect(clone).not.toBe(piece);
      expect(clone.type).toBe(piece.type);
      expect(clone.color).toBe(piece.color);
      expect(clone.position).toEqual(piece.position);
      expect(clone.hasMoved).toBe(piece.hasMoved);
    });
  });

  describe('getSymbol', () => {
    test('should return correct symbols for white pieces', () => {
      expect(new Piece(PieceType.King, Color.White, { file: 0, rank: 0 }).getSymbol()).toBe('♔');
      expect(new Piece(PieceType.Queen, Color.White, { file: 0, rank: 0 }).getSymbol()).toBe('♕');
      expect(new Piece(PieceType.Rook, Color.White, { file: 0, rank: 0 }).getSymbol()).toBe('♖');
      expect(new Piece(PieceType.Bishop, Color.White, { file: 0, rank: 0 }).getSymbol()).toBe('♗');
      expect(new Piece(PieceType.Knight, Color.White, { file: 0, rank: 0 }).getSymbol()).toBe('♘');
      expect(new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 0 }).getSymbol()).toBe('♙');
    });

    test('should return correct symbols for black pieces', () => {
      expect(new Piece(PieceType.King, Color.Black, { file: 0, rank: 0 }).getSymbol()).toBe('♚');
      expect(new Piece(PieceType.Queen, Color.Black, { file: 0, rank: 0 }).getSymbol()).toBe('♛');
      expect(new Piece(PieceType.Rook, Color.Black, { file: 0, rank: 0 }).getSymbol()).toBe('♜');
      expect(new Piece(PieceType.Bishop, Color.Black, { file: 0, rank: 0 }).getSymbol()).toBe('♝');
      expect(new Piece(PieceType.Knight, Color.Black, { file: 0, rank: 0 }).getSymbol()).toBe('♞');
      expect(new Piece(PieceType.Pawn, Color.Black, { file: 0, rank: 0 }).getSymbol()).toBe('♟');
    });
  });

  describe('getNotation', () => {
    test('should return correct notation for pieces', () => {
      expect(new Piece(PieceType.King, Color.White, { file: 0, rank: 0 }).getNotation()).toBe('K');
      expect(new Piece(PieceType.Queen, Color.White, { file: 0, rank: 0 }).getNotation()).toBe('Q');
      expect(new Piece(PieceType.Rook, Color.White, { file: 0, rank: 0 }).getNotation()).toBe('R');
      expect(new Piece(PieceType.Bishop, Color.White, { file: 0, rank: 0 }).getNotation()).toBe('B');
      expect(new Piece(PieceType.Knight, Color.White, { file: 0, rank: 0 }).getNotation()).toBe('N');
      expect(new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 0 }).getNotation()).toBe('');
    });
  });
});
