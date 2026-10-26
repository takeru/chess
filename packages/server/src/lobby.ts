import { DurableObject } from 'cloudflare:workers';
import type { LobbyEntry } from '@chess/protocol';
import type { Env } from './env.js';

/** Open games stay listed for this long; after that they are still joinable by id. */
const LISTING_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_LISTED = 50;

/** A single Durable Object holding the list of public games that are waiting for an opponent. */
export class Lobby extends DurableObject<Env> {
  async add(entry: LobbyEntry): Promise<void> {
    await this.ctx.storage.put(`game:${entry.id}`, entry);
  }

  async remove(id: string): Promise<void> {
    await this.ctx.storage.delete(`game:${id}`);
  }

  async list(): Promise<LobbyEntry[]> {
    const entries = await this.ctx.storage.list<LobbyEntry>({ prefix: 'game:' });
    const cutoff = Date.now() - LISTING_TTL_MS;
    const live: LobbyEntry[] = [];
    const expired: string[] = [];
    for (const [key, entry] of entries) {
      if (Date.parse(entry.createdAt) < cutoff) expired.push(key);
      else live.push(entry);
    }
    // storage.delete accepts at most 128 keys per call.
    for (let i = 0; i < expired.length; i += 128) await this.ctx.storage.delete(expired.slice(i, i + 128));
    return live.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_LISTED);
  }
}
