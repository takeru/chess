/**
 * Tests for Board entity
 */

import { Board } from '../../domain/board';
import { Piece } from '../../domain/piece';
import { Color, PieceType } from '../../domain/types';

describe('Board', () => {
  describe('createStandard', () => {
    test('should create a board with standard starting position', () => {
      const board = Board.createStandard();
      const pieces = board.getAllPieces();

      expect(pieces).toHaveLength(32);

      // Check white pieces
      expect(board.getPiece({ file: 0, rank: 0 })?.type).toBe(PieceType.Rook);
      expect(board.getPiece({ file: 4, rank: 0 })?.type).toBe(PieceType.King);
      expect(board.getPiece({ file: 3, rank: 0 })?.type).toBe(PieceType.Queen);

      // Check black pieces
      expect(board.getPiece({ file: 0, rank: 7 })?.type).toBe(PieceType.Rook);
      expect(board.getPiece({ file: 4, rank: 7 })?.type).toBe(PieceType.King);
      expect(board.getPiece({ file: 3, rank: 7 })?.type).toBe(PieceType.Queen);

      // Check pawns
      for (let file = 0; file < 8; file++) {
        expect(board.getPiece({ file, rank: 1 })?.type).toBe(PieceType.Pawn);
        expect(board.getPiece({ file, rank: 6 })?.type).toBe(PieceType.Pawn);
      }
    });
  });

  describe('createEmpty', () => {
    test('should create an empty board', () => {
      const board = Board.createEmpty();
      const pieces = board.getAllPieces();

      expect(pieces).toHaveLength(0);
    });
  });

  describe('getPiece', () => {
    test('should return piece at position', () => {
      const pieces = [new Piece(PieceType.King, Color.White, { file: 4, rank: 0 })];
      const board = new Board(pieces);

      const piece = board.getPiece({ file: 4, rank: 0 });

      expect(piece).toBeDefined();
      expect(piece?.type).toBe(PieceType.King);
    });

    test('should return undefined for empty position', () => {
      const board = Board.createEmpty();

      const piece = board.getPiece({ file: 4, rank: 4 });

      expect(piece).toBeUndefined();
    });
  });

  describe('setPiece', () => {
    test('should set a piece at position', () => {
      const board = Board.createEmpty();
      const piece = new Piece(PieceType.Queen, Color.Black, { file: 3, rank: 7 });

      board.setPiece(piece);

      expect(board.getPiece({ file: 3, rank: 7 })).toBe(piece);
    });

    test('should overwrite existing piece', () => {
      const board = Board.createEmpty();
      const piece1 = new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 0 });
      const piece2 = new Piece(PieceType.Queen, Color.Black, { file: 0, rank: 0 });

      board.setPiece(piece1);
      board.setPiece(piece2);

      expect(board.getPiece({ file: 0, rank: 0 })).toBe(piece2);
    });
  });

  describe('removePiece', () => {
    test('should remove piece at position', () => {
      const pieces = [new Piece(PieceType.Rook, Color.White, { file: 0, rank: 0 })];
      const board = new Board(pieces);

      board.removePiece({ file: 0, rank: 0 });

      expect(board.getPiece({ file: 0, rank: 0 })).toBeUndefined();
    });
  });

  describe('movePiece', () => {
    test('should move piece from one position to another', () => {
      const pieces = [new Piece(PieceType.Knight, Color.White, { file: 1, rank: 0 })];
      const board = new Board(pieces);

      board.movePiece({ file: 1, rank: 0 }, { file: 2, rank: 2 });

      expect(board.getPiece({ file: 1, rank: 0 })).toBeUndefined();
      expect(board.getPiece({ file: 2, rank: 2 })?.type).toBe(PieceType.Knight);
    });

    test('should throw error when moving from empty position', () => {
      const board = Board.createEmpty();

      expect(() => board.movePiece({ file: 0, rank: 0 }, { file: 1, rank: 1 })).toThrow();
    });
  });

  describe('getAllPieces', () => {
    test('should return all pieces on the board', () => {
      const board = Board.createStandard();
      const pieces = board.getAllPieces();

      expect(pieces).toHaveLength(32);
    });
  });

  describe('getPiecesByColor', () => {
    test('should return all pieces of specified color', () => {
      const board = Board.createStandard();
      const whitePieces = board.getPiecesByColor(Color.White);
      const blackPieces = board.getPiecesByColor(Color.Black);

      expect(whitePieces).toHaveLength(16);
      expect(blackPieces).toHaveLength(16);

      whitePieces.forEach((piece) => {
        expect(piece.color).toBe(Color.White);
      });

      blackPieces.forEach((piece) => {
        expect(piece.color).toBe(Color.Black);
      });
    });
  });

  describe('getPiecesByType', () => {
    test('should return all pieces of specified type', () => {
      const board = Board.createStandard();
      const pawns = board.getPiecesByType(PieceType.Pawn);
      const knights = board.getPiecesByType(PieceType.Knight);
      const kings = board.getPiecesByType(PieceType.King);

      expect(pawns).toHaveLength(16);
      expect(knights).toHaveLength(4);
      expect(kings).toHaveLength(2);
    });
  });

  describe('getKing', () => {
    test('should return the king of specified color', () => {
      const board = Board.createStandard();
      const whiteKing = board.getKing(Color.White);
      const blackKing = board.getKing(Color.Black);

      expect(whiteKing?.type).toBe(PieceType.King);
      expect(whiteKing?.color).toBe(Color.White);
      expect(whiteKing?.position).toEqual({ file: 4, rank: 0 });

      expect(blackKing?.type).toBe(PieceType.King);
      expect(blackKing?.color).toBe(Color.Black);
      expect(blackKing?.position).toEqual({ file: 4, rank: 7 });
    });

    test('should return undefined if king not found', () => {
      const board = Board.createEmpty();

      expect(board.getKing(Color.White)).toBeUndefined();
    });
  });

  describe('isEmpty', () => {
    test('should return true for empty position', () => {
      const board = Board.createStandard();

      expect(board.isEmpty({ file: 4, rank: 4 })).toBe(true);
    });

    test('should return false for occupied position', () => {
      const board = Board.createStandard();

      expect(board.isEmpty({ file: 0, rank: 0 })).toBe(false);
    });
  });

  describe('isOpponentPiece', () => {
    test('should return true if position has opponent piece', () => {
      const board = Board.createStandard();

      expect(board.isOpponentPiece({ file: 0, rank: 7 }, Color.White)).toBe(true);
    });

    test('should return false if position has own piece', () => {
      const board = Board.createStandard();

      expect(board.isOpponentPiece({ file: 0, rank: 0 }, Color.White)).toBe(false);
    });

    test('should return false if position is empty', () => {
      const board = Board.createStandard();

      expect(board.isOpponentPiece({ file: 4, rank: 4 }, Color.White)).toBe(false);
    });
  });

  describe('clone', () => {
    test('should create a deep copy of the board', () => {
      const board = Board.createStandard();
      const clone = board.clone();

      expect(clone).not.toBe(board);
      expect(clone.getAllPieces()).toHaveLength(board.getAllPieces().length);

      // Modify clone
      clone.removePiece({ file: 0, rank: 0 });

      // Original should be unchanged
      expect(board.getPiece({ file: 0, rank: 0 })).toBeDefined();
      expect(clone.getPiece({ file: 0, rank: 0 })).toBeUndefined();
    });
  });

  describe('toFEN', () => {
    test('should generate FEN for standard starting position', () => {
      const board = Board.createStandard();
      const fen = board.toFEN();

      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    });

    test('should generate FEN for empty board', () => {
      const board = Board.createEmpty();
      const fen = board.toFEN();

      expect(fen).toBe('8/8/8/8/8/8/8/8');
    });

    test('should generate FEN for custom position', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const fen = board.toFEN();

      expect(fen).toBe('4k3/8/8/8/8/8/8/4K3');
    });
  });

  describe('toString', () => {
    test('should generate string representation of board', () => {
      const board = Board.createStandard();
      const str = board.toString();

      expect(str).toContain('a b c d e f g h');
      expect(str).toContain('♖');
      expect(str).toContain('♟');
    });
  });
});
