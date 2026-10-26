import { ChessApiError, type ChessClient, type GameView, type Seat, type Side, otherSide } from '@chess/client';
import { Board } from './board.js';
import { h } from './dom.js';
import { getName, getSeat, saveSeat } from './storage.js';

const SIDE = { white: '白', black: '黒' } as const;
const REASON: Record<string, string> = {
  checkmate: 'チェックメイト',
  stalemate: 'ステイルメイト',
  insufficient_material: '駒不足',
  fifty_move_rule: '50手ルール',
  threefold_repetition: '同一局面3回',
  resignation: '投了',
  draw_agreement: '合意による引き分け',
  aborted: '中止',
};

export function gamePage(root: HTMLElement, client: ChessClient, gameId: string): () => void {
  let seat: Seat | undefined = getSeat(gameId);
  let game: GameView | null = null;
  let perspective: Side = seat?.side ?? 'white';
  let busy = false;

  const run = async (action: () => Promise<GameView | void>) => {
    if (busy) return;
    busy = true;
    error.textContent = '';
    try {
      const updated = await action();
      if (updated) apply(updated);
    } catch (e) {
      error.textContent = e instanceof ChessApiError ? e.message : 'サーバに接続できませんでした';
      if (game) render();
    } finally {
      busy = false;
      if (game) render();
    }
  };

  const board = new Board({ onMove: (uci) => seat && run(() => client.move(seat!, uci)) });
  const topBar = h('div', { class: 'player-bar' });
  const bottomBar = h('div', { class: 'player-bar' });
  const status = h('div', { class: 'status', 'aria-live': 'polite' });
  const error = h('p', { class: 'error', role: 'alert' });
  const actions = h('div', { class: 'actions' });
  const moveList = h('ol', { class: 'moves' });
  const share = h('div', { class: 'share' });
  const connection = h('span', { class: 'connection' });

  root.replaceChildren(
    h(
      'div',
      { class: 'game-layout' },
      h('div', { class: 'board-column' }, topBar, board.element, bottomBar),
      h(
        'aside',
        { class: 'side-panel' },
        status,
        error,
        actions,
        share,
        h('h3', {}, '棋譜'),
        moveList,
        h('div', { class: 'panel-footer' }, connection, h('span', { class: 'mono muted' }, `#${gameId}`)),
      ),
    ),
  );

  function apply(updated: GameView): void {
    if (game && updated.version < game.version) return;
    game = updated;
    render();
  }

  function playerBar(el: HTMLElement, side: Side): void {
    const g = game!;
    const player = g.players[side];
    const active = g.status === 'active' && g.turn === side;
    el.className = `player-bar${active ? ' to-move' : ''}`;
    el.replaceChildren(
      ...present(
        h('span', { class: `swatch ${side}` }),
        h('span', { class: 'player-name' }, player?.name ?? '（空席）'),
        seat?.side === side ? h('span', { class: 'badge' }, 'あなた') : null,
        active ? h('span', { class: 'badge accent' }, '手番') : null,
      ),
    );
  }

  function render(): void {
    const g = game!;
    const me = seat?.side ?? null;
    board.update(g, perspective, busy ? null : me);
    playerBar(topBar, otherSide(perspective));
    playerBar(bottomBar, perspective);

    // Status line
    let text: string;
    if (g.status === 'waiting') {
      text = me ? '対戦相手を待っています…' : '参加者を募集中です';
    } else if (g.status === 'finished') {
      const winner = g.result === '1-0' ? '白の勝ち' : g.result === '0-1' ? '黒の勝ち' : g.result ? '引き分け' : '';
      text = `終局：${winner}${winner ? '（' : ''}${REASON[g.reason ?? ''] ?? g.reason}${winner ? '）' : ''}`;
    } else {
      text = g.turn === me ? 'あなたの手番です' : `${SIDE[g.turn]}の手番です`;
      if (g.check) text += ' — チェック！';
    }
    status.textContent = text;
    status.className = `status${g.status === 'active' && g.turn === me ? ' highlight' : ''}`;

    // Actions
    const buttons: (HTMLElement | null)[] = [];
    if (!me && g.status === 'waiting') {
      buttons.push(
        h('button', {
          class: 'primary',
          onclick: () =>
            run(async () => {
              const res = await client.joinGame(gameId, { name: getName() || undefined });
              saveSeat(res.seat);
              seat = res.seat;
              perspective = res.seat.side;
              return res.game;
            }),
        }, 'この対局に参加する'),
      );
    }
    if (seat && g.status === 'active') {
      const s = seat;
      if (g.drawOffer && g.drawOffer !== me) {
        buttons.push(
          h('div', { class: 'offer' }, `${SIDE[g.drawOffer]}が引き分けを提案しています`),
          h('button', { class: 'primary', onclick: () => run(() => client.draw(s, 'accept')) }, '引き分けに同意'),
          h('button', { onclick: () => run(() => client.draw(s, 'decline')) }, '断る'),
        );
      } else if (g.drawOffer === me) {
        buttons.push(h('button', { onclick: () => run(() => client.draw(s, 'decline')) }, '引き分け提案を取り消す'));
      } else {
        buttons.push(h('button', { onclick: () => run(() => client.draw(s, 'offer')) }, '引き分けを提案'));
      }
      buttons.push(
        h('button', { class: 'danger', onclick: () => confirm('投了しますか？') && run(() => client.resign(s)) }, '投了'),
      );
    }
    if (seat && g.status === 'waiting') {
      const s = seat;
      buttons.push(h('button', { class: 'danger', onclick: () => run(() => client.resign(s)) }, '対局を中止'));
    }
    buttons.push(
      h('button', { onclick: () => { perspective = otherSide(perspective); render(); } }, '盤を反転'),
      g.moves.length > 0 ? h('a', { class: 'button', href: `${client.baseUrl}/api/games/${gameId}/pgn`, download: `chess-${gameId}.pgn` }, 'PGN') : null,
    );
    actions.replaceChildren(...present(...buttons));

    // Share box while waiting
    if (g.status === 'waiting') {
      const url = `${location.origin}/game/${gameId}`;
      const copy = h('button', {}, 'コピー');
      copy.addEventListener('click', async () => {
        await navigator.clipboard?.writeText(url);
        copy.textContent = 'コピーしました';
      });
      share.replaceChildren(
        h('p', {}, 'このリンクを対戦相手に送ってください：'),
        h('div', { class: 'inline' }, h('input', { value: url, readonly: true, onfocus: (e: Event) => (e.target as HTMLInputElement).select() }), copy),
        h('p', { class: 'muted small' }, 'CLI からは ', h('code', {}, `chess --server ${location.origin} join ${gameId}`)),
      );
    } else {
      share.replaceChildren();
    }

    // Move list
    const rows: HTMLElement[] = [];
    const startsWithBlack = g.moves[0]?.side === 'black';
    const startNumber = Number(g.initialFen.split(' ')[5] ?? 1);
    const plies = startsWithBlack ? [null, ...g.moves] : g.moves;
    for (let i = 0; i < plies.length; i += 2) {
      rows.push(
        h(
          'li',
          { value: startNumber + i / 2 },
          h('span', { class: 'ply' }, plies[i]?.san ?? '…'),
          h('span', { class: 'ply' }, plies[i + 1]?.san ?? ''),
        ),
      );
    }
    moveList.replaceChildren(...rows);
    moveList.scrollTop = moveList.scrollHeight;
  }

  const stop = client.watch(gameId, apply, {
    onConnectionChange: (connected) => {
      connection.textContent = connected ? '● 接続中' : '○ 再接続中…';
      connection.className = `connection${connected ? ' online' : ''}`;
    },
    onError: () => {
      if (!game) error.textContent = '対局が見つからないか、サーバに接続できません';
    },
  });
  void client.getGame(gameId).then(apply, (e) => {
    error.textContent = e instanceof ChessApiError && e.code === 'not_found' ? 'この対局は存在しません' : 'サーバに接続できません';
    if (e instanceof ChessApiError && e.code === 'not_found') stop();
  });

  return () => {
    stop();
    board.destroy();
  };
}

function present(...nodes: (HTMLElement | null)[]): HTMLElement[] {
  return nodes.filter((n): n is HTMLElement => n !== null);
}
