// The five most widely-used public Nostr relays, seeded as defaults so a fresh
// identity can read and write immediately. Users can add/remove/disable these
// from the Connection (relay) manager; their list is then persisted.

export const DEFAULT_RELAYS: readonly string[] = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
];

/** Normalise a user-typed relay URL, or return null if it isn't a ws(s) URL. */
export const normaliseRelay = (input: string): string | null => {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^wss?:\/\//.test(raw) ? raw : `wss://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return null;
    // Drop a lone trailing slash so the same relay never appears twice.
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};
