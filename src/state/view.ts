// Pure projection helpers that turn the normalised social-graph maps into the
// denormalised shape the MSN UI wants (name, handle, PSM, presence, avatar).
// Shared by the reducer (for system-line names) and the components (for render).

import type { AppState, Presence, Profile, StatusKey } from './types';
import { PRESENCE_TTL_MS } from './data';
import { avatarFor, shortNpub } from '../nostr/keys';

export interface ResolvedContact {
  readonly pubkey: string;
  readonly name: string;
  readonly handle: string; // nip05 if present, else a short npub
  readonly psm: string;
  readonly status: StatusKey;
  readonly avatar: string;
}

export const displayName = (pubkey: string, petname: string, profile: Profile | undefined): string =>
  petname || profile?.displayName || profile?.name || shortNpub(pubkey);

export const handleOf = (pubkey: string, profile: Profile | undefined): string =>
  profile?.nip05 ?? shortNpub(pubkey);

/** Decay presence to "offline" once it's gone stale. `now` is in ms. */
export const presenceStatus = (presence: Presence | undefined, now: number): StatusKey => {
  if (!presence) return 'offline';
  return now - presence.at * 1000 > PRESENCE_TTL_MS ? 'offline' : presence.status;
};

/** Build the full display view of a pubkey from current state. */
export const resolveContact = (state: AppState, pubkey: string): ResolvedContact => {
  const profile = state.profiles[pubkey];
  const status =
    pubkey === state.myPubkey ? state.myStatus : presenceStatus(state.presence[pubkey], state.now);
  // A real profile picture wins; otherwise fall back to a stable bundled avatar.
  const picture = profile?.picture?.trim();
  return {
    pubkey,
    name: displayName(pubkey, state.petnames[pubkey] ?? '', profile),
    handle: handleOf(pubkey, profile),
    psm: profile?.about ?? '',
    status,
    avatar: picture ? picture : avatarFor(pubkey),
  };
};
