import type {
  ApiErrorBody,
  CreateGameRequest,
  DrawAction,
  ErrorCode,
  GameResponse,
  GameView,
  JoinGameRequest,
  ListGamesResponse,
  LobbyEntry,
  Seat,
  SeatResponse,
  ServerMessage,
} from '@chess/protocol';

export type * from '@chess/protocol';
export { otherSide } from '@chess/protocol';

export class ChessApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ChessApiError';
  }
}

export interface ClientOptions {
  /** Server origin, e.g. `https://chess.example.workers.dev`. Defaults to the page origin in browsers. */
  baseUrl?: string;
  fetch?: typeof fetch;
  WebSocket?: typeof WebSocket;
}

export interface WatchOptions {
  onError?: (error: unknown) => void;
  /** Called with `true` when the live connection is up and `false` while reconnecting. */
  onConnectionChange?: (connected: boolean) => void;
}

/** Thin, dependency-free client for the chess API. Every operation maps to one HTTP call. */
export class ChessClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly WebSocketImpl: typeof WebSocket | undefined;

  constructor({ baseUrl, fetch: fetchImpl, WebSocket: ws }: ClientOptions = {}) {
    const origin = baseUrl ?? (typeof location !== 'undefined' ? location.origin : undefined);
    if (!origin) throw new Error('ChessClient needs a baseUrl outside the browser');
    this.baseUrl = origin.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.WebSocketImpl = ws ?? globalThis.WebSocket;
  }

  async listGames(): Promise<LobbyEntry[]> {
    return (await this.request<ListGamesResponse>('GET', '/api/games')).games;
  }

  createGame(options: CreateGameRequest = {}): Promise<SeatResponse> {
    return this.request<SeatResponse>('POST', '/api/games', options);
  }

  joinGame(gameId: string, options: JoinGameRequest = {}): Promise<SeatResponse> {
    return this.request<SeatResponse>('POST', `/api/games/${encodeURIComponent(gameId)}/join`, options);
  }

  /**
   * Fetches the game. With `waitForVersion`, the server holds the request until the game
   * has moved past that version (or `timeoutSeconds` elapse) — simple long polling.
   */
  async getGame(
    gameId: string,
    { waitForVersion, timeoutSeconds, signal }: { waitForVersion?: number; timeoutSeconds?: number; signal?: AbortSignal } = {},
  ): Promise<GameView> {
    const params = new URLSearchParams();
    if (waitForVersion !== undefined) params.set('wait', String(waitForVersion));
    if (timeoutSeconds !== undefined) params.set('timeout', String(timeoutSeconds));
    const query = params.toString() ? `?${params}` : '';
    const path = `/api/games/${encodeURIComponent(gameId)}${query}`;
    return (await this.request<GameResponse>('GET', path, undefined, undefined, signal)).game;
  }

  async move(seat: Seat, move: string): Promise<GameView> {
    return (await this.request<GameResponse>('POST', `${gamePath(seat)}/move`, { move }, seat.token)).game;
  }

  async resign(seat: Seat): Promise<GameView> {
    return (await this.request<GameResponse>('POST', `${gamePath(seat)}/resign`, {}, seat.token)).game;
  }

  async draw(seat: Seat, action: DrawAction): Promise<GameView> {
    return (await this.request<GameResponse>('POST', `${gamePath(seat)}/draw`, { action }, seat.token)).game;
  }

  async pgn(gameId: string): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/games/${encodeURIComponent(gameId)}/pgn`);
    if (!res.ok) throw await toError(res);
    return res.text();
  }

  /**
   * Calls `onUpdate` with the current game and then with every change, until the returned
   * function is called. Uses a WebSocket and reconnects automatically; falls back to long
   * polling where WebSocket is unavailable. Updates never go backwards in version.
   */
  watch(gameId: string, onUpdate: (game: GameView) => void, options: WatchOptions = {}): () => void {
    let stopped = false;
    let lastVersion = -1;
    const deliver = (game: GameView) => {
      if (stopped || game.version <= lastVersion) return;
      lastVersion = game.version;
      onUpdate(game);
    };
    const stop = this.WebSocketImpl
      ? this.watchSocket(gameId, deliver, options)
      : this.watchPolling(gameId, deliver, () => lastVersion, options);
    return () => {
      stopped = true;
      stop();
    };
  }

  private watchSocket(gameId: string, deliver: (game: GameView) => void, { onError, onConnectionChange }: WatchOptions) {
    const url = `${this.baseUrl.replace(/^http/, 'ws')}/api/games/${encodeURIComponent(gameId)}/ws`;
    let socket: WebSocket | null = null;
    let stopped = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    const connect = () => {
      const ws = new this.WebSocketImpl!(url);
      socket = ws;
      ws.addEventListener('open', () => {
        retry = 0;
        onConnectionChange?.(true);
        pingTimer = setInterval(() => ws.readyState === ws.OPEN && ws.send('ping'), 25_000);
      });
      ws.addEventListener('message', (event) => {
        if (event.data === 'pong') return;
        try {
          const message = JSON.parse(String(event.data)) as ServerMessage;
          if (message.type === 'state') deliver(message.game);
        } catch (error) {
          onError?.(error);
        }
      });
      ws.addEventListener('error', () => {
        // A close event always follows; reconnecting happens there.
      });
      ws.addEventListener('close', () => {
        clearInterval(pingTimer);
        if (stopped) return;
        onConnectionChange?.(false);
        const delay = Math.min(1000 * 2 ** retry, 15_000);
        retry += 1;
        retryTimer = setTimeout(connect, delay);
      });
    };
    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      socket?.close();
    };
  }

  private watchPolling(
    gameId: string,
    deliver: (game: GameView) => void,
    lastVersion: () => number,
    { onError, onConnectionChange }: WatchOptions,
  ) {
    const controller = new AbortController();
    const loop = async () => {
      let first = true;
      while (!controller.signal.aborted) {
        try {
          const game = await this.getGame(gameId, {
            waitForVersion: first ? undefined : lastVersion(),
            timeoutSeconds: 30,
            signal: controller.signal,
          });
          if (first) onConnectionChange?.(true);
          first = false;
          deliver(game);
          if (game.status === 'finished') {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          onConnectionChange?.(false);
          onError?.(error);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    };
    void loop();
    return () => controller.abort();
  }

  private async request<T>(method: string, path: string, body?: unknown, token?: string, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw await toError(res);
    return (await res.json()) as T;
  }
}

function gamePath(seat: Seat): string {
  return `/api/games/${encodeURIComponent(seat.gameId)}`;
}

async function toError(res: Response): Promise<ChessApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ChessApiError(res.status, body.error.code, body.error.message);
  } catch {
    return new ChessApiError(res.status, 'internal', `HTTP ${res.status}`);
  }
}
