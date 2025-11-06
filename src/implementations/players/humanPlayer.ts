/**
 * Human player implementation
 */

import { IPlayer, PlayerMove } from '../../interfaces/player';
import { IInteractiveDisplay } from '../../interfaces/display';
import { GameState } from '../../domain/gameState';
import { Color, PositionUtils, PieceType } from '../../domain/types';

/**
 * Human player - gets moves from interactive display
 */
export class HumanPlayer implements IPlayer {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly color: Color,
    private display: IInteractiveDisplay
  ) {}

  /**
   * Request a move from the human player via the display
   */
  async requestMove(gameState: GameState): Promise<PlayerMove> {
    while (true) {
      try {
        const input = await this.display.requestMove(gameState);

        const from = PositionUtils.fromAlgebraic(input.from);
        const to = PositionUtils.fromAlgebraic(input.to);

        let promotionType: PieceType | undefined;
        if (input.promotion) {
          promotionType = this.parsePromotionType(input.promotion);
        }

        return { from, to, promotionType };
      } catch (error) {
        this.display.showError(
          error instanceof Error ? error.message : 'Invalid input'
        );
      }
    }
  }

  /**
   * Parse promotion type from string
   */
  private parsePromotionType(promotion: string): PieceType {
    const normalized = promotion.toLowerCase();
    switch (normalized) {
      case 'q':
      case 'queen':
        return PieceType.Queen;
      case 'r':
      case 'rook':
        return PieceType.Rook;
      case 'b':
      case 'bishop':
        return PieceType.Bishop;
      case 'n':
      case 'knight':
        return PieceType.Knight;
      default:
        throw new Error('Invalid promotion type');
    }
  }

  onGameStart(gameState: GameState): void {
    this.display.showMessage(`Game started! You are playing as ${this.color}.`);
    this.display.showGameState(gameState);
  }

  onGameEnd(gameState: GameState): void {
    this.display.showMessage(`Game ended: ${gameState.result}`);
    if (gameState.endReason) {
      this.display.showMessage(`Reason: ${gameState.endReason}`);
    }
  }

  onCheck(_gameState: GameState): void {
    this.display.showMessage('You are in check!');
  }
}
