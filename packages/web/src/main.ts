import { ChessClient } from '@chess/client';
import { gamePage } from './game.js';
import { h, navigate } from './dom.js';
import { homePage } from './home.js';
import './style.css';

// Same origin in production (the Worker serves this page); override with VITE_API_URL if the API lives elsewhere.
const client = new ChessClient({ baseUrl: import.meta.env.VITE_API_URL || location.origin });
const root = document.getElementById('app')!;
let cleanup: (() => void) | undefined;

function route(): void {
  cleanup?.();
  cleanup = undefined;
  const match = /^\/game\/([a-z0-9]+)\/?$/i.exec(location.pathname);
  if (match) {
    cleanup = gamePage(root, client, match[1]!.toLowerCase());
    document.title = `Chess #${match[1]}`;
  } else if (location.pathname === '/') {
    cleanup = homePage(root, client);
    document.title = 'Chess';
  } else {
    root.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'ページが見つかりません'), h('a', { href: '/', 'data-link': true }, 'トップへ戻る')));
  }
}

document.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  navigate(link.getAttribute('href')!);
});
window.addEventListener('popstate', route);
route();
