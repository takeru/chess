import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Seat } from '@chess/client';

/** Seats (game tokens) are remembered per server so `chess play <id>` can resume a game. */
function storePath(): string {
  const base = process.env.CHESS_CONFIG_DIR ?? join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'chess-cli');
  return join(base, 'seats.json');
}

type SeatFile = Record<string, Seat>;

async function readAll(): Promise<SeatFile> {
  try {
    return JSON.parse(await readFile(storePath(), 'utf8')) as SeatFile;
  } catch {
    return {};
  }
}

export async function saveSeat(server: string, seat: Seat): Promise<void> {
  const all = await readAll();
  all[`${server}|${seat.gameId}`] = seat;
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(all, null, 2), { mode: 0o600 });
}

export async function loadSeat(server: string, gameId: string): Promise<Seat | undefined> {
  return (await readAll())[`${server}|${gameId}`];
}
