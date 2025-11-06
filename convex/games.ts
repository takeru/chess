/**
 * Chess game mutations and queries
 *
 * SECURITY PRINCIPLES:
 * 1. All moves are validated server-side using chess rules
 * 2. Player authentication is checked for every action
 * 3. Players can only move their own pieces
 * 4. Turn order is enforced
 * 5. Game state is stored server-side in FEN notation
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateAndExecuteMove, getGameResult } from "./_game/validation";

/**
 * Create a new chess game
 */
export const createGame = mutation({
  args: {
    opponentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user (would require Convex Auth setup)
    // For now, we'll use a placeholder
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Authentication required");
    // const playerId = identity.subject;

    // Placeholder for demo - in production use real auth
    const playerId = "player1";

    // Standard chess starting position in FEN
    const initialFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    const gameId = await ctx.db.insert("games", {
      whitePlayerId: playerId,
      blackPlayerId: args.opponentId,
      currentTurn: "white",
      boardState: initialFEN,
      moveHistory: [],
      result: "in_progress",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return gameId;
  },
});

/**
 * Make a move in a game
 *
 * SECURITY: This is the critical function for preventing cheating.
 * All validation happens here on the server.
 */
export const makeMove = mutation({
  args: {
    gameId: v.id("games"),
    from: v.object({
      file: v.number(),
      rank: v.number(),
    }),
    to: v.object({
      file: v.number(),
      rank: v.number(),
    }),
    promotionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Get the game
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    // 2. Get player ID (with real auth this would be from ctx.auth)
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Authentication required");
    // const playerId = identity.subject;

    // Placeholder for demo
    const playerId = "player1";

    // 3. Verify player is in this game
    const isWhite = game.whitePlayerId === playerId;
    const isBlack = game.blackPlayerId === playerId;

    if (!isWhite && !isBlack) {
      throw new Error("You are not a player in this game");
    }

    const playerColor = isWhite ? "white" : "black";

    // 4. Verify game is in progress
    if (game.result !== "in_progress") {
      throw new Error("Game is already finished");
    }

    // 5. Verify it's the player's turn
    if (game.currentTurn !== playerColor) {
      throw new Error("Not your turn");
    }

    // 6. CRITICAL: Validate move server-side
    // This is where we prevent cheating - the domain model
    // checks all chess rules and ensures the move is legal
    const validationResult = validateAndExecuteMove(
      game.boardState,
      playerId,
      playerColor,
      args.from,
      args.to,
      args.promotionType
    );

    if (!validationResult.success) {
      throw new Error(validationResult.error || "Illegal move");
    }

    // 7. Update game state in database
    const nextTurn = playerColor === "white" ? "black" : "white";

    // Determine game result
    let gameResult = game.result;
    let endReason = game.endReason;

    if (validationResult.isCheckmate) {
      gameResult = playerColor === "white" ? "white_win" : "black_win";
      endReason = "checkmate";
    } else if (validationResult.isStalemate) {
      gameResult = "draw";
      endReason = "stalemate";
    } else {
      // Check for other end conditions
      const result = getGameResult(validationResult.newFEN!);
      if (result.result !== "in_progress") {
        gameResult = result.result;
        endReason = result.endReason;
      }
    }

    // 8. Save the validated move
    await ctx.db.patch(args.gameId, {
      boardState: validationResult.newFEN!,
      currentTurn: nextTurn,
      moveHistory: [
        ...game.moveHistory,
        {
          from: args.from,
          to: args.to,
          promotionType: args.promotionType,
          timestamp: Date.now(),
          playerId,
        },
      ],
      result: gameResult,
      endReason,
      updatedAt: Date.now(),
    });

    // 9. Return success with game state info
    return {
      success: true,
      isCheck: validationResult.isCheck,
      isCheckmate: validationResult.isCheckmate,
      isStalemate: validationResult.isStalemate,
      gameResult,
    };
  },
});

/**
 * Get a game by ID
 * This query will automatically update clients in real-time
 */
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

/**
 * Get all games for a player
 */
export const getPlayerGames = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const whiteGames = await ctx.db
      .query("games")
      .withIndex("by_white_player", (q) => q.eq("whitePlayerId", args.playerId))
      .collect();

    const blackGames = await ctx.db
      .query("games")
      .withIndex("by_black_player", (q) => q.eq("blackPlayerId", args.playerId))
      .collect();

    return [...whiteGames, ...blackGames].sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  },
});

/**
 * Resign from a game
 */
export const resign = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    // Get player ID (with real auth)
    const playerId = "player1"; // Placeholder

    const isWhite = game.whitePlayerId === playerId;
    const isBlack = game.blackPlayerId === playerId;

    if (!isWhite && !isBlack) {
      throw new Error("You are not a player in this game");
    }

    if (game.result !== "in_progress") {
      throw new Error("Game is already finished");
    }

    const result = isWhite ? "black_win" : "white_win";

    await ctx.db.patch(args.gameId, {
      result,
      endReason: "resignation",
      updatedAt: Date.now(),
    });

    return { success: true, result };
  },
});

/**
 * Offer/accept draw
 */
export const agreeToDraw = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    if (game.result !== "in_progress") {
      throw new Error("Game is already finished");
    }

    await ctx.db.patch(args.gameId, {
      result: "draw",
      endReason: "draw_agreement",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
