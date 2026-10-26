import { type GameView, type Side } from '@chess/client';
import { parseFen, parseSquare } from '@chess/engine';

const GLYPHS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const ansi = (code: string, text: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
export const bold = (text: string) => ansi('1', text);
export const dim = (text: string) => ansi('2', text);
export const red = (text: string) => ansi('31', text);
export const green = (text: string) => ansi('32', text);
export const yellow = (text: string) => ansi('33', text);

/** Draws the board from `perspective`'s side, highlighting the last move. */
export function renderBoard(game: GameView, perspective: Side = 'white'): string {
  const pos = parseFen(game.fen);
  const last = game.moves.at(-1);
  const highlighted = new Set(last ? [parseSquare(last.uci.slice(0, 2)), parseSquare(last.uci.slice(2, 4))] : []);
  const ranks = perspective === 'white' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = perspective === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const lines: string[] = [];
  for (const rank of ranks) {
    let line = dim(`${rank + 1} `);
    for (const file of files) {
      const sq = rank * 8 + file;
      const piece = pos.board[sq];
      if (useColor) {
        const light = (rank + file) % 2 === 1;
        const bg = highlighted.has(sq) ? (light ? '48;5;187' : '48;5;143') : light ? '48;5;180' : '48;5;137';
        const glyph = piece ? GLYPHS[piece.type]! : ' ';
        const fg = piece?.color === 'w' ? '38;5;231;1' : '38;5;16';
        line += `\x1b[${bg};${fg}m ${glyph} \x1b[0m`;
      } else {
        const ch = piece ? (piece.color === 'w' ? piece.type.toUpperCase() : piece.type) : (rank + file) % 2 ? '.' : ':';
        line += ` ${ch} `;
      }
    }
    lines.push(line);
  }
  lines.push(dim(`   ${files.map((f) => ` ${'abcdefgh'[f]} `).join('')}`));
  return lines.join('\n');
}

export function describeStatus(game: GameView, me?: Side): string {
  const name = (side: Side) => {
    const player = game.players[side];
    const label = player ? player.name : '(open)';
    return side === me ? `${label} (you)` : label;
  };
  const header = `${bold('White')} ${name('white')}  vs  ${bold('Black')} ${name('black')}`;
  let status: string;
  switch (game.status) {
    case 'waiting':
      status = yellow(`Waiting for an opponent. Game id: ${bold(game.id)}`);
      break;
    case 'active': {
      const turn = game.turn === me ? green('Your move') : `${game.turn === 'white' ? 'White' : 'Black'} to move`;
      status = turn + (game.check ? red('  Check!') : '');
      if (game.drawOffer && game.drawOffer !== me) {
        status += yellow(`  ${game.drawOffer === 'white' ? 'White' : 'Black'} offers a draw ("accept" / "decline")`);
      } else if (game.drawOffer) {
        status += dim('  (your draw offer is pending)');
      }
      break;
    }
    case 'finished':
      status = bold(`Game over: ${game.result ?? '-'} (${game.reason?.replace(/_/g, ' ')})`);
      break;
  }
  return `${header}\n${status}`;
}

export function renderMoves(game: GameView): string {
  if (game.moves.length === 0) return dim('No moves yet');
  const start = parseFen(game.initialFen);
  let number = start.fullmoveNumber;
  const parts: string[] = [];
  game.moves.forEach((m, i) => {
    if (m.side === 'white') parts.push(`${number}.`);
    else if (i === 0) parts.push(`${number}...`);
    parts.push(m.san);
    if (m.side === 'black') number += 1;
  });
  return parts.join(' ');
}
