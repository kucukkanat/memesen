// Key handling and identity-flavoured derivations. All secp256k1 / bech32 work
// is delegated to nostr-tools (audited noble crypto under the hood) — we never
// hand-roll crypto. Everything here is pure: same input, same output.

import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { hexToBytes } from '@noble/hashes/utils.js';

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
