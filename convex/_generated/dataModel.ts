/**
 * Generated `dataModel` utilities for Convex.
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 */

import type { GenericId } from "convex/values";

/**
 * The names of all tables in your Convex schema.
 */
export type TableNames = "games" | "users";

/**
 * A type representing an ID for a particular table.
 */
export type Id<TableName extends TableNames> = GenericId<TableName>;

/**
 * A type representing a document in the "games" table.
 */
export interface Doc<T extends TableNames> {
  _id: Id<T>;
  _creationTime: number;
}

export interface DataModel {
  games: {
    _id: Id<"games">;
    _creationTime: number;
    whitePlayerId: string;
    blackPlayerId: string;
    currentTurn: "white" | "black";
    boardState: string;
    moveHistory: Array<{
      from: { file: number; rank: number };
      to: { file: number; rank: number };
      promotionType?: string;
      timestamp: number;
      playerId: string;
    }>;
    result: "in_progress" | "white_win" | "black_win" | "draw";
    endReason?:
      | "checkmate"
      | "stalemate"
      | "resignation"
      | "draw_agreement"
      | "insufficient_material"
      | "fifty_move_rule"
      | "timeout";
    createdAt: number;
    updatedAt: number;
    timeControl?: {
      initialTime: number;
      increment: number;
      whiteTimeRemaining: number;
      blackTimeRemaining: number;
    };
  };
  users: {
    _id: Id<"users">;
    _creationTime: number;
    userId: string;
    displayName: string;
    rating?: number;
    gamesPlayed: number;
    gamesWon: number;
    createdAt: number;
  };
}
