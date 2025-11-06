/**
 * Random CPU player implementation
 */

import { IPlayer, PlayerMove } from '../../interfaces/player';
import { GameState } from '../../domain/gameState';
import { Color } from '../../domain/types';

/**
 * Random CPU player - selects random legal moves
 */
export class RandomCpuPlayer implements IPlayer {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly color: Color,
    private thinkingTime: number = 500 // milliseconds
  ) {}

  /**
   * Request a move - randomly select from legal moves
   */
  async requestMove(gameState: GameState): Promise<PlayerMove> {
    // Simulate thinking time
    if (this.thinkingTime > 0) {
      await this.sleep(this.thinkingTime);
    }

    const legalMoves = gameState.getLegalMoves();

    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];

    return {
      from: randomMove.from,
      to: randomMove.to,
      promotionType: randomMove.promotionType,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
