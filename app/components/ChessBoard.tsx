"use client";

import { GameState } from "../../src/domain/gameState";
import "./ChessBoard.css";

interface ChessBoardProps {
  fen: string;
  onSquareClick: (file: number, rank: number) => void;
  selectedSquare: { file: number; rank: number } | null;
  disabled?: boolean;
}

export function ChessBoard({ fen, onSquareClick, selectedSquare, disabled }: ChessBoardProps) {
  // Parse FEN to get board state
  let gameState: GameState;
  try {
    gameState = GameState.fromFEN(fen);
  } catch (error) {
    return <div>Error loading board</div>;
  }

  const renderSquare = (file: number, rank: number) => {
    const piece = gameState.board.getPiece({ file, rank });
    const isLight = (file + rank) % 2 === 0;
    const isSelected =
      selectedSquare?.file === file && selectedSquare?.rank === rank;

    return (
      <div
        key={`${file}-${rank}`}
        className={`chess-square ${isLight ? "light" : "dark"} ${
          isSelected ? "selected" : ""
        }`}
        onClick={() => !disabled && onSquareClick(file, rank)}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {piece && <span className="piece">{piece.getSymbol()}</span>}
      </div>
    );
  };

  return (
    <div className="chess-board-container">
      <div className="chess-board">
        {/* Render from rank 7 (top) to rank 0 (bottom) */}
        {[7, 6, 5, 4, 3, 2, 1, 0].map((rank) => (
          <div key={rank} className="chess-rank">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((file) => renderSquare(file, rank))}
          </div>
        ))}
      </div>
      <div className="board-labels">
        <div className="file-labels">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
