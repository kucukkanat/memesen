// Key handling and identity-flavoured derivations. All secp256k1 / bech32 work
// is delegated to nostr-tools (audited noble crypto under the hood) — we never
// hand-roll crypto. Everything here is pure: same input, same output.

import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { hexToBytes } from '@noble/hashes/utils.js';
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

/** The 12 bundled MSN display pictures, by their avatar key in assets/avatars. */
export const AVATAR_KEYS: readonly string[] = [
  'beach', 'chess', 'dog', 'duck', 'flower', 'horses',
  'moto', 'palm', 'rocket', 'skate', 'soccer', 'msn',
];

export interface KeyPair {
  /** 64-char hex public key — the canonical contact identifier everywhere. */
  readonly pubkey: string;
  /** bech32 `nsec…` secret. Stored plaintext (see README security note). */
  readonly nsec: string;
}

/** Mint a brand-new identity. */
export const createKeyPair = (): KeyPair => {
  const sk = generateSecretKey();
  return { pubkey: getPublicKey(sk), nsec: nip19.nsecEncode(sk) };
};

/** Decode an `nsec…` to raw secret bytes, throwing loudly on anything invalid. */
export const secretFromNsec = (nsec: string): Uint8Array => {
  const decoded = nip19.decode(nsec.trim());
  if (decoded.type !== 'nsec') throw new Error('Not a valid nsec secret key');
  return decoded.data;
};

/** Derive the hex public key for an `nsec…`, throwing on invalid input. */
export const pubkeyFromNsec = (nsec: string): string => getPublicKey(secretFromNsec(nsec));

// --- recovery phrase ------------------------------------------------------
// A nostr secret is 32 bytes of raw entropy with no inherent word phrase, so we
// encode those exact bytes as a BIP-39 mnemonic (256-bit entropy => 24 words).
// This is a *reversible byte encoding*, not NIP-06 seed derivation: the phrase
// round-trips to the same key, which is what a "write this down to move/restore
// your account" backup needs. 24 words is the honest size of a 256-bit key.

/** The 24-word recovery phrase that encodes an `nsec…`'s raw key bytes. */
export const phraseFromNsec = (nsec: string): string => entropyToMnemonic(secretFromNsec(nsec), wordlist);

/** Collapse pasted whitespace/case so "  Abandon\nAbout " validates cleanly. */
const normalisePhrase = (phrase: string): string => phrase.trim().toLowerCase().split(/\s+/).join(' ');

/** True when the input is a valid 24-word recovery phrase we can decode. */
export const isRecoveryPhrase = (input: string): boolean => {
  const words = normalisePhrase(input);
  return words.split(' ').length >= 12 && validateMnemonic(words, wordlist);
};

/** Decode a recovery phrase back to its `nsec…`, throwing on anything invalid. */
export const nsecFromPhrase = (phrase: string): string => {
  const entropy = mnemonicToEntropy(normalisePhrase(phrase), wordlist);
  if (entropy.length !== 32) throw new Error('Recovery phrase does not encode a 32-byte key');
  return nip19.nsecEncode(entropy);
};

/**
 * Resolve whatever a user pasted or scanned when moving an account — an
 * `nsec…`, a raw 64-char hex secret, or a 24-word recovery phrase — to a
 * canonical `{ pubkey, nsec }`. Returns null when it can't be parsed, so the
 * caller can show one friendly "that doesn't look right" message.
 */
export const secretFromInput = (input: string): KeyPair | null => {
  const raw = input.trim();
  try {
    if (isRecoveryPhrase(raw)) {
      const nsec = nsecFromPhrase(raw);
      return { pubkey: pubkeyFromNsec(nsec), nsec };
    }
    const nsec = HEX64.test(raw) ? nip19.nsecEncode(hexToBytes(raw.toLowerCase())) : raw;
    return { pubkey: pubkeyFromNsec(nsec), nsec };
  } catch {
    return null;
  }
};

const HEX64 = /^[0-9a-f]{64}$/i;

/**
 * Resolve a contact identifier the user typed — hex pubkey, `npub…`, or
 * `nprofile…` — to a hex pubkey. Returns null when it can't be parsed.
 */
export const pubkeyFromInput = (input: string): string | null => {
  const raw = input.trim();
  if (HEX64.test(raw)) return raw.toLowerCase();
  try {
    const decoded = nip19.decode(raw);
    if (decoded.type === 'npub') return decoded.data;
    if (decoded.type === 'nprofile') return decoded.data.pubkey;
    return null;
  } catch {
    return null;
  }
};

// --- account-handoff link -------------------------------------------------
// Moving an account to a phone is a QR of a URL that opens this app with the
// secret key in tow. The key rides in the URL *fragment* (`#…`), never the
// query string, because the fragment is never sent to (or logged by) the host —
// only the browser sees it. Any phone's built-in camera can open the link and
// the app signs in automatically, so we need no in-app QR scanner.

const IMPORT_HASH_KEY = 'key';

/** Build the handoff fragment (e.g. `#key=nsec1…`) carrying an `nsec…`. */
export const importHash = (nsec: string): string =>
  `#${IMPORT_HASH_KEY}=${encodeURIComponent(nsec.trim())}`;

/** Pull a handoff secret out of a URL fragment, or null when there isn't one. */
export const secretFromHash = (hash: string): string | null => {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get(IMPORT_HASH_KEY)?.trim();
  return value ? value : null;
};

/** Full `npub…` for a hex pubkey. */
export const npubOf = (pubkey: string): string => nip19.npubEncode(pubkey);

/** `npub1abcd…wxyz` — the compact form shown where MSN showed an e-mail. */
export const shortNpub = (pubkey: string): string => {
  const npub = npubOf(pubkey);
  return `${npub.slice(0, 9)}…${npub.slice(-4)}`;
};

/**
 * Deterministically map a pubkey to one of the bundled display pictures, so a
 * contact without a real avatar still gets a stable, MSN-flavoured one.
 */
export const avatarFor = (pubkey: string): string => {
  const bytes = HEX64.test(pubkey) ? hexToBytes(pubkey) : new TextEncoder().encode(pubkey);
  const sum = bytes.reduce((acc, b) => (acc + b) % 4096, 0);
  return AVATAR_KEYS[sum % AVATAR_KEYS.length] ?? 'msn';
};
