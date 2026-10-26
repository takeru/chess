import type { Seat } from '@chess/client';

const SEATS_KEY = 'chess.seats';
const NAME_KEY = 'chess.name';

interface StoredSeat extends Seat {
  savedAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); the game still works for this page view.
  }
}

/** Seats this browser holds, keyed by game id. Holding a seat's token is what lets you play it. */
export function getSeats(): Record<string, StoredSeat> {
  return read<Record<string, StoredSeat>>(SEATS_KEY, {});
}

export function getSeat(gameId: string): Seat | undefined {
  return getSeats()[gameId];
}

export function saveSeat(seat: Seat): void {
  const seats = getSeats();
  seats[seat.gameId] = { ...seat, savedAt: new Date().toISOString() };
  // Keep the 50 most recent games.
  const recent = Object.values(seats)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, 50);
  write(SEATS_KEY, Object.fromEntries(recent.map((s) => [s.gameId, s])));
}

export function getName(): string {
  return read<string>(NAME_KEY, '');
}

export function saveName(name: string): void {
  write(NAME_KEY, name);
}
