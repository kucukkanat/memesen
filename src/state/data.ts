// Static labels + small constant tables. The buddy list, profiles and presence
// are no longer seeded here — they come live from Nostr relays at runtime.

import type { StatusInfo, StatusKey } from './types';

/** The default display picture key when nothing else is known. */
export const DEFAULT_AVATAR = 'msn';

/** Presence labels. The coloured indicator itself is drawn by <StatusIcon/>. */
export const STATUS: Readonly<Record<StatusKey, StatusInfo>> = {
  online: { label: 'Online' },
  busy: { label: 'Busy' },
  away: { label: 'Away' },
  invisible: { label: 'Appear Offline' },
  offline: { label: 'Offline' },
};

export const statusOf = (key: StatusKey): StatusInfo => STATUS[key];

/** A contact is treated as offline once their presence is older than this. */
export const PRESENCE_TTL_MS = 15 * 60_000;

export const WINK_GLYPHS: readonly string[] = ['😉', '😍', '🎉', '💋', '🤪', '😂'];
