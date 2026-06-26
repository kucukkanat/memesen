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

/**
 * Compare two relay URLs ignoring a trailing slash. The relay pool reports a
 * normalised URL (with a trailing slash) in its connection callbacks, which
 * wouldn't otherwise string-match the slash-free URLs we store.
 */
export const sameRelay = (a: string, b: string): boolean =>
  a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

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
