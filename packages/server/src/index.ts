import type { ListGamesResponse } from '@chess/protocol';
import type { Env } from './env.js';
import type { RoomAction } from './game-room.js';
import { ApiError, CORS_HEADERS, errorResponse, json } from './http.js';

export { GameRoom } from './game-room.js';
export { Lobby } from './lobby.js';

const GAME_ID = /^[a-z0-9]{8}$/;
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Public routes under /api/games/:id and the room action each one maps to. */
const GAME_ROUTES: Record<string, { method: string; action: RoomAction }> = {
  '': { method: 'GET', action: 'view' },
  join: { method: 'POST', action: 'join' },
  move: { method: 'POST', action: 'move' },
  resign: { method: 'POST', action: 'resign' },
  draw: { method: 'POST', action: 'draw' },
  pgn: { method: 'GET', action: 'pgn' },
  ws: { method: 'GET', action: 'ws' },
};

const API_INDEX = {
  name: 'chess',
  docs: 'https://github.com/takeru/chess/blob/main/docs/API.md',
  endpoints: [
    'GET  /api/games                 list public games waiting for an opponent',
    'POST /api/games                 create a game        {name?, side?, fen?, visibility?}',
    'GET  /api/games/:id             game state           ?wait=<version>&timeout=<s> to long-poll',
    'POST /api/games/:id/join        take the open seat   {name?}',
    'POST /api/games/:id/move        play a move          {move}            (Bearer token)',
    'POST /api/games/:id/resign      resign / abort                         (Bearer token)',
    'POST /api/games/:id/draw        offer/accept/decline {action}          (Bearer token)',
    'GET  /api/games/:id/pgn         game record as PGN',
    'GET  /api/games/:id/ws          WebSocket stream of state updates',
  ],
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    try {
      return await route(request, env, url);
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      console.error(error);
      return errorResponse(new ApiError('internal', 'Internal server error'));
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env, url: URL): Promise<Response> {
  const parts = url.pathname.replace(/\/+$/, '').split('/').slice(2);
  const [resource, id, sub = '', ...rest] = parts;

  if (resource === undefined) return json(API_INDEX);
  if (resource === 'health' && parts.length === 1) return json({ ok: true });
  if (resource !== 'games' || rest.length > 0) throw new ApiError('not_found', 'No such endpoint');

  if (id === undefined) {
    if (request.method === 'GET') {
      const games = await env.LOBBY.get(env.LOBBY.idFromName('global')).list();
      return json({ games } satisfies ListGamesResponse);
    }
    if (request.method === 'POST') return createGame(request, env);
    throw methodNotAllowed();
  }

  const route = GAME_ROUTES[sub];
  if (!route) throw new ApiError('not_found', 'No such endpoint');
  if (request.method !== route.method) throw methodNotAllowed();
  if (!GAME_ID.test(id)) throw new ApiError('not_found', 'Game not found');

  const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(id));
  return room.fetch(new Request(`https://room/${route.action}${url.search}`, request));
}

async function createGame(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  let parsed: unknown = {};
  try {
    parsed = body.trim() ? JSON.parse(body) : {};
  } catch {
    throw new ApiError('bad_request', 'Request body must be valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ApiError('bad_request', 'Request body must be a JSON object');
  }
  const id = newGameId();
  const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(id));
  return room.fetch('https://room/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...parsed, id }),
  });
}

function newGameId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

function methodNotAllowed(): ApiError {
  return new ApiError('bad_request', 'Method not allowed for this endpoint');
}
