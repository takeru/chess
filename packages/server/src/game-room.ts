import { DurableObject } from 'cloudflare:workers';
import { FenError, Game, IllegalMoveError, moveToUci, toPgn } from '@chess/engine';
import {
  type DrawAction,
  type GameResult,
  type GameStatus,
  type GameView,
  type MoveRecord,
  type PlayerInfo,
  type SeatResponse,
  type ServerMessage,
  type Side,
  type TerminationReason,
  type Visibility,
  MAX_NAME_LENGTH,
  otherSide,
  sideOfTurn,
} from '@chess/protocol';
import { ApiError, CORS_HEADERS, bearerToken, errorResponse, json, readJson } from './http.js';
import type { Env } from './env.js';

interface StoredPlayer extends PlayerInfo {
  tokenHash: string;
}

interface StoredGame {
  id: string;
  status: GameStatus;
  version: number;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  initialFen: string;
  moves: MoveRecord[];
  players: { white: StoredPlayer | null; black: StoredPlayer | null };
  drawOffer: Side | null;
  result: GameResult | null;
  reason: TerminationReason | null;
}

type Body = Record<string, unknown>;

const STORAGE_KEY = 'game';
const MAX_WAIT_SECONDS = 60;

/** Paths of the internal requests the Worker forwards to a game room. */
export type RoomAction = 'create' | 'view' | 'join' | 'move' | 'resign' | 'draw' | 'pgn' | 'ws';

/**
 * One Durable Object per game. It is the single source of truth for that game:
 * every action is validated here against the rules, so clients cannot cheat.
 */
