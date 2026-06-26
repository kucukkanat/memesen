import { describe, expect, it } from 'bun:test';
import { normaliseRelay, sameRelay } from './relays';

describe('relays — sameRelay', () => {
  it('matches regardless of a trailing slash (the pool reports the slashed form)', () => {
    expect(sameRelay('wss://relay.damus.io', 'wss://relay.damus.io/')).toBe(true);
    expect(sameRelay('wss://relay.damus.io/', 'wss://relay.damus.io')).toBe(true);
  });

  it('does not match different relays', () => {
    expect(sameRelay('wss://nos.lol', 'wss://relay.damus.io/')).toBe(false);
  });
});

describe('relays — normaliseRelay', () => {
  it('adds the wss scheme and strips a trailing slash', () => {
    expect(normaliseRelay('relay.example.com')).toBe('wss://relay.example.com');
    expect(normaliseRelay('wss://relay.example.com/')).toBe('wss://relay.example.com');
  });

  it('rejects blank input', () => {
    expect(normaliseRelay('   ')).toBeNull();
  });
});
