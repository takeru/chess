import { createInterface } from 'node:readline';
import { ChessApiError, type ChessClient, type GameView, type Seat, type Side } from '@chess/client';
import { legalMoves, moveToSan, parseFen } from '@chess/engine';
import { bold, describeStatus, dim, red, renderBoard, renderMoves } from './render.js';

const HELP = `Commands:
  <move>     play a move in SAN (e4, Nf3, O-O, e8=Q) or UCI (e2e4, e7e8q)
  moves      list your legal moves
  draw       offer a draw (or accept the opponent's offer)
  accept     accept a draw offer        decline   decline / withdraw a draw offer
  resign     resign the game (aborts it if nobody has joined yet)
  flip       turn the board around     pgn       print the game record
  help       show this help             quit      leave (the game continues on the server)`;

/** Interactive terminal session for a seat (playing) or for a spectator (seat undefined). */
export function runSession(client: ChessClient, gameId: string, seat?: Seat): Promise<void> {
  const me: Side | undefined = seat?.side;
  let perspective: Side = me ?? 'white';
  let current: GameView | undefined;

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  const print = (text: string) => {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
    console.log(text);
    if (seat) {
      rl.setPrompt(current?.status === 'active' && current.turn === me ? bold('your move> ') : '> ');
      rl.prompt(true);
    }
  };
  const show = () => {
    if (!current) return;
    print(`\n${renderBoard(current, perspective)}\n\n${dim(renderMoves(current))}\n${describeStatus(current, me)}`);
  };

  return new Promise<void>((resolve) => {
    let finished = false;
    const stopWatching = client.watch(
      gameId,
      (game) => {
        current = game;
        show();
        if (game.status === 'finished' && !finished) {
          finished = true;
          setTimeout(() => rl.close(), 50);
        }
      },
      {
        onConnectionChange: (connected) => {
          if (!connected) print(dim('Connection lost, reconnecting...'));
        },
        onError: (error) => print(red(String(error))),
      },
    );

    rl.on('close', () => {
      stopWatching();
      if (!finished && seat) console.log(dim(`\nLeft the game. Resume with: chess play ${gameId}`));
      resolve();
    });

    if (!seat) {
      console.log(dim('Watching. Press Ctrl+C to stop.'));
      return;
    }

    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) return show();
      try {
        switch (input.toLowerCase()) {
          case 'help':
          case '?':
            return print(HELP);
          case 'quit':
          case 'exit':
            return rl.close();
          case 'flip':
            perspective = perspective === 'white' ? 'black' : 'white';
            return show();
          case 'moves': {
            if (!current || current.status !== 'active' || current.turn !== me) return print('It is not your move.');
            const pos = parseFen(current.fen);
            const legal = legalMoves(pos);
            return print(legal.map((m) => moveToSan(pos, m, legal)).sort().join(' '));
          }
          case 'pgn':
            return print(await client.pgn(gameId));
          case 'resign':
            await client.resign(seat);
            return;
          case 'draw':
            await client.draw(seat, current?.drawOffer && current.drawOffer !== me ? 'accept' : 'offer');
            return;
          case 'accept':
            await client.draw(seat, 'accept');
            return;
          case 'decline':
            await client.draw(seat, 'decline');
            return;
          default:
            await client.move(seat, input);
        }
      } catch (error) {
        print(red(error instanceof ChessApiError ? error.message : String(error)));
      }
    });
  });
}
