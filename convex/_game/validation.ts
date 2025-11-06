/**
 * Server-side game validation logic
 *
 * SECURITY: This module ensures all moves are validated server-side.
 * Client input is NEVER trusted - all chess rules are enforced here.
 */

import { GameState } from "../../src/domain/gameState";
import { Color, PieceType } from "../../src/domain/types";

export interface Position {
  file: number;
  rank: number;
}

export interface ValidatedMoveResult {
  success: boolean;
  newFEN?: string;
  error?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
}

/**
 * Validate and execute a move on the server
 *
 * This function:
 * 1. Restores game state from FEN
 * 2. Verifies it's the player's turn
 * 3. Checks if the move is legal according to chess rules
 * 4. Executes the move if valid
 * 5. Returns the new game state
 *
 * @param currentFEN - Current board state in FEN notation
 * @param playerId - ID of the player making the move
 * @param playerColor - Color of the player ("white" or "black")
 * @param from - Starting position
 * @param to - Destination position
 * @param promotionType - Optional piece type for pawn promotion
 * @returns Validation result with new FEN if successful
 */
export function validateAndExecuteMove(
  currentFEN: string,
  playerId: string,
  playerColor: "white" | "black",
  from: Position,
  to: Position,
  promotionType?: string
): ValidatedMoveResult {
  try {
    // 1. Restore game state from FEN
    const gameState = GameState.fromFEN(currentFEN);

    // 2. Verify it's the player's turn
    const expectedColor = playerColor === "white" ? Color.White : Color.Black;
    if (gameState.currentTurn !== expectedColor) {
      return {
        success: false,
        error: "Not your turn",
      };
    }

    // 3. Check if game is already over
    if (gameState.result !== "in_progress" as any) {
      return {
        success: false,
        error: "Game is already finished",
      };
    }

    // 4. Convert promotion type if provided
    let pieceTypeForPromotion: PieceType | undefined;
    if (promotionType) {
      switch (promotionType.toLowerCase()) {
        case "queen":
          pieceTypeForPromotion = PieceType.Queen;
          break;
        case "rook":
          pieceTypeForPromotion = PieceType.Rook;
          break;
        case "bishop":
          pieceTypeForPromotion = PieceType.Bishop;
          break;
        case "knight":
          pieceTypeForPromotion = PieceType.Knight;
          break;
        default:
          return {
            success: false,
            error: "Invalid promotion type",
          };
      }
    }

    // 5. Attempt to make the move
    // The domain model will validate all chess rules:
    // - Is there a piece at 'from'?
    // - Does the piece belong to the current player?
    // - Is the move legal for this piece type?
    // - Does the move leave the king in check?
    // - Is it a valid special move (castling, en passant, promotion)?
    const result = gameState.makeMove(from, to, pieceTypeForPromotion);

    if (!result.success || !result.newState) {
      return {
        success: false,
        error: result.error || "Illegal move",
      };
    }

    // 6. Return the validated move result
    return {
      success: true,
      newFEN: result.newState.toFEN(),
      isCheck: result.isCheck,
      isCheckmate: result.isCheckmate,
      isStalemate: result.isStalemate,
    };
  } catch (error) {
    // Catch any unexpected errors
    console.error("Move validation error:", error);
    return {
      success: false,
      error: "Server error during move validation",
    };
  }
}

/**
 * Get all legal moves for the current player
 * Useful for client-side move highlighting (UI enhancement only)
 *
 * @param currentFEN - Current board state
 * @param playerColor - Player color
 * @returns Array of legal moves
 */
export function getLegalMoves(
  currentFEN: string,
  playerColor: "white" | "black"
): Array<{ from: Position; to: Position }> {
  try {
    const gameState = GameState.fromFEN(currentFEN);
    const expectedColor = playerColor === "white" ? Color.White : Color.Black;

    if (gameState.currentTurn !== expectedColor) {
      return [];
    }

    const legalMoves = gameState.getLegalMoves();
    return legalMoves.map((move) => ({
      from: { file: move.from.file, rank: move.from.rank },
      to: { file: move.to.file, rank: move.to.rank },
    }));
  } catch {
    return [];
  }
}

/**
 * Get game result from FEN
 * Used to detect game end conditions
 */
export function getGameResult(
  currentFEN: string
): {
  result: "in_progress" | "white_win" | "black_win" | "draw";
  endReason?: string;
} {
  try {
    const gameState = GameState.fromFEN(currentFEN);

    // Map domain result to API result
    let result: "in_progress" | "white_win" | "black_win" | "draw" = "in_progress";
    if (gameState.result === "white_win" as any) {
      result = "white_win";
    } else if (gameState.result === "black_win" as any) {
      result = "black_win";
    } else if (gameState.result === "draw" as any) {
      result = "draw";
    }

    return {
      result,
      endReason: gameState.endReason,
    };
  } catch {
    return {
      result: "in_progress",
    };
  }
}
