import { describe, expect, it } from 'bun:test';
import { hexToBytes } from '@noble/hashes/utils.js';
import * as nip19 from 'nostr-tools/nip19';
import {
  AVATAR_KEYS, avatarFor, createKeyPair, importHash, isRecoveryPhrase, npubOf,
  nsecFromPhrase, phraseFromNsec, pubkeyFromInput, pubkeyFromNsec,
  secretFromHash, secretFromInput, shortNpub,
} from './keys';

describe('keys — generation and encoding', () => {
  it('mints a 64-hex pubkey with a matching nsec', () => {
    const kp = createKeyPair();
    expect(kp.pubkey).toMatch(/^[0-9a-f]{64}$/);
    expect(kp.nsec.startsWith('nsec1')).toBe(true);
    expect(pubkeyFromNsec(kp.nsec)).toBe(kp.pubkey);
  });

  it('rejects an invalid nsec loudly', () => {
    expect(() => pubkeyFromNsec('not-a-key')).toThrow();
  });
});

describe('keys — identifier parsing', () => {
  it('round-trips hex <-> npub and resolves both forms', () => {
    const { pubkey } = createKeyPair();
    const npub = npubOf(pubkey);
    expect(pubkeyFromInput(npub)).toBe(pubkey);
    expect(pubkeyFromInput(pubkey.toUpperCase())).toBe(pubkey);
  });

  it('returns null for garbage', () => {
    expect(pubkeyFromInput('hello world')).toBeNull();
    expect(pubkeyFromInput('npub1nope')).toBeNull();
  });
});

describe('keys — recovery phrase', () => {
  it('encodes a key as 24 words and round-trips back to the same nsec', () => {
    const { nsec } = createKeyPair();
    const phrase = phraseFromNsec(nsec);
    expect(phrase.split(' ')).toHaveLength(24);
    expect(isRecoveryPhrase(phrase)).toBe(true);
    expect(nsecFromPhrase(phrase)).toBe(nsec);
  });

  it('tolerates messy casing and whitespace in a pasted phrase', () => {
    const { nsec } = createKeyPair();
    const phrase = phraseFromNsec(nsec);
    const messy = `  ${phrase.toUpperCase().replace(/ /g, '\n  ')} `;
    expect(nsecFromPhrase(messy)).toBe(nsec);
  });

  it('rejects a non-phrase / tampered phrase', () => {
    expect(isRecoveryPhrase('hello world how are you today friend')).toBe(false);
    const { nsec } = createKeyPair();
    const bad = phraseFromNsec(nsec).replace(/^\w+/, 'zzzz');
    expect(isRecoveryPhrase(bad)).toBe(false);
  });
});

describe('keys — unified secret import', () => {
  it('accepts an nsec, raw hex, and a recovery phrase as the same account', () => {
    const { pubkey, nsec } = createKeyPair();
    const hex = Buffer.from(nip19.decode(nsec).data as Uint8Array).toString('hex');
    const phrase = phraseFromNsec(nsec);
    for (const input of [nsec, ` ${nsec} `, hex, hex.toUpperCase(), phrase]) {
      const parsed = secretFromInput(input);
      expect(parsed?.pubkey).toBe(pubkey);
      expect(parsed?.nsec).toBe(nsec);
    }
  });

  it('round-trips raw hex through nsec encoding', () => {
    const { nsec } = createKeyPair();
    const hex = Buffer.from(nip19.decode(nsec).data as Uint8Array).toString('hex');
    expect(secretFromInput(hex)?.nsec).toBe(nip19.nsecEncode(hexToBytes(hex)));
  });

  it('returns null for unparseable input', () => {
    expect(secretFromInput('definitely not a key')).toBeNull();
    expect(secretFromInput('npub1' + 'q'.repeat(58))).toBeNull();
  });
});

describe('keys — account-handoff link', () => {
  it('round-trips an nsec through the handoff fragment and feeds secretFromInput', () => {
    const { pubkey, nsec } = createKeyPair();
    const hash = importHash(nsec);
    expect(hash.startsWith('#key=')).toBe(true);
    const recovered = secretFromHash(hash);
    expect(recovered).toBe(nsec);
    expect(secretFromInput(recovered!)?.pubkey).toBe(pubkey);
  });

  it('reads the fragment with or without the leading #', () => {
    const { nsec } = createKeyPair();
    expect(secretFromHash(`key=${nsec}`)).toBe(nsec);
  });

  it('ignores other fragment params and returns null when no key is present', () => {
    expect(secretFromHash('')).toBeNull();
    expect(secretFromHash('#add=npub1foo')).toBeNull();
    expect(secretFromHash('#key=')).toBeNull();
  });
});

describe('keys — display derivations', () => {
  it('shortNpub is a compact npub fragment', () => {
    const { pubkey } = createKeyPair();
    expect(shortNpub(pubkey)).toMatch(/^npub1.{4}….{4}$/);
  });

  it('avatarFor is deterministic and within the bundled set', () => {
    const { pubkey } = createKeyPair();
    expect(avatarFor(pubkey)).toBe(avatarFor(pubkey));
    expect(AVATAR_KEYS).toContain(avatarFor(pubkey));
  });
});