export class GameRoom extends DurableObject<Env> {
  private state: StoredGame | null | undefined;
  private engine: Game | null = null;
  private waiters = new Set<() => void>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  override async fetch(request: Request): Promise<Response> {
    const action = new URL(request.url).pathname.slice(1) as RoomAction;
    try {
      // Read the body up front so it is consumed even when the request is rejected early.
      const body = request.method === 'POST' ? await readJson(request) : {};
      if (action === 'create') return json(await this.create(body), 201);

      const game = await this.load();
      switch (action) {
        case 'view':
          return json({ game: await this.waitForChange(game, request) });
        case 'pgn':
          return new Response(this.pgn(game), {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS_HEADERS },
          });
        case 'ws':
          return this.acceptWebSocket(request);
        case 'join':
          return json(await this.join(game, body));
        case 'move':
          return json({ game: await this.move(game, request, body) });
        case 'resign':
          return json({ game: await this.resign(game, request) });
        case 'draw':
          return json({ game: await this.draw(game, request, body) });
        default:
          throw new ApiError('not_found', 'Unknown action');
      }
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      console.error(error);
      return errorResponse(new ApiError('internal', 'Internal server error'));
    }
  }

  // --- actions -------------------------------------------------------------

  private async create(body: Body): Promise<SeatResponse> {
    if (await this.load(false)) throw new ApiError('bad_request', 'Game already exists');
    const id = String(body.id);
    const name = parseName(body.name);
    const side = body.side ?? 'random';
    if (side !== 'white' && side !== 'black' && side !== 'random') {
      throw new ApiError('bad_request', '"side" must be "white", "black" or "random"');
    }
    const visibility = body.visibility ?? 'public';
    if (visibility !== 'public' && visibility !== 'private') {
      throw new ApiError('bad_request', '"visibility" must be "public" or "private"');
    }

    let engine: Game;
    try {
      engine = body.fen === undefined ? new Game() : new Game(String(body.fen));
    } catch (error) {
      if (error instanceof FenError) throw new ApiError('bad_request', `Invalid FEN: ${error.message}`);
      throw error;
    }
    if (engine.status().over) throw new ApiError('bad_request', 'The starting position is already decided');

    const seatSide: Side = side === 'random' ? (crypto.getRandomValues(new Uint8Array(1))[0]! & 1 ? 'white' : 'black') : side;
    const token = randomToken();
    const now = new Date().toISOString();
    const game: StoredGame = {
      id,
      status: 'waiting',
      version: 1,
      visibility,
      createdAt: now,
      updatedAt: now,
      initialFen: engine.initialFen,
      moves: [],
      players: { white: null, black: null },
      drawOffer: null,
      result: null,
      reason: null,
    };
    game.players[seatSide] = { name, joinedAt: now, tokenHash: await sha256(token) };
    this.engine = engine;
    await this.save(game);
    if (visibility === 'public') {
      await this.lobby().add({ id, createdAt: now, host: name, openSide: otherSide(seatSide) });
    }
    return { game: this.view(game), seat: { gameId: id, side: seatSide, token } };
  }

  private async join(game: StoredGame, body: Body): Promise<SeatResponse> {
    if (game.status !== 'waiting') throw new ApiError('game_full', 'This game already has two players');
    const side: Side = game.players.white ? 'black' : 'white';
    const token = randomToken();
    const now = new Date().toISOString();
    game.players[side] = { name: parseName(body.name), joinedAt: now, tokenHash: await sha256(token) };
    game.status = 'active';
    await this.commit(game);
    await this.lobby().remove(game.id);
    return { game: this.view(game), seat: { gameId: game.id, side, token } };
  }

  private async move(game: StoredGame, request: Request, body: Body): Promise<GameView> {
    const side = await this.authenticate(game, request);
    if (typeof body.move !== 'string') throw new ApiError('bad_request', '"move" must be a string, e.g. "e2e4" or "e4"');
    this.requireActive(game);
    const engine = this.getEngine(game);
    if (sideOfTurn(engine.turn) !== side) throw new ApiError('not_your_turn', `It is ${sideOfTurn(engine.turn)}'s turn`);

    let played;
    try {
      played = engine.move(body.move);
    } catch (error) {
      if (error instanceof IllegalMoveError) throw new ApiError('illegal_move', error.message);
      throw error;
    }
    game.moves.push({ uci: played.uci, san: played.san, side, fen: played.fen, at: new Date().toISOString() });
    // Moving instead of answering a draw offer declines it.
    if (game.drawOffer === otherSide(side)) game.drawOffer = null;

    const status = engine.status();
    if (status.over) this.finish(game, status.result, status.reason);
    await this.commit(game);
    return this.view(game);
  }

  private async resign(game: StoredGame, request: Request): Promise<GameView> {
    const side = await this.authenticate(game, request);
    if (game.status === 'waiting') {
      this.finish(game, null, 'aborted');
      await this.commit(game);
      await this.lobby().remove(game.id);
    } else {
      this.requireActive(game);
      this.finish(game, side === 'white' ? '0-1' : '1-0', 'resignation');
      await this.commit(game);
    }
    return this.view(game);
  }

  private async draw(game: StoredGame, request: Request, { action }: Body): Promise<GameView> {
    const side = await this.authenticate(game, request);
    if (action !== 'offer' && action !== 'accept' && action !== 'decline') {
      throw new ApiError('bad_request', '"action" must be "offer", "accept" or "decline"');
    }
    this.requireActive(game);
    const opponentOffered = game.drawOffer === otherSide(side);

    switch (action as DrawAction) {
      case 'offer':
      case 'accept':
        if (opponentOffered) {
          this.finish(game, '1/2-1/2', 'draw_agreement');
        } else if (action === 'accept') {
          throw new ApiError('bad_request', 'There is no draw offer to accept');
        } else if (game.drawOffer === side) {
          return this.view(game);
        } else {
          game.drawOffer = side;
        }
        break;
      case 'decline':
        // Declines the opponent's offer, or withdraws one's own.
        if (!game.drawOffer) throw new ApiError('bad_request', 'There is no draw offer to decline');
        game.drawOffer = null;
        break;
    }
    await this.commit(game);
    return this.view(game);
  }

  private pgn(game: StoredGame): string {
    const date = game.createdAt.slice(0, 10).replace(/-/g, '.');
    return toPgn(this.getEngine(game), {
      result: game.result ?? '*',
      headers: {
        Event: 'Casual game',
        Site: `chess game ${game.id}`,
        Date: date,
        White: game.players.white?.name ?? '?',
        Black: game.players.black?.name ?? '?',
        ...(game.reason ? { Termination: game.reason } : {}),
      },
    });
  }

  /** Long polling: `?wait=<version>` holds the request until the game moves past that version. */
  private async waitForChange(game: StoredGame, request: Request): Promise<GameView> {
    const params = new URL(request.url).searchParams;
    const wait = params.get('wait');
    if (wait === null) return this.view(game);
    const version = Number(wait);
    if (!Number.isInteger(version)) throw new ApiError('bad_request', '"wait" must be a version number');
    const timeout = Math.min(Number(params.get('timeout') ?? 30) || 30, MAX_WAIT_SECONDS) * 1000;

    if (game.version <= version && game.status !== 'finished') {
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          this.waiters.delete(done);
          resolve();
        };
        const timer = setTimeout(done, timeout);
        this.waiters.add(done);
      });
    }
    return this.view(this.state!);
  }

  private acceptWebSocket(request: Request): Response {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      throw new ApiError('bad_request', 'Expected a WebSocket upgrade request');
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ type: 'state', game: this.view(this.state!) } satisfies ServerMessage));
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(): Promise<void> {
    // The socket only pushes updates; actions go through the HTTP API. "ping" is answered automatically.
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code, 'closing');
    } catch {
      // Already closed.
    }
  }

  // --- helpers -------------------------------------------------------------

  private async load(required = true): Promise<StoredGame> {
    if (this.state === undefined) {
      this.state = (await this.ctx.storage.get<StoredGame>(STORAGE_KEY)) ?? null;
    }
    if (!this.state && required) throw new ApiError('not_found', 'Game not found');
    return this.state!;
  }

  private getEngine(game: StoredGame): Game {
    this.engine ??= Game.replay(
      game.moves.map((m) => m.uci),
      game.initialFen,
    );
    return this.engine;
  }

  private async save(game: StoredGame): Promise<void> {
    this.state = game;
    await this.ctx.storage.put(STORAGE_KEY, game);
  }

  /** Persists a change, then notifies WebSocket subscribers and long-polling requests. */
  private async commit(game: StoredGame): Promise<void> {
    game.version += 1;
    game.updatedAt = new Date().toISOString();
    await this.save(game);
    const message = JSON.stringify({ type: 'state', game: this.view(game) } satisfies ServerMessage);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch {
        // The socket is already closing; nothing to do.
      }
    }
    for (const resolve of [...this.waiters]) resolve();
  }

  private finish(game: StoredGame, result: GameResult | null, reason: TerminationReason): void {
    game.status = 'finished';
    game.result = result;
    game.reason = reason;
    game.drawOffer = null;
  }

  private requireActive(game: StoredGame): void {
    if (game.status === 'waiting') throw new ApiError('game_not_active', 'Waiting for an opponent to join');
    if (game.status === 'finished') throw new ApiError('game_not_active', 'The game is over');
  }

  /** Returns the side the bearer token sits on. */
  private async authenticate(game: StoredGame, request: Request): Promise<Side> {
    const hash = await sha256(bearerToken(request));
    for (const side of ['white', 'black'] as const) {
      if (game.players[side]?.tokenHash === hash) return side;
    }
    throw new ApiError('forbidden', 'This token does not belong to a player of this game');
  }

  private view(game: StoredGame): GameView {
    const engine = this.getEngine(game);
    const player = (p: StoredPlayer | null): PlayerInfo | null => (p ? { name: p.name, joinedAt: p.joinedAt } : null);
    return {
      id: game.id,
      status: game.status,
      version: game.version,
      visibility: game.visibility,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      initialFen: game.initialFen,
      fen: engine.fen(),
      turn: sideOfTurn(engine.turn),
      check: engine.inCheck(),
      moves: game.moves,
      legalMoves: game.status === 'active' ? engine.legalMoves().map(moveToUci) : [],
      players: { white: player(game.players.white), black: player(game.players.black) },
      drawOffer: game.drawOffer,
      result: game.result,
      reason: game.reason,
    };
  }

  private lobby() {
    return this.env.LOBBY.get(this.env.LOBBY.idFromName('global'));
  }
}

function parseName(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Anonymous';
  if (typeof value !== 'string') throw new ApiError('bad_request', '"name" must be a string');
  // Strip control characters so names cannot inject terminal escape sequences into CLI clients.
  const name = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) return 'Anonymous';
  if (name.length > MAX_NAME_LENGTH) throw new ApiError('bad_request', `"name" must be at most ${MAX_NAME_LENGTH} characters`);
  return name;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
