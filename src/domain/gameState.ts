/**
 * Game state management
 */

import { Board } from './board';
import { Move, MoveResult } from './move';
import { Piece } from './piece';
import {
  Color,
  ColorUtils,
  GameEndReason,
  GameResult,
  Position,
  PositionUtils,
  SpecialMoveType,
  PieceType,
} from './types';
import { GameRules } from './rules/gameRules';

/**
 * Represents the complete state of a chess game
 */
export class GameState {
  constructor(
    public readonly board: Board,
    public readonly currentTurn: Color,
    public readonly moveHistory: Move[] = [],
    public readonly enPassantTarget?: Position,
    public readonly halfMoveClock: number = 0,
    public readonly fullMoveNumber: number = 1,
    public readonly result: GameResult = GameResult.InProgress,
    public readonly endReason?: GameEndReason
  ) {}

  /**
   * Create a new game with standard starting position
   */
  static createStandard(): GameState {
    return new GameState(Board.createStandard(), Color.White);
  }

  /**
   * Create a new game with custom position
   */
  static createCustom(board: Board, currentTurn: Color = Color.White): GameState {
    return new GameState(board, currentTurn);
  }

  /**
   * Create a game state from FEN notation
   * FEN format: [position] [turn] [castling] [en-passant] [halfmove] [fullmove]
   * Example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
   */
  static fromFEN(fen: string): GameState {
    const parts = fen.trim().split(/\s+/);

    if (parts.length !== 6) {
      throw new Error('Invalid FEN: must have 6 parts');
    }

    const [positionPart, turnPart, castlingPart, enPassantPart, halfMovePart, fullMovePart] = parts;

    // Parse board position
    const board = Board.fromFEN(positionPart);

    // Parse turn
    const currentTurn = turnPart === 'w' ? Color.White : Color.Black;

    // Parse en passant target
    let enPassantTarget: Position | undefined;
    if (enPassantPart !== '-') {
      try {
        enPassantTarget = PositionUtils.fromAlgebraic(enPassantPart);
      } catch {
        // Invalid en passant notation, ignore
      }
    }

    // Parse half-move clock
    const halfMoveClock = parseInt(halfMovePart, 10) || 0;

    // Parse full move number
    const fullMoveNumber = parseInt(fullMovePart, 10) || 1;

    // Note: We don't parse castling rights (KQkq) here because our system
    // determines castling availability based on piece movement history.
    // This is a simplification - in a full implementation, we'd need to
    // track castling rights separately.

    return new GameState(
      board,
      currentTurn,
      [], // moveHistory - not stored in FEN
      enPassantTarget,
      halfMoveClock,
      fullMoveNumber
    );
  }

  /**
   * Get all legal moves for the current player
   */
  getLegalMoves(): Move[] {
    return GameRules.getAllLegalMoves(this.board, this.currentTurn, this.enPassantTarget);
  }

  /**
   * Get legal moves for a specific piece
   */
  getLegalMovesForPiece(piece: Piece): Move[] {
    if (piece.color !== this.currentTurn) {
      return [];
    }
    return GameRules.getLegalMoves(piece, this.board, this.enPassantTarget);
  }

  /**
   * Attempt to make a move
   */
  makeMove(from: Position, to: Position, promotionType?: PieceType): MoveResult {
    const piece = this.board.getPiece(from);

    if (!piece) {
      return { success: false, error: 'No piece at source position' };
    }

    if (piece.color !== this.currentTurn) {
      return { success: false, error: 'Not your turn' };
    }

    // Find the legal move that matches this from-to
    const legalMoves = this.getLegalMovesForPiece(piece);
    let move = legalMoves.find((m) => PositionUtils.equals(m.to, to));

    if (!move) {
      return { success: false, error: 'Illegal move' };
    }

    // Handle pawn promotion
    if (
      piece.type === PieceType.Pawn &&
      ((piece.color === Color.White && to.rank === 7) ||
        (piece.color === Color.Black && to.rank === 0))
    ) {
      if (!promotionType) {
        return { success: false, error: 'Promotion type required' };
      }
      move = new Move(from, to, piece, move.capturedPiece, SpecialMoveType.PawnPromotion, promotionType);
    }

    // Apply the move and create new game state
    const newState = this.applyMove(move);

    return {
      success: true,
      move,
      newState,
      isCheck: GameRules.isInCheck(newState.board, newState.currentTurn),
      isCheckmate: newState.result === GameResult.WhiteWin || newState.result === GameResult.BlackWin,
      isStalemate: newState.result === GameResult.Draw && newState.endReason === GameEndReason.Stalemate,
    };
  }

  /**
   * Apply a move and return new game state
   */
  private applyMove(move: Move): GameState {
    const newBoard = this.board.clone();
    let newEnPassantTarget: Position | undefined;
    let newHalfMoveClock = this.halfMoveClock + 1;

    // Handle special moves
    if (move.isCastling()) {
      this.applyCastling(newBoard, move);
    } else if (move.isEnPassant()) {
      this.applyEnPassant(newBoard, move);
    } else if (move.isPromotion()) {
      this.applyPromotion(newBoard, move);
    } else {
      // Normal move
      newBoard.removePiece(move.from);
      if (move.capturedPiece) {
        newBoard.removePiece(move.capturedPiece.position);
      }
      newBoard.setPiece(move.piece.moveTo(move.to));
    }

    // Set en passant target for pawn double moves
    if (
      move.piece.type === PieceType.Pawn &&
      Math.abs(move.to.rank - move.from.rank) === 2
    ) {
      newEnPassantTarget = {
        file: move.from.file,
        rank: (move.from.rank + move.to.rank) / 2,
      };
    }

    // Reset half-move clock on pawn move or capture
    if (move.piece.type === PieceType.Pawn || move.capturedPiece) {
      newHalfMoveClock = 0;
    }

    const newMoveHistory = [...this.moveHistory, move];
    const newFullMoveNumber =
      this.currentTurn === Color.Black ? this.fullMoveNumber + 1 : this.fullMoveNumber;
    const newCurrentTurn = ColorUtils.opposite(this.currentTurn);

    // Check for game end conditions
    const { result, endReason } = this.checkGameEnd(newBoard, newCurrentTurn, newEnPassantTarget, newHalfMoveClock, newMoveHistory);

    return new GameState(
      newBoard,
      newCurrentTurn,
      newMoveHistory,
      newEnPassantTarget,
      newHalfMoveClock,
      newFullMoveNumber,
      result,
      endReason
    );
  }

