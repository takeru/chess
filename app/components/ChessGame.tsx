"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChessBoard } from "./ChessBoard";

interface ChessGameProps {
  gameId: Id<"games">;
}

export function ChessGame({ gameId }: ChessGameProps) {
  const game = useQuery(api.games.getGame, { gameId });
  const makeMove = useMutation(api.games.makeMove);
  const resign = useMutation(api.games.resign);
  const agreeToDraw = useMutation(api.games.agreeToDraw);

  const [selectedSquare, setSelectedSquare] = useState<{ file: number; rank: number } | null>(null);
  const [error, setError] = useState<string>("");

  if (!game) {
    return <div>Loading game...</div>;
  }

  const handleSquareClick = async (file: number, rank: number) => {
    setError("");

    if (!selectedSquare) {
      // Select a square
      setSelectedSquare({ file, rank });
    } else {
      // Try to make a move
      try {
        await makeMove({
          gameId,
          from: selectedSquare,
          to: { file, rank },
        });
        setSelectedSquare(null);
      } catch (err: any) {
        setError(err.message || "Invalid move");
        setSelectedSquare(null);
      }
    }
  };

  const handleResign = async () => {
    if (confirm("Are you sure you want to resign?")) {
      try {
        await resign({ gameId });
      } catch (err: any) {
        setError(err.message || "Failed to resign");
      }
    }
  };

  const handleDraw = async () => {
    if (confirm("Offer/accept draw?")) {
      try {
        await agreeToDraw({ gameId });
      } catch (err: any) {
        setError(err.message || "Failed to agree to draw");
      }
    }
  };

  const getResultMessage = () => {
    if (game.result === "white_win") return "White Wins!";
    if (game.result === "black_win") return "Black Wins!";
    if (game.result === "draw") return "Draw!";
    return null;
  };

  const resultMessage = getResultMessage();

  return (
    <div style={{ textAlign: "center" }}>
      <div className="game-info">
        <p>Turn: {game.currentTurn === "white" ? "White" : "Black"}</p>
        {resultMessage && (
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4ecca3" }}>
            {resultMessage} ({game.endReason})
          </p>
        )}
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <ChessBoard
        fen={game.boardState}
        onSquareClick={handleSquareClick}
        selectedSquare={selectedSquare}
        disabled={game.result !== "in_progress"}
      />

      {game.result === "in_progress" && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleResign}>Resign</button>
          <button onClick={handleDraw}>Offer Draw</button>
        </div>
      )}

      <div style={{ marginTop: "1rem", fontSize: "0.85rem", opacity: 0.7 }}>
        <p>Move history: {game.moveHistory.length} moves</p>
      </div>
    </div>
  );
}
