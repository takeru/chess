/**
 * Game event system
 */

import { Move } from './move';
import { Color, GameResult, GameEndReason } from './types';
import { GameState } from './gameState';

/**
 * Base game event
 */
export interface GameEvent {
  readonly type: string;
  readonly timestamp: Date;
}

/**
 * Move made event
 */
export interface MoveMadeEvent extends GameEvent {
  readonly type: 'move_made';
  readonly move: Move;
  readonly gameState: GameState;
}

/**
 * Check event
 */
export interface CheckEvent extends GameEvent {
  readonly type: 'check';
  readonly color: Color;
}

/**
 * Game end event
 */
export interface GameEndEvent extends GameEvent {
  readonly type: 'game_end';
  readonly result: GameResult;
  readonly reason: GameEndReason;
  readonly gameState: GameState;
}

/**
 * Game start event
 */
export interface GameStartEvent extends GameEvent {
  readonly type: 'game_start';
  readonly gameState: GameState;
}

/**
 * Turn change event
 */
export interface TurnChangeEvent extends GameEvent {
  readonly type: 'turn_change';
  readonly color: Color;
}

/**
 * Union type of all game events
 */
export type ChessGameEvent =
  | MoveMadeEvent
  | CheckEvent
  | GameEndEvent
  | GameStartEvent
  | TurnChangeEvent;

/**
 * Event listener type
 */
export type EventListener<T extends GameEvent = GameEvent> = (event: T) => void;

/**
 * Event emitter for chess games
 */
export class GameEventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Subscribe to an event
   */
  on<T extends GameEvent>(eventType: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      this.off(eventType, listener);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends GameEvent>(eventType: string, listener: EventListener<T>): void {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.delete(listener as EventListener);
    }
  }

  /**
   * Emit an event
   */
  emit(event: GameEvent): void {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => listener(event));
    }

    // Also emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => listener(event));
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Create a move made event
   */
  static createMoveMadeEvent(move: Move, gameState: GameState): MoveMadeEvent {
    return {
      type: 'move_made',
      timestamp: new Date(),
      move,
      gameState,
    };
  }

  /**
   * Create a check event
   */
  static createCheckEvent(color: Color): CheckEvent {
    return {
      type: 'check',
      timestamp: new Date(),
      color,
    };
  }

  /**
   * Create a game end event
   */
  static createGameEndEvent(result: GameResult, reason: GameEndReason, gameState: GameState): GameEndEvent {
    return {
      type: 'game_end',
      timestamp: new Date(),
      result,
      reason,
      gameState,
    };
  }

  /**
   * Create a game start event
   */
  static createGameStartEvent(gameState: GameState): GameStartEvent {
    return {
      type: 'game_start',
      timestamp: new Date(),
      gameState,
    };
  }

  /**
   * Create a turn change event
   */
  static createTurnChangeEvent(color: Color): TurnChangeEvent {
    return {
      type: 'turn_change',
      timestamp: new Date(),
      color,
    };
  }
}
