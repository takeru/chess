import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { ApiErrorBody, GameResponse, GameView, ListGamesResponse, SeatResponse, ServerMessage } from '@chess/protocol';

const BASE = 'https://chess.test';

async function api<T>(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await SELF.fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: (text && res.headers.get('Content-Type')?.includes('json') ? JSON.parse(text) : text) as T };
}

async function startGame() {
  const created = await api<SeatResponse>('POST', '/api/games', { name: 'Alice', side: 'white' });
  expect(created.status).toBe(201);
  const joined = await api<SeatResponse>('POST', `/api/games/${created.data.game.id}/join`, { name: 'Bob' });
  expect(joined.status).toBe(200);
  return { id: created.data.game.id, white: created.data.seat.token, black: joined.data.seat.token };
}

describe('game lifecycle', () => {
  it('creates a game, lists it in the lobby, and removes it once joined', async () => {
    const { status, data } = await api<SeatResponse>('POST', '/api/games', { name: 'Alice', side: 'black' });
    expect(status).toBe(201);
    expect(data.seat).toMatchObject({ side: 'black', gameId: data.game.id });
    expect(data.seat.token.length).toBeGreaterThan(20);
    expect(data.game).toMatchObject({
      status: 'waiting',
      turn: 'white',
      players: { white: null, black: { name: 'Alice' } },
      legalMoves: [],
    });

    const lobby = await api<ListGamesResponse>('GET', '/api/games');
    expect(lobby.data.games).toContainEqual(expect.objectContaining({ id: data.game.id, host: 'Alice', openSide: 'white' }));

    const joined = await api<SeatResponse>('POST', `/api/games/${data.game.id}/join`, { name: 'Bob' });
    expect(joined.data.seat.side).toBe('white');
    expect(joined.data.game.status).toBe('active');
    expect(joined.data.game.legalMoves).toHaveLength(20);

    const after = await api<ListGamesResponse>('GET', '/api/games');
    expect(after.data.games.map((g) => g.id)).not.toContain(data.game.id);

    const full = await api<ApiErrorBody>('POST', `/api/games/${data.game.id}/join`, {});
    expect(full.status).toBe(409);
    expect(full.data.error.code).toBe('game_full');
  });

  it('strips control characters from player names', async () => {
    const { data } = await api<SeatResponse>('POST', '/api/games', { name: 'Eve\u001b[2J\nX', side: 'white' });
    expect(data.game.players.white?.name).toBe('Eve [2J X');
  });

  it('keeps private games out of the lobby', async () => {
    const { data } = await api<SeatResponse>('POST', '/api/games', { visibility: 'private' });
    const lobby = await api<ListGamesResponse>('GET', '/api/games');
    expect(lobby.data.games.map((g) => g.id)).not.toContain(data.game.id);
  });

  it("plays to checkmate (fool's mate) with SAN and UCI moves", async () => {
    const { id, white, black } = await startGame();
    await api('POST', `/api/games/${id}/move`, { move: 'f3' }, white);
    await api('POST', `/api/games/${id}/move`, { move: 'e7e5' }, black);
    await api('POST', `/api/games/${id}/move`, { move: 'g4' }, white);
    const { status, data } = await api<GameResponse>('POST', `/api/games/${id}/move`, { move: 'Qh4#' }, black);
    expect(status).toBe(200);
    expect(data.game).toMatchObject({ status: 'finished', result: '0-1', reason: 'checkmate', check: true, legalMoves: [] });
    expect(data.game.moves.map((m) => m.san)).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
    expect(data.game.version).toBe(6);

    const pgn = await api<string>('GET', `/api/games/${id}/pgn`);
    expect(pgn.data).toContain('[White "Alice"]');
    expect(pgn.data).toContain('1. f3 e5 2. g4 Qh4# 0-1');
  });

  it('starts from a custom FEN', async () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const { data } = await api<SeatResponse>('POST', '/api/games', { fen });
    expect(data.game.fen).toBe(fen);
    const bad = await api<ApiErrorBody>('POST', '/api/games', { fen: 'nonsense' });
    expect(bad.status).toBe(400);
    expect(bad.data.error.message).toMatch(/Invalid FEN/);
  });
});

