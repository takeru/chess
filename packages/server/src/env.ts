import type { GameRoom } from './game-room.js';
import type { Lobby } from './lobby.js';

export interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  LOBBY: DurableObjectNamespace<Lobby>;
  ASSETS: Fetcher;
}
