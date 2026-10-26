import { ChessApiError, type ChessClient, type LobbyEntry } from '@chess/client';
import { h, navigate } from './dom.js';
import { getName, getSeats, saveName, saveSeat } from './storage.js';

const SIDE_LABEL = { white: '白', black: '黒' } as const;

export function homePage(root: HTMLElement, client: ChessClient): () => void {
  const error = h('p', { class: 'error', role: 'alert' });
  const showError = (e: unknown) => {
    error.textContent = e instanceof ChessApiError ? e.message : 'サーバに接続できませんでした';
  };

  const nameInput = h('input', { id: 'name', maxlength: 40, placeholder: 'Anonymous', autocomplete: 'nickname', value: getName() });
  nameInput.addEventListener('change', () => saveName(nameInput.value.trim()));
  const name = () => nameInput.value.trim() || undefined;

  // --- create ---
  const sideSelect = h(
    'select',
    { id: 'side' },
    h('option', { value: 'random' }, 'ランダム'),
    h('option', { value: 'white' }, '白（先手）'),
    h('option', { value: 'black' }, '黒（後手）'),
  );
  const privateBox = h('input', { type: 'checkbox', id: 'private' });
  const createButton = h('button', { class: 'primary', type: 'submit' }, '対局を作成');
  const createForm = h(
    'form',
    { class: 'card' },
    h('h2', {}, '新しい対局'),
    h('div', { class: 'field' }, h('label', { for: 'side' }, '手番'), sideSelect),
    h('label', { class: 'check' }, privateBox, ' 非公開（ロビーに表示しない）'),
    createButton,
  );
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    createButton.disabled = true;
    try {
      const { seat } = await client.createGame({
        name: name(),
        side: sideSelect.value as 'white' | 'black' | 'random',
        visibility: privateBox.checked ? 'private' : 'public',
      });
      saveSeat(seat);
      navigate(`/game/${seat.gameId}`);
    } catch (err) {
      showError(err);
      createButton.disabled = false;
    }
  });

  const join = async (id: string) => {
    try {
      const { seat } = await client.joinGame(id, { name: name() });
      saveSeat(seat);
      navigate(`/game/${seat.gameId}`);
    } catch (err) {
      showError(err);
      void refresh();
    }
  };

  // --- join by id ---
  const idInput = h('input', { placeholder: 'ゲームID（例: k3x9m2pa）', 'aria-label': 'ゲームID', autocapitalize: 'off', spellcheck: 'false' });
  const idForm = h('form', { class: 'inline' }, idInput, h('button', { type: 'submit' }, '開く'));
  idForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = idInput.value.trim().toLowerCase().replace(/^.*\/game\//, '');
    if (id) navigate(`/game/${id}`);
  });

  // --- lobby ---
  const lobbyList = h('ul', { class: 'list' }, h('li', { class: 'muted' }, '読み込み中…'));
  const renderLobby = (games: LobbyEntry[]) => {
    const mine = getSeats();
    lobbyList.replaceChildren(
      ...(games.length === 0
        ? [h('li', { class: 'muted' }, '待機中の対局はありません。作成してみましょう。')]
        : games.map((g) =>
            h(
              'li',
              {},
              h('span', { class: 'grow' }, h('strong', {}, g.host), h('span', { class: 'muted' }, ` があなたを待っています（あなたは${SIDE_LABEL[g.openSide]}）`)),
              mine[g.id]
                ? h('a', { href: `/game/${g.id}`, 'data-link': true, class: 'button' }, '自分の対局')
                : h('button', { onclick: () => join(g.id) }, '参加'),
            ),
          )),
    );
  };
  const refresh = async () => {
    try {
      renderLobby(await client.listGames());
    } catch (err) {
      showError(err);
    }
  };
  void refresh();
  const timer = setInterval(refresh, 5000);

  // --- my games ---
  const seats = Object.values(getSeats()).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const myGames =
    seats.length > 0
      ? h(
          'section',
          { class: 'card' },
          h('h2', {}, 'あなたの対局'),
          h(
            'ul',
            { class: 'list' },
            ...seats.slice(0, 10).map((s) =>
              h(
                'li',
                {},
                h('a', { href: `/game/${s.gameId}`, 'data-link': true, class: 'grow mono' }, s.gameId),
                h('span', { class: 'muted' }, `${SIDE_LABEL[s.side]} · ${new Date(s.savedAt).toLocaleString()}`),
              ),
            ),
          ),
        )
      : null;

  root.replaceChildren(
    h(
      'div',
      { class: 'home' },
      h(
        'section',
        { class: 'hero' },
        h('h1', {}, 'オンライン・チェス'),
        h('p', { class: 'muted' }, 'Web・CLI・アプリ、どこからでも同じ API で参加して対戦できます。'),
      ),
      error,
      h('div', { class: 'card' }, h('div', { class: 'field' }, h('label', { for: 'name' }, 'あなたの名前'), nameInput)),
      h('div', { class: 'columns' }, createForm, h('section', { class: 'card' }, h('h2', {}, '参加を待っている対局'), lobbyList, h('h3', {}, 'IDで開く'), idForm)),
      myGames,
    ),
  );
  return () => clearInterval(timer);
}
