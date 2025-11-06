/**
 * Console display implementation
 */

import { IInteractiveDisplay } from '../../interfaces/display';
import { Move } from '../../domain/move';
import { GameState } from '../../domain/gameState';
import { ChessGameEvent } from '../../domain/events';
import * as readline from 'readline';

/**
 * Console/terminal display implementation
 */
export class ConsoleDisplay implements IInteractiveDisplay {
  private rl?: readline.Interface;

  constructor() {
    // Only create readline interface when needed
  }

  private ensureReadline(): readline.Interface {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }
    return this.rl;
  }

  /**
   * Display the current game state
   */
  showGameState(gameState: GameState): void {
    console.log('\n' + gameState.board.toString());
    console.log(`Turn: ${gameState.currentTurn}`);
    console.log(`Move: ${gameState.fullMoveNumber}`);

    if (gameState.isInCheck()) {
      console.log('CHECK!');
    }

    console.log('');
  }

  /**
   * Display a move
   */
  showMove(move: Move): void {
    console.log(`Move: ${move.toAlgebraic()}`);
  }

  /**
   * Display a message
   */
  showMessage(message: string): void {
    console.log(message);
  }

  /**
   * Display an error
   */
  showError(error: string): void {
    console.error(`Error: ${error}`);
  }

  /**
   * Handle a game event
   */
  onGameEvent(event: ChessGameEvent): void {
    switch (event.type) {
      case 'move_made':
        this.showMove(event.move);
        this.showGameState(event.gameState);
        break;
      case 'check':
        this.showMessage(`${event.color} is in check!`);
        break;
      case 'game_end':
        this.showMessage(`Game ended: ${event.result}`);
        this.showMessage(`Reason: ${event.reason}`);
        break;
      case 'game_start':
        this.showMessage('Game started!');
        this.showGameState(event.gameState);
        break;
      case 'turn_change':
        this.showMessage(`${event.color}'s turn`);
        break;
    }
  }

  /**
   * Clear the display
   */
  clear(): void {
    console.clear();
  }

  /**
   * Request input from the user
   */
  async requestInput(prompt: string): Promise<string> {
    const rl = this.ensureReadline();
    return new Promise((resolve) => {
      rl.question(prompt, (answer: string) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Request a move from the user
   */
  async requestMove(_gameState: GameState): Promise<{ from: string; to: string; promotion?: string }> {
    const input = await this.requestInput('Enter move (e.g., e2 e4 or e7 e8 q for promotion): ');

    const parts = input.split(/\s+/);
    if (parts.length < 2) {
      throw new Error('Invalid move format. Use: from to [promotion]');
    }

    return {
      from: parts[0],
      to: parts[1],
      promotion: parts[2],
    };
  }

  /**
   * Request confirmation from the user
   */
  async requestConfirmation(message: string): Promise<boolean> {
    const answer = await this.requestInput(`${message} (y/n): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  /**
   * Close the readline interface
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = undefined;
    }
  }
}
