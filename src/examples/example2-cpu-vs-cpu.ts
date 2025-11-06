/**
 * Example 2: CPU vs CPU
 */

import {
  Color,
  LocalGameManager,
  RandomCpuPlayer,
  ConsoleDisplay,
  ChessGameEvent,
} from '../index';

async function main() {
  const display = new ConsoleDisplay();

  // Create CPU players
  const whitePlayer = new RandomCpuPlayer('cpu1', 'CPU White', Color.White, 500);
  const blackPlayer = new RandomCpuPlayer('cpu2', 'CPU Black', Color.Black, 500);

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
  console.log('Starting CPU vs CPU game...\n');
  await gameManager.start();
}

main().catch(console.error);
