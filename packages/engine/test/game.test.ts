import { describe, expect, it } from 'vitest';
import { Game, findBestMove, parseFen, toPgn } from '../src/index.js';

describe('game status', () => {
  it('starts in progress', () => {
    expect(new Game().status()).toEqual({ over: false });
  });

  it("detects fool's mate", () => {
    const game = Game.replay(['f3', 'e5', 'g4', 'Qh4']);
    expect(game.status()).toEqual({ over: true, result: '0-1', reason: 'checkmate' });
    expect(() => game.move('a3')).toThrow(/over/);
  });

  it('detects stalemate', () => {
    const game = new Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(game.status()).toEqual({ over: true, result: '1/2-1/2', reason: 'stalemate' });
  });

  it('detects insufficient material', () => {
    const cases: [string, boolean][] = [
      ['8/8/4k3/8/8/4K3/8/8 w - - 0 1', true],
      ['8/8/4k3/8/8/4KN2/8/8 w - - 0 1', true],
      ['8/8/4k3/8/8/4KB2/8/8 w - - 0 1', true],
      ['8/8/2b1k3/8/8/4KB2/8/8 w - - 0 1', true],
      ['8/8/3bk3/8/8/4KB2/8/8 w - - 0 1', false],
      ['8/8/4k3/8/8/4KNN1/8/8 w - - 0 1', false],
      ['8/8/4k3/8/8/4KP2/8/8 w - - 0 1', false],
    ];
    for (const [fen, insufficient] of cases) {
      expect(new Game(fen).status().over, fen).toBe(insufficient);
    }
  });

  it('detects threefold repetition', () => {
    const game = new Game();
    const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
    for (const m of shuffle) game.move(m);
    expect(game.status().over).toBe(false);
    for (const m of shuffle) game.move(m);
    expect(game.status()).toEqual({ over: true, result: '1/2-1/2', reason: 'threefold_repetition' });
  });

  it('applies the fifty-move rule', () => {
    const game = new Game('8/8/4k3/8/8/4K3/R7/8 w - - 99 80');
    expect(game.status().over).toBe(false);
    game.move('Ra3');
    expect(game.status()).toEqual({ over: true, result: '1/2-1/2', reason: 'fifty_move_rule' });
  });

  it('prefers checkmate over the fifty-move rule', () => {
    const game = new Game('6k1/5ppp/8/8/8/8/8/R5K1 w - - 99 80');
    game.move('Ra8');
    expect(game.status()).toMatchObject({ reason: 'checkmate' });
  });
});

describe('PGN', () => {
  it('writes headers and movetext', () => {
    const game = Game.replay(['e4', 'e5', 'Nf3']);
    const pgn = toPgn(game, { headers: { White: 'Alice', Black: 'Bob' }, result: '*' });
    expect(pgn).toContain('[White "Alice"]');
    expect(pgn).toContain('1. e4 e5 2. Nf3 *');
  });

  it('includes FEN and black-to-move numbering for custom starts', () => {
    const game = new Game('4k3/8/8/8/8/8/4P3/4K3 b - - 0 12');
    game.move('Kd7');
    const pgn = toPgn(game);
    expect(pgn).toContain('[FEN "4k3/8/8/8/8/8/4P3/4K3 b - - 0 12"]');
    expect(pgn).toContain('12... Kd7 *');
  });
});

describe('search', () => {
  it('finds mate in one', () => {
    const move = findBestMove(parseFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'), { depth: 2 });
    expect(move && { from: move.from, to: move.to }).toEqual({ from: 0, to: 56 });
  });

  it('takes a hanging queen', () => {
    const move = findBestMove(parseFen('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1'), { depth: 2 });
    expect(move?.captured).toBe('q');
  });
});
