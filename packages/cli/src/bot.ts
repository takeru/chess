import type { ChessClient, Seat } from '@chess/client';
import { findBestMove, moveToUci, parseFen } from '@chess/engine';
import { dim, renderMoves } from './render.js';

/** Plays `seat` automatically with the built-in engine until the game ends. */
export function runBot(client: ChessClient, seat: Seat, { depth = 3, quiet = false } = {}): Promise<void> {
  return new Promise((resolve) => {
    let thinkingAt = -1;
    let stop: () => void = () => {};
    stop = client.watch(
      seat.gameId,
      async (game) => {
        if (game.status === 'finished') {
          if (!quiet) console.log(`${renderMoves(game)}\nGame over: ${game.result ?? '-'} (${game.reason})`);
          stop();
          resolve();
          return;
        }
        if (game.status !== 'active' || game.turn !== seat.side || thinkingAt === game.version) return;
        thinkingAt = game.version;
        if (game.drawOffer && game.drawOffer !== seat.side) {
          // A bot happily takes a draw once the material is gone.
          if (game.fen.split(' ')[0]!.replace(/[^qrQR]/g, '').length === 0) {
            await client.draw(seat, 'accept');
            return;
          }
        }
        const move = findBestMove(parseFen(game.fen), { depth });
        if (!move) return;
        try {
          await client.move(seat, moveToUci(move));
          if (!quiet) console.log(dim(`${seat.side} plays ${moveToUci(move)}`));
        } catch (error) {
          console.error(error);
          thinkingAt = -1;
        }
      },
      { onError: (error) => console.error(error) },
    );
  });
}
