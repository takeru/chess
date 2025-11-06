/**
 * Game manager abstraction interface
 */

import { GameState } from '../domain/gameState';
import { IPlayer } from './player';
import { GameEventEmitter } from '../domain/events';
import { Color } from '../domain/types';

/**
 * Game configuration
 */
export interface GameConfig {
  whitePlayer: IPlayer;
  blackPlayer: IPlayer;
  initialState?: GameState;
  timeControl?: TimeControl;
}

/**
 * Time control configuration
 */
export interface TimeControl {
  initialTime: number; // milliseconds
  increment?: number; // milliseconds per move
}

/**
 * Player clock state
 */
export interface PlayerClock {
  remainingTime: number; // milliseconds
  isRunning: boolean;
}

/**
 * Game manager interface - manages game execution
 * Can be local, server-based, P2P, etc.
 */
export interface IGameManager {
  /**
   * Event emitter for game events
   */
  readonly events: GameEventEmitter;

  /**
   * Current game state
   */
  readonly gameState: GameState;

  /**
   * Start the game
   */
  start(): Promise<void>;

  /**
   * Stop the game
   */
  stop(): void;

  /**
   * Pause the game
   */
  pause?(): void;

  /**
   * Resume the game
   */
  resume?(): void;

  /**
   * Get player for a color
   */
  getPlayer(color: Color): IPlayer;

  /**
   * Get player clock state (if time control is enabled)
   */
  getPlayerClock?(color: Color): PlayerClock;
}

/**
 * Game manager factory interface
 */
export interface IGameManagerFactory {
  /**
   * Create a game manager with configuration
   */
  createGameManager(config: GameConfig): IGameManager;
}
