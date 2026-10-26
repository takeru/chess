// End-to-end check: starts `wrangler dev`, lets two CLI bots play a full game through the
// public API, and verifies the finished game. Run with `npm run e2e` (builds first).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 8790 + Math.floor(Math.random() * 100);
const server = `http://localhost:${port}`;
const env = { ...process.env, CHESS_SERVER: server, CHESS_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'chess-e2e-')), NO_COLOR: '1' };
const cli = (...args) => spawn('node', ['packages/cli/dist/chess.js', ...args], { env, stdio: ['ignore', 'pipe', 'inherit'] });

const wrangler = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--log-level', 'warn'], {
  cwd: 'packages/server',
  stdio: ['ignore', 'inherit', 'inherit'],
  detached: true,
});
const stop = () => {
  try {
    process.kill(-wrangler.pid, 'SIGTERM');
  } catch {}
};
const fail = (message) => {
  console.error(`E2E FAILED: ${message}`);
  stop();
  process.exit(1);
};
setTimeout(() => fail('timed out'), 180_000).unref();

async function api(path, init) {
  const res = await fetch(`${server}${path}`, init);
  return res.json();
}

for (let i = 0; ; i++) {
  try {
    if ((await api('/api/health')).ok) break;
  } catch {}
  if (i > 60) fail('server did not start');
  await new Promise((r) => setTimeout(r, 1000));
}

const host = cli('bot', 'new', '--side', 'white', '--depth', '1', '--name', 'E2E White');
let gameId;
for (let i = 0; !gameId; i++) {
  const { games } = await api('/api/games');
  gameId = games.find((g) => g.host === 'E2E White')?.id;
  if (i > 30) fail('game did not appear in the lobby');
  if (!gameId) await new Promise((r) => setTimeout(r, 500));
}
console.log(`game ${gameId}: bots are playing...`);
const guest = cli('bot', gameId, '--depth', '1', '--name', 'E2E Black');
const exited = (p) => new Promise((resolve) => p.on('exit', resolve));
const codes = await Promise.all([exited(host), exited(guest)]);
if (codes.some((c) => c !== 0)) fail(`bot exited with ${codes}`);

const { game } = await api(`/api/games/${gameId}`);
if (game.status !== 'finished' || !game.reason) fail(`game not finished: ${JSON.stringify(game.status)}`);
const pgn = await (await fetch(`${server}/api/games/${gameId}/pgn`)).text();
if (!pgn.includes('[White "E2E White"]')) fail('PGN missing players');
console.log(`OK: ${game.moves.length} plies, ${game.result ?? '-'} by ${game.reason}`);
stop();
process.exit(0);
