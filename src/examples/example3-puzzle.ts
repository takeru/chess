/**
 * Example 3: Chess Puzzle
 * Custom position where player needs to find the best move
 */

import {
  GameState,
  Board,
  Piece,
  Color,
  PieceType,
  ConsoleDisplay,
} from '../index';

async function main() {
  const display = new ConsoleDisplay();

  // Create a custom puzzle position
  // Example: Back rank mate in one
  const pieces: Piece[] = [
    // White pieces
    new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
    new Piece(PieceType.Rook, Color.White, { file: 7, rank: 0 }),

    // Black pieces
    new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
    new Piece(PieceType.Rook, Color.Black, { file: 0, rank: 0 }),
  ];

  const customBoard = new Board(pieces);
  const puzzleState = GameState.createCustom(customBoard, Color.Black);

  display.showMessage('Chess Puzzle: Black to move and win!');
  display.showGameState(puzzleState);

  // Get all legal moves for black
  const legalMoves = puzzleState.getLegalMoves();

  display.showMessage(`\nLegal moves available: ${legalMoves.length}`);
  legalMoves.forEach((move) => {
    display.showMessage(`  - ${move.toAlgebraic()}`);
  });

  // Try the winning move
  const winningMove = await display.requestMove(puzzleState);
  const result = puzzleState.makeMove(
    { file: parseInt(winningMove.from[0]), rank: parseInt(winningMove.from[1]) },
    { file: parseInt(winningMove.to[0]), rank: parseInt(winningMove.to[1]) }
  );

  if (result.success) {
    if (result.isCheckmate) {
      display.showMessage('\nCorrect! That\'s checkmate!');
    } else {
      display.showMessage('\nMove accepted, but is it the best move?');
    }
  } else {
    display.showError(`\nInvalid move: ${result.error}`);
  }

  display.close();
}

main().catch(console.error);
