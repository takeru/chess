import { parseArgs } from 'node:util';
import { ChessApiError, ChessClient, type GameView, type Seat, type Side } from '@chess/client';
import { runBot } from './bot.js';
import { bold, describeStatus, dim, red, renderBoard, renderMoves } from './render.js';
import { runSession } from './session.js';
import { loadSeat, saveSeat } from './store.js';

const USAGE = `Usage: chess [--server URL] <command> [options]

Play:
  new [--side white|black|random] [--name NAME] [--private] [--fen FEN]
                         create a game and play it
  join <id> [--name NAME]
                         take the open seat of a game and play it
  play <id>              resume a game you are seated at
  watch <id>             follow a game as a spectator
  bot new|<id> [--depth N] [--name NAME] [--side ...]
                         let the built-in engine play a new game or join one

One-shot (for scripts):
  list                   public games waiting for an opponent
  show <id>              print the board and status
  move <id> <move>       play one move with your saved seat
  resign <id>            resign (or abort a game nobody joined)
  draw <id> offer|accept|decline
  pgn <id>               print the game record

Options:
  --server URL           API server (default: $CHESS_SERVER or http://localhost:8787)
  --json                 print raw API responses (one-shot commands)
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      server: { type: 'string' },
      name: { type: 'string' },
      side: { type: 'string' },
      fen: { type: 'string' },
      private: { type: 'boolean' },
      depth: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command, ...args] = positionals;
  if (!command || values.help) {
    console.log(USAGE);
    return;
  }

  const server = (values.server ?? process.env.CHESS_SERVER ?? 'http://localhost:8787').replace(/\/+$/, '');
  const client = new ChessClient({ baseUrl: server });
  const out = (data: unknown, text: () => string) => console.log(values.json ? JSON.stringify(data, null, 2) : text());

  const needId = () => {
    const id = args[0];
    if (!id) throw new UsageError(`"${command}" needs a game id`);
    return id;
  };
  const savedSeat = async (id: string): Promise<Seat> => {
    const seat = await loadSeat(server, id);
    if (!seat) throw new UsageError(`You have no seat in game ${id} on ${server}`);
    return seat;
  };
  const createOptions = () => {
    const side = values.side ?? 'random';
    if (side !== 'white' && side !== 'black' && side !== 'random') throw new UsageError('--side must be white, black or random');
    return { name: values.name, side: side as Side | 'random', fen: values.fen, visibility: values.private ? 'private' : 'public' } as const;
  };
  const announce = (seat: Seat) => {
    console.log(`Game ${bold(seat.gameId)} — you play ${bold(seat.side)}.`);
    console.log(dim(`Opponents can join with: chess --server ${server} join ${seat.gameId}   or open ${server}/game/${seat.gameId}`));
  };

  switch (command) {
    case 'new': {
      const { seat } = await client.createGame(createOptions());
      await saveSeat(server, seat);
      announce(seat);
      return runSession(client, seat.gameId, seat);
    }
    case 'join': {
      const { seat } = await client.joinGame(needId(), { name: values.name });
      await saveSeat(server, seat);
      console.log(`Joined game ${bold(seat.gameId)} as ${bold(seat.side)}.`);
      return runSession(client, seat.gameId, seat);
    }
    case 'play': {
      const id = needId();
      return runSession(client, id, await savedSeat(id));
    }
    case 'watch':
      return runSession(client, needId());
    case 'bot': {
      const target = args[0];
      if (!target) throw new UsageError('"bot" needs "new" or a game id');
      const depth = values.depth ? Number(values.depth) : 3;
      if (!Number.isInteger(depth) || depth < 1 || depth > 5) throw new UsageError('--depth must be 1..5');
      const name = values.name ?? `Bot (depth ${depth})`;
      const { seat } =
        target === 'new' ? await client.createGame({ ...createOptions(), name }) : await client.joinGame(target, { name });
      await saveSeat(server, seat);
      announce(seat);
      return runBot(client, seat, { depth });
    }
    case 'list': {
      const games = await client.listGames();
      return out({ games }, () =>
        games.length === 0
          ? 'No open games. Create one with: chess new'
          : games.map((g) => `${bold(g.id)}  ${g.host.padEnd(20)} you'd play ${g.openSide.padEnd(5)}  ${dim(g.createdAt)}`).join('\n'),
      );
    }
    case 'show': {
      const id = needId();
      const game = await client.getGame(id);
      const seat = await loadSeat(server, id);
      return out({ game }, () => `${renderBoard(game, seat?.side)}\n\n${renderMoves(game)}\n${describeStatus(game, seat?.side)}`);
    }
    case 'move': {
      const id = needId();
      const move = args[1];
      if (!move) throw new UsageError('"move" needs a move, e.g. chess move <id> e4');
      const seat = await savedSeat(id);
      const game = await client.move(seat, move);
      return out({ game }, () => `Played ${game.moves.at(-1)?.san}. ${statusLine(game, seat.side)}`);
    }
    case 'resign': {
      const id = needId();
      const seat = await savedSeat(id);
      const game = await client.resign(seat);
      return out({ game }, () => statusLine(game, seat.side));
    }
    case 'draw': {
      const id = needId();
      const action = args[1];
      if (action !== 'offer' && action !== 'accept' && action !== 'decline') {
        throw new UsageError('"draw" needs offer, accept or decline');
      }
      const seat = await savedSeat(id);
      const game = await client.draw(seat, action);
      return out({ game }, () => statusLine(game, seat.side));
    }
    case 'pgn':
      console.log(await client.pgn(needId()));
      return;
    default:
      throw new UsageError(`Unknown command "${command}"`);
  }
}

class UsageError extends Error {}

function statusLine(game: GameView, side: Side): string {
  return describeStatus(game, side).split('\n')[1]!;
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    if (error instanceof UsageError) {
      console.error(`${red(error.message)}\n\n${USAGE}`);
    } else if (error instanceof ChessApiError) {
      console.error(red(`${error.message} (${error.code})`));
    } else if (error instanceof TypeError && /fetch failed/.test(error.message)) {
      console.error(red(`Cannot reach the server. Is it running? (${(error.cause as Error | undefined)?.message ?? error.message})`));
    } else {
      console.error(error);
    }
    process.exit(1);
  },
);
