import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex database schema for the chess application
 *
 * Security Note: All game logic validation happens server-side.
 * Client requests are never trusted - moves are always verified
 * against chess rules on the server.
 */
export default defineSchema({
  /**
   * Games table - stores all chess games
   */
  games: defineTable({
    // Player IDs (from auth)
    whitePlayerId: v.string(),
    blackPlayerId: v.string(),

    // Game state
    currentTurn: v.union(v.literal("white"), v.literal("black")),
    boardState: v.string(), // FEN notation for complete board state

    // Move history (for replay and validation)
    moveHistory: v.array(
      v.object({
        from: v.object({
          file: v.number(),
          rank: v.number(),
        }),
        to: v.object({
          file: v.number(),
          rank: v.number(),
        }),
        promotionType: v.optional(v.string()),
        timestamp: v.number(),
        playerId: v.string(),
      })
    ),

    // Game result
    result: v.union(
      v.literal("in_progress"),
      v.literal("white_win"),
      v.literal("black_win"),
      v.literal("draw")
    ),

    endReason: v.optional(
      v.union(
        v.literal("checkmate"),
        v.literal("stalemate"),
        v.literal("resignation"),
        v.literal("draw_agreement"),
        v.literal("insufficient_material"),
        v.literal("fifty_move_rule"),
        v.literal("timeout")
      )
    ),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),

    // Optional: time control
    timeControl: v.optional(
      v.object({
        initialTime: v.number(), // seconds
        increment: v.number(), // seconds per move
        whiteTimeRemaining: v.number(),
        blackTimeRemaining: v.number(),
      })
    ),
  })
    .index("by_white_player", ["whitePlayerId"])
    .index("by_black_player", ["blackPlayerId"])
    .index("by_result", ["result"]),

  /**
   * User profiles (optional - for storing player info)
   */
  users: defineTable({
    userId: v.string(), // from auth
    displayName: v.string(),
    rating: v.optional(v.number()),
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"]),
});
