import { describe, expect, it } from 'bun:test';
import { AVATAR_KEYS, avatarFor, createKeyPair, npubOf, pubkeyFromInput, pubkeyFromNsec, shortNpub } from './keys';

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
