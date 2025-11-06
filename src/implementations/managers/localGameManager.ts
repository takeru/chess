/**
 * Local game manager implementation
 */

import { GameState } from '../../domain/gameState';
import { GameEventEmitter } from '../../domain/events';
import { IGameManager, GameConfig, PlayerClock } from '../../interfaces/gameManager';
import { IPlayer } from '../../interfaces/player';
import { Color, GameResult, PositionUtils, PieceType } from '../../domain/types';
import { Move } from '../../domain/move';

/**
 * Local game manager - runs game in single process
 */
export class LocalGameManager implements IGameManager {
  public readonly events: GameEventEmitter;
  private _gameState: GameState;
  private whitePlayer: IPlayer;
  private blackPlayer: IPlayer;
  private running: boolean = false;
  private paused: boolean = false;

  // Time control
  private whiteTimeRemaining?: number;
  private blackTimeRemaining?: number;
  private lastMoveTime?: Date;
  private timeIncrement?: number;

  constructor(config: GameConfig) {
    this.events = new GameEventEmitter();
    this._gameState = config.initialState || GameState.createStandard();
    this.whitePlayer = config.whitePlayer;
    this.blackPlayer = config.blackPlayer;

    if (config.timeControl) {
      this.whiteTimeRemaining = config.timeControl.initialTime;
      this.blackTimeRemaining = config.timeControl.initialTime;
      this.timeIncrement = config.timeControl.increment;
    }
  }

  get gameState(): GameState {
    return this._gameState;
  }

  /**
   * Start the game
   */
  async start(): Promise<void> {
    this.running = true;

    // Notify players of game start
    this.whitePlayer.onGameStart?.(this._gameState);
    this.blackPlayer.onGameStart?.(this._gameState);

    // Emit game start event
    this.events.emit(GameEventEmitter.createGameStartEvent(this._gameState));

    // Game loop
    while (this.running && this._gameState.result === GameResult.InProgress) {
      if (this.paused) {
        await this.sleep(100);
        continue;
      }

      await this.playTurn();
    }

    // Notify players of game end
    this.whitePlayer.onGameEnd?.(this._gameState);
    this.blackPlayer.onGameEnd?.(this._gameState);

    // Emit game end event
    if (this._gameState.endReason) {
      this.events.emit(
        GameEventEmitter.createGameEndEvent(
          this._gameState.result,
          this._gameState.endReason,
          this._gameState
        )
      );
    }
  }

  /**
   * Play a single turn
   */
  private async playTurn(): Promise<void> {
    const currentPlayer = this.getPlayer(this._gameState.currentTurn);
    const moveStartTime = new Date();

    try {
      // Check for timeout
      if (this.isTimedOut(this._gameState.currentTurn)) {
        this._gameState = this._gameState.resign();
        return;
      }

      // Request move from player
      const playerMove = await currentPlayer.requestMove(this._gameState);

      // Validate and apply move
      const result = this._gameState.makeMove(
        playerMove.from,
        playerMove.to,
        playerMove.promotionType
      );

      if (!result.success) {
        throw new Error(result.error || 'Invalid move');
      }

      if (!result.move || !result.newState) {
        throw new Error('No move or state returned');
      }

      // Store old turn for time control calculation
      const oldTurn = this._gameState.currentTurn;

      // Update game state to the new state
      this._gameState = result.newState;

      // Update time control
      if (this.whiteTimeRemaining !== undefined && this.blackTimeRemaining !== undefined) {
        const moveEndTime = new Date();
        const elapsedTime = moveEndTime.getTime() - moveStartTime.getTime();

        if (oldTurn === Color.White) {
          this.whiteTimeRemaining -= elapsedTime;
          if (this.timeIncrement) {
            this.whiteTimeRemaining += this.timeIncrement;
          }
        } else {
          this.blackTimeRemaining -= elapsedTime;
          if (this.timeIncrement) {
            this.blackTimeRemaining += this.timeIncrement;
          }
        }
      }

      // Notify opponent
      const opponent = this.getPlayer(
        oldTurn === Color.White ? Color.Black : Color.White
      );
      opponent.onOpponentMove?.(result.move, this._gameState);

      // Emit move event
      this.events.emit(GameEventEmitter.createMoveMadeEvent(result.move, this._gameState));

      // Emit turn change event
      this.events.emit(GameEventEmitter.createTurnChangeEvent(this._gameState.currentTurn));

      // Check for check
      if (result.isCheck) {
        this.getPlayer(this._gameState.currentTurn).onCheck?.(this._gameState);
        this.events.emit(GameEventEmitter.createCheckEvent(this._gameState.currentTurn));
      }
    } catch (error) {
      // Invalid move or error - could handle differently
      console.error('Error during turn:', error);
      // For now, just continue
    }
  }

  /**
   * Check if a player has run out of time
   */
  private isTimedOut(color: Color): boolean {
    if (color === Color.White && this.whiteTimeRemaining !== undefined) {
      return this.whiteTimeRemaining <= 0;
    }
    if (color === Color.Black && this.blackTimeRemaining !== undefined) {
      return this.blackTimeRemaining <= 0;
    }
    return false;
  }

  /**
   * Stop the game
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Pause the game
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume the game
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Get player for a color
   */
  getPlayer(color: Color): IPlayer {
    return color === Color.White ? this.whitePlayer : this.blackPlayer;
  }

  /**
   * Get player clock state
   */
  getPlayerClock(color: Color): PlayerClock {
    const remainingTime =
      color === Color.White
        ? this.whiteTimeRemaining ?? Infinity
        : this.blackTimeRemaining ?? Infinity;

    return {
      remainingTime,
      isRunning: this.running && !this.paused && this._gameState.currentTurn === color,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
