/**
 * Movement rules for each piece type
 */

import { Board } from '../board';
import { Piece } from '../piece';
import { Color, PieceType, Position, PositionUtils } from '../types';

/**
 * Interface for piece movement rules
 */
export interface IPieceRules {
  getPossibleMoves(piece: Piece, board: Board): Position[];
}

/**
 * Pawn movement rules
 */
export class PawnRules implements IPieceRules {
  getPossibleMoves(piece: Piece, board: Board): Position[] {
    const moves: Position[] = [];
    const direction = piece.color === Color.White ? 1 : -1;
    const startRank = piece.color === Color.White ? 1 : 6;
    const { file, rank } = piece.position;

    // Forward move
    const oneForward = { file, rank: rank + direction };
    if (PositionUtils.isValid(oneForward) && board.isEmpty(oneForward)) {
      moves.push(oneForward);

      // Double move from starting position
      if (rank === startRank) {
        const twoForward = { file, rank: rank + 2 * direction };
        if (board.isEmpty(twoForward)) {
          moves.push(twoForward);
        }
      }
    }

    // Diagonal captures
    const captureFiles = [file - 1, file + 1];
    for (const captureFile of captureFiles) {
      const capturePos = { file: captureFile, rank: rank + direction };
      if (PositionUtils.isValid(capturePos) && board.isOpponentPiece(capturePos, piece.color)) {
        moves.push(capturePos);
      }
    }

    return moves;
  }
}

/**
 * Knight movement rules
 */
export class KnightRules implements IPieceRules {
  getPossibleMoves(piece: Piece, board: Board): Position[] {
    const moves: Position[] = [];
    const { file, rank } = piece.position;

    const knightMoves = [
      { file: file + 2, rank: rank + 1 },
      { file: file + 2, rank: rank - 1 },
      { file: file - 2, rank: rank + 1 },
      { file: file - 2, rank: rank - 1 },
      { file: file + 1, rank: rank + 2 },
      { file: file + 1, rank: rank - 2 },
      { file: file - 1, rank: rank + 2 },
      { file: file - 1, rank: rank - 2 },
    ];

    for (const move of knightMoves) {
      if (PositionUtils.isValid(move)) {
        const targetPiece = board.getPiece(move);
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push(move);
        }
      }
    }

    return moves;
  }
}

/**
 * Bishop movement rules
 */
export class BishopRules implements IPieceRules {
  getPossibleMoves(piece: Piece, board: Board): Position[] {
    return this.getDiagonalMoves(piece, board);
  }

  protected getDiagonalMoves(piece: Piece, board: Board): Position[] {
    const moves: Position[] = [];
    const directions = [
      { file: 1, rank: 1 },
      { file: 1, rank: -1 },
      { file: -1, rank: 1 },
      { file: -1, rank: -1 },
    ];

    for (const dir of directions) {
      let currentFile = piece.position.file + dir.file;
      let currentRank = piece.position.rank + dir.rank;

      while (currentFile >= 0 && currentFile <= 7 && currentRank >= 0 && currentRank <= 7) {
        const pos = { file: currentFile, rank: currentRank };
        const targetPiece = board.getPiece(pos);

        if (!targetPiece) {
          moves.push(pos);
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push(pos);
          }
          break;
        }

        currentFile += dir.file;
        currentRank += dir.rank;
      }
    }

    return moves;
  }
}

/**
 * Rook movement rules
 */
export class RookRules implements IPieceRules {
  getPossibleMoves(piece: Piece, board: Board): Position[] {
    return this.getStraightMoves(piece, board);
  }

  protected getStraightMoves(piece: Piece, board: Board): Position[] {
    const moves: Position[] = [];
    const directions = [
      { file: 1, rank: 0 },
      { file: -1, rank: 0 },
      { file: 0, rank: 1 },
      { file: 0, rank: -1 },
    ];

    for (const dir of directions) {
      let currentFile = piece.position.file + dir.file;
      let currentRank = piece.position.rank + dir.rank;

      while (currentFile >= 0 && currentFile <= 7 && currentRank >= 0 && currentRank <= 7) {
        const pos = { file: currentFile, rank: currentRank };
        const targetPiece = board.getPiece(pos);

        if (!targetPiece) {
          moves.push(pos);
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push(pos);
          }
          break;
        }

        currentFile += dir.file;
        currentRank += dir.rank;
      }
    }

    return moves;
  }
}

/**
 * Queen movement rules (combination of Rook and Bishop)
 */
export class QueenRules implements IPieceRules {
  private rookRules = new RookRules();
  private bishopRules = new BishopRules();

  getPossibleMoves(piece: Piece, board: Board): Position[] {
    return [
      ...this.rookRules['getStraightMoves'](piece, board),
      ...this.bishopRules['getDiagonalMoves'](piece, board),
    ];
  }
}

/**
 * King movement rules
 */
export class KingRules implements IPieceRules {
  getPossibleMoves(piece: Piece, board: Board): Position[] {
    const moves: Position[] = [];
    const { file, rank } = piece.position;

    const kingMoves = [
      { file: file + 1, rank },
      { file: file - 1, rank },
      { file, rank: rank + 1 },
      { file, rank: rank - 1 },
      { file: file + 1, rank: rank + 1 },
      { file: file + 1, rank: rank - 1 },
      { file: file - 1, rank: rank + 1 },
      { file: file - 1, rank: rank - 1 },
    ];

    for (const move of kingMoves) {
      if (PositionUtils.isValid(move)) {
        const targetPiece = board.getPiece(move);
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push(move);
        }
      }
    }

    return moves;
  }
}

/**
 * Factory for getting piece rules
 */
export class PieceRulesFactory {
  private static rules: Map<PieceType, IPieceRules> = new Map([
    [PieceType.Pawn, new PawnRules()],
    [PieceType.Knight, new KnightRules()],
    [PieceType.Bishop, new BishopRules()],
    [PieceType.Rook, new RookRules()],
    [PieceType.Queen, new QueenRules()],
    [PieceType.King, new KingRules()],
  ]);

  static getRules(type: PieceType): IPieceRules {
    const rules = this.rules.get(type);
    if (!rules) {
      throw new Error(`No rules found for piece type: ${type}`);
    }
    return rules;
  }

  static getPossibleMoves(piece: Piece, board: Board): Position[] {
    return this.getRules(piece.type).getPossibleMoves(piece, board);
  }
}
