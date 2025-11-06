/**
 * Example 1: Human vs Random CPU
 */

import {
  Color,
  LocalGameManager,
  HumanPlayer,
  RandomCpuPlayer,
  ConsoleDisplay,
  ChessGameEvent,
} from '../index';

async function main() {
  const display = new ConsoleDisplay();

  // Create players
  const whitePlayer = new HumanPlayer('human1', 'You', Color.White, display);
  const blackPlayer = new RandomCpuPlayer('cpu1', 'CPU', Color.Black, 1000);

  // Create game manager
  const gameManager = new LocalGameManager({
    whitePlayer,
    blackPlayer,
  });

  // Subscribe to game events
  gameManager.events.on('*', (event) => {
    display.onGameEvent?.(event as ChessGameEvent);
  });

  // Start the game
  console.log('Starting Human vs CPU game...\n');
  await gameManager.start();

  // Clean up
  display.close();
}

main().catch(console.error);
