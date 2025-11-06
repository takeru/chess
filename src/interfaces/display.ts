/**
 * Display abstraction interface
 */

import { Move } from '../domain/move';
import { GameState } from '../domain/gameState';
import { ChessGameEvent } from '../domain/events';

/**
 * Display interface - can be CLI, Web, VR, etc.
 */
export interface IDisplay {
  /**
   * Display the current game state
   */
  showGameState(gameState: GameState): void;

  /**
   * Display a move
   */
  showMove(move: Move): void;

  /**
   * Display a message
   */
  showMessage(message: string): void;

  /**
   * Display an error
   */
  showError(error: string): void;

  /**
   * Handle a game event
   */
  onGameEvent?(event: ChessGameEvent): void;

  /**
   * Clear the display
   */
  clear?(): void;
}

/**
 * Interactive display interface with user input
 */
export interface IInteractiveDisplay extends IDisplay {
  /**
   * Request input from the user
   */
  requestInput(prompt: string): Promise<string>;

  /**
   * Request a move from the user
   */
  requestMove(gameState: GameState): Promise<{ from: string; to: string; promotion?: string }>;

  /**
   * Request confirmation from the user
   */
  requestConfirmation(message: string): Promise<boolean>;
}
