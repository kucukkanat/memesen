import { describe, expect, it } from 'bun:test';
import { initialState } from './reducer';
import { displayName, presenceStatus, resolveContact } from './view';

const T0 = new Date(2004, 2, 1, 21, 7).getTime();
const SEC = Math.floor(T0 / 1000);
const ALICE = 'a'.repeat(64);
const ME = 'c'.repeat(64);

describe('view — presence decay', () => {
  it('reports offline when there is no presence', () => {
    expect(presenceStatus(undefined, T0)).toBe('offline');
  });

  it('keeps a fresh status', () => {
    expect(presenceStatus({ status: 'away', at: SEC - 60 }, T0)).toBe('away');
  });

  it('decays a stale status to offline', () => {
    expect(presenceStatus({ status: 'online', at: SEC - 3600 }, T0)).toBe('offline');
  });
});

describe('view — name resolution', () => {
  it('prefers petname, then display name, then npub', () => {
    expect(displayName(ALICE, 'Ally', { name: 'al' })).toBe('Ally');
    expect(displayName(ALICE, '', { displayName: 'Al', name: 'al' })).toBe('Al');
    expect(displayName(ALICE, '', undefined)).toMatch(/^npub1/);
  });
});

describe('view — resolveContact', () => {
  const state = {
    ...initialState(T0),
    myPubkey: ME,
    myStatus: 'busy' as const,
    petnames: { [ALICE]: 'Ally' },
    profiles: { [ALICE]: { about: 'brb' } },
    presence: { [ALICE]: { status: 'online' as const, at: SEC - 30 } },
  };

  it('builds the denormalised view for a contact', () => {
    const c = resolveContact(state, ALICE);
    expect(c.name).toBe('Ally');
    expect(c.psm).toBe('brb');
    expect(c.status).toBe('online');
    expect(c.handle).toMatch(/^npub1/);
  });

  it('uses my own live status for my pubkey', () => {
    expect(resolveContact(state, ME).status).toBe('busy');
  });

  it('prefers a real profile picture over the derived avatar', () => {
    const withPic = { ...state, profiles: { [ALICE]: { picture: 'https://x/y.png' } } };
    expect(resolveContact(withPic, ALICE).avatar).toBe('https://x/y.png');
  });

  it('falls back to a bundled avatar when there is no picture', () => {
    expect(resolveContact(state, ALICE).avatar).not.toContain('http');
  });
});
