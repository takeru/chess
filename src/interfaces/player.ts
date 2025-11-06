/**
 * Player abstraction interface
 */

import { Move } from '../domain/move';
import { GameState } from '../domain/gameState';
import { Color, Position, PieceType } from '../domain/types';

/**
 * Represents a player's move decision
 */
export interface PlayerMove {
  from: Position;
  to: Position;
  promotionType?: PieceType;
}

/**
 * Player interface - can be human, AI, remote, etc.
 */
export interface IPlayer {
  /**
   * Player identifier
   */
  readonly id: string;

  /**
   * Player name
   */
  readonly name: string;

  /**
   * Player color
   */
  readonly color: Color;

  /**
   * Request the player to make a move
   * This method should be async to support various input methods
   */
  requestMove(gameState: GameState): Promise<PlayerMove>;

  /**
   * Notify player of opponent's move
   */
  onOpponentMove?(move: Move, gameState: GameState): void;

  /**
   * Notify player of game start
   */
  onGameStart?(gameState: GameState): void;

  /**
   * Notify player of game end
   */
  onGameEnd?(gameState: GameState): void;

  /**
   * Notify player of check
   */
  onCheck?(gameState: GameState): void;
}

/**
 * Player factory interface
 */
export interface IPlayerFactory {
  /**
   * Create a player for a specific color
   */
  createPlayer(color: Color, config?: Record<string, unknown>): IPlayer;
}
