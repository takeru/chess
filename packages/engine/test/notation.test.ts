import { describe, expect, it } from 'vitest';
import { FenError, Game, IllegalMoveError, START_FEN, parseFen, toFen } from '../src/index.js';

describe('FEN', () => {
  it('round-trips', () => {
    const fens = [
      START_FEN,
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    ];
    for (const fen of fens) expect(toFen(parseFen(fen))).toBe(fen);
  });

  it('rejects malformed input', () => {
    expect(() => parseFen('not a fen')).toThrow(FenError);
    expect(() => parseFen('8/8/8/8/8/8/8/8 w - - 0 1')).toThrow(/king/);
    expect(() => parseFen('rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toThrow(FenError);
    expect(() => parseFen('P3k3/8/8/8/8/8/8/4K3 w - - 0 1')).toThrow(/Pawns/);
    // Black (not to move) is in check from the rook: an unreachable position.
    expect(() => new Game('4k3/8/8/8/8/8/8/4RK2 w - - 0 1')).toThrow(FenError);
  });

  it('only records en passant when a capture is possible', () => {
    const game = new Game();
    game.move('e4');
    expect(game.fen()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    game.move('d5');
    game.move('e5');
    game.move('f5');
    expect(game.fen()).toBe('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3');
  });
});

describe('move parsing and SAN', () => {
  it('accepts UCI and SAN for the same move', () => {
    const a = new Game();
    const b = new Game();
    expect(a.move('g1f3').san).toBe('Nf3');
    expect(b.move('Nf3').uci).toBe('g1f3');
    expect(a.fen()).toBe(b.fen());
  });

  it('writes castling, captures, promotion and check', () => {
    const game = new Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(game.move('e1g1').san).toBe('O-O');
    expect(game.move('O-O-O').san).toBe('O-O-O');

    const promo = new Game('1n2k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    expect(promo.move('axb8=Q+').uci).toBe('a7b8q');

    const ep = new Game('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(ep.move('exd6').move.kind).toBe('en-passant');
  });

  it('disambiguates by file, rank or both', () => {
    expect(new Game('4k3/8/8/8/8/8/4K3/R6R w - - 0 1').move('a1d1').san).toBe('Rad1');
    expect(new Game('R7/7k/8/8/8/8/8/R3K3 w - - 0 1').move('a1a4').san).toBe('R1a4');
    expect(new Game('7k/8/8/8/Q1Q5/8/Q7/4K3 w - - 0 1').move('a4b3').san).toBe('Qa4b3');
  });

  it('marks checkmate with #', () => {
    const game = Game.replay(['f3', 'e5', 'g4']);
    expect(game.move('Qh4').san).toBe('Qh4#');
  });

  it('rejects illegal, ambiguous and incomplete moves', () => {
    const game = new Game();
    expect(() => game.move('e2e5')).toThrow(IllegalMoveError);
    expect(() => game.move('Ke2')).toThrow(IllegalMoveError);
    expect(() => new Game('4k3/8/8/8/8/8/4K3/R6R w - - 0 1').move('Rd1')).toThrow(/Ambiguous/);
    expect(() => new Game('4k3/P7/8/8/8/8/8/4K3 w - - 0 1').move('a7a8')).toThrow(/promotion/);
  });

  it('does not allow castling through check', () => {
    const game = new Game('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1');
    expect(() => game.move('O-O')).toThrow(IllegalMoveError);
    expect(game.move('O-O-O').san).toBe('O-O-O');
  });
});
