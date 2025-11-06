"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChessGame } from "./components/ChessGame";

// Disable static generation for this page as it requires client-side Convex connection
export const dynamic = 'force-dynamic';

export default function Home() {
  const [gameId, setGameId] = useState<Id<"games"> | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const createGame = useMutation(api.games.createGame);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <main>
        <h1>Chess - Real-time Multiplayer</h1>
        <div>Loading...</div>
      </main>
    );
  }

  const handleCreateGame = async () => {
    try {
      // In production, this would be a real opponent ID
      const newGameId = await createGame({ opponentId: "player2" });
      setGameId(newGameId);
    } catch (error) {
      console.error("Failed to create game:", error);
    }
  };

  if (gameId) {
    return (
      <main>
        <h1>Chess - Real-time Multiplayer</h1>
        <ChessGame gameId={gameId} />
        <button onClick={() => setGameId(null)}>New Game</button>
      </main>
    );
  }

  return (
    <main>
      <h1>Chess - Real-time Multiplayer</h1>
      <div className="game-info">
        <h2>Welcome to Real-time Chess!</h2>
        <p>Create a new game to start playing.</p>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
          🛡️ Server-side validation ensures fair play - no cheating possible!
        </p>
      </div>
      <button onClick={handleCreateGame}>Create New Game</button>
    </main>
  );
}
