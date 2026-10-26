/**
 * Wire format of the chess API. Every client (CLI, Web, mobile apps, bots) speaks exactly this.
 * See docs/API.md for the endpoint reference.
 */

export type Side = 'white' | 'black';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameResult = '1-0' | '0-1' | '1/2-1/2';
export type Visibility = 'public' | 'private';

export type TerminationReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient_material'
  | 'fifty_move_rule'
  | 'threefold_repetition'
  | 'resignation'
  | 'draw_agreement'
  /** The creator cancelled the game before anybody joined. */
  | 'aborted';

export interface PlayerInfo {
  name: string;
  joinedAt: string;
}

export interface MoveRecord {
  /** Move in UCI notation, e.g. `e2e4`, `e7e8q`. */
  uci: string;
  /** Move in Standard Algebraic Notation, e.g. `e4`, `exd8=Q+`. */
  san: string;
  side: Side;
  /** FEN after the move. */
  fen: string;
  at: string;
}

export interface GameView {
  id: string;
  status: GameStatus;
  /** Increases by one on every change. Use it to order updates and for long polling. */
  version: number;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  initialFen: string;
  fen: string;
  turn: Side;
  check: boolean;
  moves: MoveRecord[];
  /** Legal moves for the side to move, in UCI. Empty unless the game is active. */
  legalMoves: string[];
  players: { white: PlayerInfo | null; black: PlayerInfo | null };
  /** Side that has offered a draw which the opponent has not answered yet. */
  drawOffer: Side | null;
  result: GameResult | null;
  reason: TerminationReason | null;
}

/** A seat at a game. The token authenticates every action taken from that seat; keep it secret. */
export interface Seat {
  gameId: string;
  side: Side;
  token: string;
}

export interface CreateGameRequest {
  /** Display name of the creator (default "Anonymous"). */
  name?: string;
  /** Side the creator plays (default "random"). */
  side?: Side | 'random';
  /** Optional starting position. */
  fen?: string;
  /** Public games are listed in the lobby (default "public"). */
  visibility?: Visibility;
}

export interface JoinGameRequest {
  name?: string;
}

export interface MoveRequest {
  /** UCI (`e2e4`) or SAN (`e4`). */
  move: string;
}

export type DrawAction = 'offer' | 'accept' | 'decline';

export interface DrawRequest {
  action: DrawAction;
}

/** Response of create and join. */
export interface SeatResponse {
  game: GameView;
  seat: Seat;
}

export interface GameResponse {
  game: GameView;
}

export interface LobbyEntry {
  id: string;
  createdAt: string;
  /** Name of the player waiting for an opponent. */
  host: string;
  /** Side the joining player will get. */
  openSide: Side;
}

export interface ListGamesResponse {
  games: LobbyEntry[];
}

export type ErrorCode =
  | 'bad_request'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'not_your_turn'
  | 'illegal_move'
  | 'game_full'
  | 'game_not_active'
  | 'internal';

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

/** Messages the server pushes over `GET /api/games/:id/ws`. */
export type ServerMessage = { type: 'state'; game: GameView };

export const MAX_NAME_LENGTH = 40;

export function sideOfTurn(turn: 'w' | 'b'): Side {
  return turn === 'w' ? 'white' : 'black';
}

export function otherSide(side: Side): Side {
  return side === 'white' ? 'black' : 'white';
}