  /**
   * Apply castling move
   */
  private applyCastling(board: Board, move: Move): void {
    const rank = move.from.rank;

    // Move king
    board.removePiece(move.from);
    board.setPiece(move.piece.moveTo(move.to));

    // Move rook
    if (move.specialMove === SpecialMoveType.CastleKingside) {
      const rook = board.getPiece({ file: 7, rank });
      if (rook) {
        board.removePiece({ file: 7, rank });
        board.setPiece(rook.moveTo({ file: 5, rank }));
      }
    } else if (move.specialMove === SpecialMoveType.CastleQueenside) {
      const rook = board.getPiece({ file: 0, rank });
      if (rook) {
        board.removePiece({ file: 0, rank });
        board.setPiece(rook.moveTo({ file: 3, rank }));
      }
    }
  }

  /**
   * Apply en passant move
   */
  private applyEnPassant(board: Board, move: Move): void {
    board.removePiece(move.from);
    board.setPiece(move.piece.moveTo(move.to));
    if (move.capturedPiece) {
      board.removePiece(move.capturedPiece.position);
    }
  }

  /**
   * Apply pawn promotion
   */
  private applyPromotion(board: Board, move: Move): void {
    board.removePiece(move.from);
    if (move.capturedPiece) {
      board.removePiece(move.capturedPiece.position);
    }
    if (move.promotionType) {
      const promotedPiece = move.piece.promote(move.promotionType).moveTo(move.to);
      board.setPiece(promotedPiece);
    }
  }

  /**
   * Check for game end conditions
   */
  private checkGameEnd(
    board: Board,
    currentTurn: Color,
    enPassantTarget: Position | undefined,
    halfMoveClock: number,
    moveHistory: Move[]
  ): { result: GameResult; endReason?: GameEndReason } {
    // Checkmate
    if (GameRules.isCheckmate(board, currentTurn, enPassantTarget)) {
      return {
        result: currentTurn === Color.White ? GameResult.BlackWin : GameResult.WhiteWin,
        endReason: GameEndReason.Checkmate,
      };
    }

    // Stalemate
    if (GameRules.isStalemate(board, currentTurn, enPassantTarget)) {
      return {
        result: GameResult.Draw,
        endReason: GameEndReason.Stalemate,
      };
    }

    // Insufficient material
    if (GameRules.hasInsufficientMaterial(board)) {
      return {
        result: GameResult.Draw,
        endReason: GameEndReason.InsufficientMaterial,
      };
    }

    // Fifty-move rule
    if (halfMoveClock >= 100) {
      return {
        result: GameResult.Draw,
        endReason: GameEndReason.FiftyMoveRule,
      };
    }

    // Threefold repetition (simplified - would need full position comparison)
    // TODO: Implement proper threefold repetition detection

    return { result: GameResult.InProgress };
  }

  /**
   * Check if the current player is in check
   */
  isInCheck(): boolean {
    return GameRules.isInCheck(this.board, this.currentTurn);
  }

  /**
   * Resign the current player
   */
  resign(): GameState {
    const result = this.currentTurn === Color.White ? GameResult.BlackWin : GameResult.WhiteWin;
    return new GameState(
      this.board,
      this.currentTurn,
      this.moveHistory,
      this.enPassantTarget,
      this.halfMoveClock,
      this.fullMoveNumber,
      result,
      GameEndReason.Resignation
    );
  }

  /**
   * Agree to a draw
   */
  agreeToDraw(): GameState {
    return new GameState(
      this.board,
      this.currentTurn,
      this.moveHistory,
      this.enPassantTarget,
      this.halfMoveClock,
      this.fullMoveNumber,
      GameResult.Draw,
      GameEndReason.DrawAgreement
    );
  }

  /**
   * Clone this game state
   */
  clone(): GameState {
    return new GameState(
      this.board.clone(),
      this.currentTurn,
      [...this.moveHistory],
      this.enPassantTarget ? { ...this.enPassantTarget } : undefined,
      this.halfMoveClock,
      this.fullMoveNumber,
      this.result,
      this.endReason
    );
  }

  /**
   * Get FEN representation of the game
   */
  toFEN(): string {
    const position = this.board.toFEN();
    const turn = this.currentTurn === Color.White ? 'w' : 'b';

    // Castling availability (simplified - would need to track castling rights properly)
    let castling = '-';

    // En passant target
    const enPassant = this.enPassantTarget ? PositionUtils.toAlgebraic(this.enPassantTarget) : '-';

    return `${position} ${turn} ${castling} ${enPassant} ${this.halfMoveClock} ${this.fullMoveNumber}`;
  }
}
