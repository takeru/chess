import { FenError, START_FEN, parseFen, toFen } from './fen.js';
import { applyMove, isInCheck, legalMoves, positionKey } from './movegen.js';
import { moveToSan, moveToUci, parseMove } from './notation.js';
import { type Color, type Move, type Position, type RuleStatus, opposite } from './types.js';

export interface PlayedMove {
  move: Move;
  san: string;
  uci: string;
  /** FEN of the position after this move. */
  fen: string;
}

/**
 * A game from a starting position: the move history plus everything needed to apply the
 * rules that depend on history (threefold repetition) and to detect the end of the game.
 */
export class Game {
  readonly initialFen: string;
  private pos: Position;
  private readonly played: PlayedMove[] = [];
  private readonly repetitions = new Map<string, number>();
  private legalCache: Move[] | null = null;

  constructor(fen: string = START_FEN) {
    this.pos = parseFen(fen);
    if (isInCheck(this.pos, opposite(this.pos.turn))) {
      throw new FenError('The side that is not to move cannot be in check');
    }
    this.initialFen = toFen(this.pos);
    this.countRepetition();
  }

  /** Rebuild a game from its starting FEN and a list of moves (UCI or SAN). */
  static replay(moves: readonly string[], fen: string = START_FEN): Game {
    const game = new Game(fen);
    for (const move of moves) game.move(move);
    return game;
  }

  get position(): Position {
    return this.pos;
  }

  get turn(): Color {
    return this.pos.turn;
  }

  get history(): readonly PlayedMove[] {
    return this.played;
  }

  fen(): string {
    return toFen(this.pos);
  }

  legalMoves(): Move[] {
    this.legalCache ??= legalMoves(this.pos);
    return this.legalCache;
  }

  inCheck(): boolean {
    return isInCheck(this.pos);
  }

  /** Plays a move given in UCI or SAN. Throws IllegalMoveError if illegal or the game is over. */
  move(input: string): PlayedMove {
    const status = this.status();
    if (status.over) throw new Error(`Game is over (${status.reason})`);
    const legal = this.legalMoves();
    const move = parseMove(this.pos, input, legal);
    const san = moveToSan(this.pos, move, legal);
    this.pos = applyMove(this.pos, move);
    this.legalCache = null;
    this.countRepetition();
    const played: PlayedMove = { move, san, uci: moveToUci(move), fen: toFen(this.pos) };
    this.played.push(played);
    return played;
  }

  status(): RuleStatus {
    if (this.legalMoves().length === 0) {
      if (this.inCheck()) {
        return { over: true, result: this.pos.turn === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
      }
      return { over: true, result: '1/2-1/2', reason: 'stalemate' };
    }
    if (isInsufficientMaterial(this.pos)) {
      return { over: true, result: '1/2-1/2', reason: 'insufficient_material' };
    }
    if ((this.repetitions.get(positionKey(this.pos)) ?? 0) >= 3) {
      return { over: true, result: '1/2-1/2', reason: 'threefold_repetition' };
    }
    if (this.pos.halfmoveClock >= 100) {
      return { over: true, result: '1/2-1/2', reason: 'fifty_move_rule' };
    }
    return { over: false };
  }

  private countRepetition(): void {
    const key = positionKey(this.pos);
    this.repetitions.set(key, (this.repetitions.get(key) ?? 0) + 1);
  }
}

/**
 * True when neither side can possibly checkmate: K v K, K+minor v K,
 * or only bishops besides the kings, all on squares of one color.
 */
export function isInsufficientMaterial(pos: Position): boolean {
  const others: { type: string; square: number }[] = [];
  pos.board.forEach((p, square) => {
    if (p && p.type !== 'k') others.push({ type: p.type, square });
  });
  if (others.length === 0) return true;
  if (others.length === 1) return others[0]!.type === 'n' || others[0]!.type === 'b';
  if (others.every((p) => p.type === 'b')) {
    const shade = (sq: number) => ((sq >> 3) + (sq & 7)) % 2;
    return others.every((p) => shade(p.square) === shade(others[0]!.square));
  }
  return false;
}

export interface PgnOptions {
  headers?: Record<string, string>;
  result?: string;
}

export function toPgn(game: Game, { headers = {}, result = '*' }: PgnOptions = {}): string {
  const tags: Record<string, string> = {
    Event: '?',
    Site: '?',
    Date: '????.??.??',
    Round: '-',
    White: '?',
    Black: '?',
    ...headers,
    Result: result,
  };
  if (game.initialFen !== START_FEN) {
    tags.SetUp = '1';
    tags.FEN = game.initialFen;
  }
  const lines = Object.entries(tags).map(([k, v]) => `[${k} "${v.replace(/["\\]/g, '\\$&')}"]`);

  const start = parseFen(game.initialFen);
  let moveNumber = start.fullmoveNumber;
  let turn = start.turn;
  const tokens: string[] = [];
  game.history.forEach((m, i) => {
    if (turn === 'w') tokens.push(`${moveNumber}.`);
    else if (i === 0) tokens.push(`${moveNumber}...`);
    tokens.push(m.san);
    if (turn === 'b') moveNumber += 1;
    turn = turn === 'w' ? 'b' : 'w';
  });
  tokens.push(result);

  const movetext: string[] = [];
  let line = '';
  for (const token of tokens) {
    if (line && line.length + token.length + 1 > 80) {
      movetext.push(line);
      line = token;
    } else {
      line = line ? `${line} ${token}` : token;
    }
  }
  movetext.push(line);
  return `${lines.join('\n')}\n\n${movetext.join('\n')}\n`;
}
