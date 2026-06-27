// Local persistence for identities (plaintext nsec — see README), the active
// account, and the relay set. These are the only things that survive a reload;
// everything else (contacts, profiles, messages) is refetched from relays.

import type { Identity, StoredRelay } from '../state/types';
import { DEFAULT_RELAYS } from './relays';
import { readJson, writeJson } from './storage';

const KEY_IDENTITIES = 'memesen.identities';
const KEY_ACTIVE = 'memesen.active';
const KEY_RELAYS = 'memesen.relays';
// Read markers are per-account (localStorage is shared across identities).
const readKey = (pubkey: string): string => `memesen.read.${pubkey}`;

export const loadIdentities = (): Identity[] => {
  const list = readJson<Identity[]>(KEY_IDENTITIES, []);
  return Array.isArray(list) ? list.filter((i) => typeof i?.pubkey === 'string' && typeof i?.nsec === 'string') : [];
};

export const saveIdentities = (list: readonly Identity[]): void => writeJson(KEY_IDENTITIES, list);

/** Add or update an identity (keyed by pubkey), keeping the newest name. */
export const upsertIdentity = (list: readonly Identity[], identity: Identity): Identity[] => {
  const rest = list.filter((i) => i.pubkey !== identity.pubkey);
  return [...rest, identity];
};

export const loadActive = (): string | null => readJson<string | null>(KEY_ACTIVE, null);
export const saveActive = (pubkey: string | null): void => writeJson(KEY_ACTIVE, pubkey);

export const loadRelays = (): StoredRelay[] => {
  const list = readJson<StoredRelay[]>(KEY_RELAYS, []);
  const valid = Array.isArray(list)
    ? list.filter((r) => typeof r?.url === 'string' && typeof r?.enabled === 'boolean')
    : [];
  return valid.length > 0 ? valid : DEFAULT_RELAYS.map((url) => ({ url, enabled: true }));
};

export const saveRelays = (list: readonly StoredRelay[]): void => writeJson(KEY_RELAYS, list);

/** Per-account read markers: partner pubkey -> read-through `created_at` (secs). */
export const loadReadMarkers = (pubkey: string): Record<string, number> => {
  const raw = readJson<Record<string, number>>(readKey(pubkey), {});
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, at]) => typeof at === 'number'));
};

export const saveReadMarkers = (pubkey: string, markers: Readonly<Record<string, number>>): void =>
  writeJson(readKey(pubkey), markers);