describe('move validation', () => {
  it('rejects moves without a valid token, out of turn, or illegal', async () => {
    const { id, white, black } = await startGame();

    const noToken = await api<ApiErrorBody>('POST', `/api/games/${id}/move`, { move: 'e4' });
    expect(noToken.status).toBe(401);
    const wrongToken = await api<ApiErrorBody>('POST', `/api/games/${id}/move`, { move: 'e4' }, 'nope');
    expect(wrongToken.status).toBe(403);
    const outOfTurn = await api<ApiErrorBody>('POST', `/api/games/${id}/move`, { move: 'e5' }, black);
    expect(outOfTurn.data.error.code).toBe('not_your_turn');
    const illegal = await api<ApiErrorBody>('POST', `/api/games/${id}/move`, { move: 'e2e5' }, white);
    expect(illegal.status).toBe(422);
    expect(illegal.data.error.code).toBe('illegal_move');
    const missing = await api<ApiErrorBody>('POST', `/api/games/${id}/move`, {}, white);
    expect(missing.status).toBe(400);

    const view = await api<GameResponse>('GET', `/api/games/${id}`);
    expect(view.data.game.moves).toHaveLength(0);
  });

  it('refuses to move before an opponent joins', async () => {
    const { data } = await api<SeatResponse>('POST', '/api/games', { side: 'white' });
    const res = await api<ApiErrorBody>('POST', `/api/games/${data.game.id}/move`, { move: 'e4' }, data.seat.token);
    expect(res.data.error.code).toBe('game_not_active');
  });
});

describe('resign and draws', () => {
  it('resigning gives the win to the opponent', async () => {
    const { id, black } = await startGame();
    const { data } = await api<GameResponse>('POST', `/api/games/${id}/resign`, undefined, black);
    expect(data.game).toMatchObject({ status: 'finished', result: '1-0', reason: 'resignation' });
  });

  it('resigning before anyone joins aborts the game', async () => {
    const { data } = await api<SeatResponse>('POST', '/api/games', {});
    const res = await api<GameResponse>('POST', `/api/games/${data.game.id}/resign`, undefined, data.seat.token);
    expect(res.data.game).toMatchObject({ status: 'finished', result: null, reason: 'aborted' });
    const lobby = await api<ListGamesResponse>('GET', '/api/games');
    expect(lobby.data.games.map((g) => g.id)).not.toContain(data.game.id);
  });

  it('handles draw offer, decline by moving, and agreement', async () => {
    const { id, white, black } = await startGame();
    let res = await api<GameResponse>('POST', `/api/games/${id}/draw`, { action: 'offer' }, white);
    expect(res.data.game.drawOffer).toBe('white');

    const selfAccept = await api<ApiErrorBody>('POST', `/api/games/${id}/draw`, { action: 'accept' }, white);
    expect(selfAccept.status).toBe(400);

    await api('POST', `/api/games/${id}/move`, { move: 'e4' }, white);
    res = await api<GameResponse>('POST', `/api/games/${id}/move`, { move: 'e5' }, black);
    expect(res.data.game.drawOffer).toBeNull();

    await api('POST', `/api/games/${id}/draw`, { action: 'offer' }, black);
    res = await api<GameResponse>('POST', `/api/games/${id}/draw`, { action: 'accept' }, white);
    expect(res.data.game).toMatchObject({ status: 'finished', result: '1/2-1/2', reason: 'draw_agreement' });
  });
});

describe('real-time updates', () => {
  it('pushes state over WebSocket', async () => {
    const { id, white } = await startGame();
    const res = await SELF.fetch(`${BASE}/api/games/${id}/ws`, { headers: { Upgrade: 'websocket' } });
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    const received: GameView[] = [];
    const twoMessages = new Promise<void>((resolve) => {
      ws.addEventListener('message', (event) => {
        received.push((JSON.parse(event.data as string) as ServerMessage).game);
        if (received.length === 2) resolve();
      });
    });
    ws.accept();
    await api('POST', `/api/games/${id}/move`, { move: 'd4' }, white);
    await twoMessages;
    ws.close();
    expect(received[0]!.moves).toHaveLength(0);
    expect(received[1]!.moves.map((m) => m.san)).toEqual(['d4']);
  });

  it('long-polls until the version changes', async () => {
    const { id, white } = await startGame();
    const current = (await api<GameResponse>('GET', `/api/games/${id}`)).data.game.version;
    const waiting = api<GameResponse>('GET', `/api/games/${id}?wait=${current}&timeout=10`);
    await api('POST', `/api/games/${id}/move`, { move: 'c4' }, white);
    const { data } = await waiting;
    expect(data.game.version).toBe(current + 1);

    const immediate = await api<GameResponse>('GET', `/api/games/${id}?wait=${current - 1}`);
    expect(immediate.data.game.version).toBe(current + 1);
  });
});

describe('routing', () => {
  it('serves an index, 404s unknown games and endpoints, and answers CORS preflight', async () => {
    expect((await api('GET', '/api')).status).toBe(200);
    expect((await api('GET', '/api/health')).status).toBe(200);
    expect((await api<ApiErrorBody>('GET', '/api/games/zzzzzzzz')).data.error.code).toBe('not_found');
    expect((await api('GET', '/api/games/not-an-id')).status).toBe(404);
    expect((await api('GET', '/api/nope')).status).toBe(404);
    const preflight = await SELF.fetch(`${BASE}/api/games`, { method: 'OPTIONS' });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
