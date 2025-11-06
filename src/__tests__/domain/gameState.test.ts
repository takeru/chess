/**
 * Tests for GameState entity
 */

import { GameState } from '../../domain/gameState';
import { Board } from '../../domain/board';
import { Piece } from '../../domain/piece';
import { Color, PieceType, GameResult, GameEndReason, PositionUtils } from '../../domain/types';

describe('GameState', () => {
  describe('createStandard', () => {
    test('should create a game with standard starting position', () => {
      const game = GameState.createStandard();

      expect(game.currentTurn).toBe(Color.White);
      expect(game.fullMoveNumber).toBe(1);
      expect(game.halfMoveClock).toBe(0);
      expect(game.result).toBe(GameResult.InProgress);
      expect(game.moveHistory).toHaveLength(0);
    });
  });

  describe('createCustom', () => {
    test('should create a game with custom position', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
      ];
      const board = new Board(pieces);
      const game = GameState.createCustom(board, Color.Black);

      expect(game.currentTurn).toBe(Color.Black);
      expect(game.board.getAllPieces()).toHaveLength(2);
    });
  });

  describe('getLegalMoves', () => {
    test('should return legal moves for initial position', () => {
      const game = GameState.createStandard();
      const legalMoves = game.getLegalMoves();

      // White has 20 possible moves at the start (16 pawn moves + 4 knight moves)
      expect(legalMoves.length).toBe(20);
    });

    test('should return empty array when game is over', () => {
      // Checkmate position: Queen mate
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 0, rank: 7 }), // a8
        new Piece(PieceType.King, Color.Black, { file: 2, rank: 5 }), // c6
        new Piece(PieceType.Queen, Color.Black, { file: 1, rank: 6 }), // b7
      ];
      const board = new Board(pieces);
      const game = GameState.createCustom(board, Color.White);

      const legalMoves = game.getLegalMoves();

      expect(legalMoves).toHaveLength(0);
    });
  });

  describe('getLegalMovesForPiece', () => {
    test('should return legal moves for a specific piece', () => {
      const game = GameState.createStandard();
      const pawn = game.board.getPiece({ file: 4, rank: 1 })!;

      const moves = game.getLegalMovesForPiece(pawn);

      expect(moves.length).toBe(2); // e2 can move to e3 or e4
    });

    test('should return empty array for opponent piece', () => {
      const game = GameState.createStandard();
      const blackPawn = game.board.getPiece({ file: 4, rank: 6 })!;

      const moves = game.getLegalMovesForPiece(blackPawn);

      expect(moves).toHaveLength(0); // It's white's turn
    });
  });

  describe('makeMove', () => {
    test('should make a valid move', () => {
      const game = GameState.createStandard();
      const result = game.makeMove({ file: 4, rank: 1 }, { file: 4, rank: 3 }); // e2-e4

      expect(result.success).toBe(true);
      expect(result.move).toBeDefined();
      expect(result.newState?.currentTurn).toBe(Color.Black);
      expect(result.newState?.fullMoveNumber).toBe(1);
    });

    test('should reject move from empty square', () => {
      const game = GameState.createStandard();
      const result = game.makeMove({ file: 4, rank: 3 }, { file: 4, rank: 4 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No piece at source position');
    });

    test('should reject move when not your turn', () => {
      const game = GameState.createStandard();
      const result = game.makeMove({ file: 4, rank: 6 }, { file: 4, rank: 4 }); // Black pawn

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    test('should reject illegal move', () => {
      const game = GameState.createStandard();
      const result = game.makeMove({ file: 4, rank: 1 }, { file: 4, rank: 5 }); // e2-e6 (too far)

      expect(result.success).toBe(false);
      expect(result.error).toBe('Illegal move');
    });

    test('should update half-move clock correctly', () => {
      let game = GameState.createStandard();

      // Move knight (should increment half-move clock)
      let result = game.makeMove({ file: 1, rank: 0 }, { file: 2, rank: 2 }); // Nc3
      expect(result.success).toBe(true);
      game = result.newState!;
      expect(game.halfMoveClock).toBe(1);

      // Move pawn (should reset half-move clock)
      result = game.makeMove({ file: 4, rank: 6 }, { file: 4, rank: 4 }); // e5
      expect(result.success).toBe(true);
      expect(result.newState!.halfMoveClock).toBe(0);
    });

    test('should update full-move number after black moves', () => {
      let game = GameState.createStandard();

      // White move
      let result = game.makeMove({ file: 4, rank: 1 }, { file: 4, rank: 3 });
      game = result.newState!;
      expect(game.fullMoveNumber).toBe(1);

      // Black move
      result = game.makeMove({ file: 4, rank: 6 }, { file: 4, rank: 4 });
      game = result.newState!;
      expect(game.fullMoveNumber).toBe(2);
    });

    test('should detect check', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 0, rank: 6 }),
      ];
      const board = new Board(pieces);
      const game = GameState.createCustom(board, Color.Black);

      const result = game.makeMove({ file: 0, rank: 6 }, { file: 4, rank: 6 }); // Rook to e7, check

      expect(result.success).toBe(true);
      expect(result.isCheck).toBe(true);
    });

    test('should detect checkmate', () => {
      // Setup: White king a8, black king c6, black queen c7 -> moves to b7 for checkmate
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 0, rank: 7 }), // a8
        new Piece(PieceType.King, Color.Black, { file: 2, rank: 5 }), // c6
        new Piece(PieceType.Queen, Color.Black, { file: 2, rank: 6 }), // c7
      ];
      const board = new Board(pieces);
      const game = GameState.createCustom(board, Color.Black);

      const result = game.makeMove({ file: 2, rank: 6 }, { file: 1, rank: 6 }); // Queen c7 to b7, delivers checkmate

      expect(result.success).toBe(true);
      expect(result.isCheckmate).toBe(true);
      expect(result.newState?.result).toBe(GameResult.BlackWin);
      expect(result.newState?.endReason).toBe(GameEndReason.Checkmate);
    });

    test('should require promotion type for pawn promotion', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
        new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 6 }),
      ];
      const board = new Board(pieces);
      const game = GameState.createCustom(board, Color.White);

      const result = game.makeMove({ file: 0, rank: 6 }, { file: 0, rank: 7 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Promotion type required');
    });

    test('should promote pawn correctly', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
        new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 6 }),
      ];
      const board = new Board(pieces);
      const game = GameState.createCustom(board, Color.White);

      const result = game.makeMove({ file: 0, rank: 6 }, { file: 0, rank: 7 }, PieceType.Queen);

      expect(result.success).toBe(true);
      const promotedPiece = result.newState!.board.getPiece({ file: 0, rank: 7 });
      expect(promotedPiece?.type).toBe(PieceType.Queen);
    });
  });

  describe('isInCheck', () => {
    test('should return false for initial position', () => {
      const game = GameState.createStandard();

      expect(game.isInCheck()).toBe(false);
    });

    test('should return true when king is in check', () => {
      const pieces = [
        new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
        new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
        new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 5 }),
      ];
      const board = new Board(pieces);
      const game = GameState.createCustom(board, Color.White);

      expect(game.isInCheck()).toBe(true);
    });
  });

  describe('resign', () => {
    test('should end game with resignation', () => {
      const game = GameState.createStandard();
      const resigned = game.resign();

      expect(resigned.result).toBe(GameResult.BlackWin);
      expect(resigned.endReason).toBe(GameEndReason.Resignation);
    });
  });

  describe('agreeToDraw', () => {
    test('should end game with draw agreement', () => {
      const game = GameState.createStandard();
      const draw = game.agreeToDraw();

      expect(draw.result).toBe(GameResult.Draw);
      expect(draw.endReason).toBe(GameEndReason.DrawAgreement);
    });
  });

  describe('clone', () => {
    test('should create a deep copy of game state', () => {
      const game = GameState.createStandard();
      const clone = game.clone();

      expect(clone).not.toBe(game);
      expect(clone.board).not.toBe(game.board);
      expect(clone.currentTurn).toBe(game.currentTurn);
      expect(clone.fullMoveNumber).toBe(game.fullMoveNumber);
    });
  });

  describe('toFEN', () => {
    test('should generate FEN string', () => {
      const game = GameState.createStandard();
      const fen = game.toFEN();

      expect(fen).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
      expect(fen).toContain(' w '); // White to move
    });
  });

  describe('game flow', () => {
    test('should handle a sequence of moves correctly', () => {
      let game = GameState.createStandard();

      // 1. e4
      let result = game.makeMove(
        PositionUtils.fromAlgebraic('e2'),
        PositionUtils.fromAlgebraic('e4')
      );
      expect(result.success).toBe(true);
      game = result.newState!;

      // 1... e5
      result = game.makeMove(
        PositionUtils.fromAlgebraic('e7'),
        PositionUtils.fromAlgebraic('e5')
      );
      expect(result.success).toBe(true);
      game = result.newState!;

      // 2. Nf3
      result = game.makeMove(
        PositionUtils.fromAlgebraic('g1'),
        PositionUtils.fromAlgebraic('f3')
      );
      expect(result.success).toBe(true);
      game = result.newState!;

      expect(game.moveHistory).toHaveLength(3);
      expect(game.fullMoveNumber).toBe(2);
      expect(game.currentTurn).toBe(Color.Black);
    });
  });
});
