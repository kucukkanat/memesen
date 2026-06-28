import { describe, expect, it } from 'bun:test';
import { isPresenceFresh, isPublishAccepted, shouldAnnounce, shouldAnnounceOnline, type IncomingMessage } from './client';
import { PRESENCE_TTL_MS } from '../state/data';

const msg = (over: Partial<IncomingMessage>): IncomingMessage => ({
  id: 'id',
  partner: 'peer',
  mine: false,
  createdAt: 0,
  payload: { kind: 'text', body: 'hi' },
  live: true,
  ...over,
});

describe('shouldAnnounce', () => {
  it('announces a live message from the other party', () => {
    expect(shouldAnnounce(msg({ mine: false, live: true }))).toBe(true);
  });

  it('stays silent for backlog replayed on reconnect (live: false)', () => {
    expect(shouldAnnounce(msg({ mine: false, live: false }))).toBe(false);
  });

  it('never announces our own echoed messages', () => {
    expect(shouldAnnounce(msg({ mine: true, live: true }))).toBe(false);
  });
});

describe('isPresenceFresh', () => {
  const NOW = 1_700_000_000_000; // fixed ms reference
  const sec = (ms: number): number => Math.floor(ms / 1000);

  it('is present for a recent non-offline status', () => {
    expect(isPresenceFresh('online', sec(NOW - 60_000), NOW)).toBe(true);
    expect(isPresenceFresh('away', sec(NOW), NOW)).toBe(true);
  });

  it('decays a stale online status to not-present (matches the buddy list TTL)', () => {
    expect(isPresenceFresh('online', sec(NOW - PRESENCE_TTL_MS - 1000), NOW)).toBe(false);
  });

  it('is never present for an explicit offline status', () => {
    expect(isPresenceFresh('offline', sec(NOW), NOW)).toBe(false);
  });
});

describe('shouldAnnounceOnline', () => {
  const NOW = 1_700_000_000_000;
  const sec = (ms: number): number => Math.floor(ms / 1000);
  const base = { status: 'online' as const, at: sec(NOW), now: NOW, live: true, wasOnline: false, isSelf: false };

  it('announces a fresh live sign-in for a contact who was offline', () => {
    expect(shouldAnnounceOnline(base)).toBe(true);
  });

  it('stays silent for the stored backlog replayed on refresh (live: false)', () => {
    // The reported bug: a refresh replays each contact's last status as backlog.
    expect(shouldAnnounceOnline({ ...base, live: false })).toBe(false);
  });

  it('stays silent for a stale online status even when seen live', () => {
    // A peer who closed their tab without broadcasting offline: the relay keeps
    // their last 'online' and replays it — but it has aged past the TTL.
    expect(shouldAnnounceOnline({ ...base, at: sec(NOW - PRESENCE_TTL_MS - 1000) })).toBe(false);
  });

  it('does not re-announce a contact we already think is online', () => {
    expect(shouldAnnounceOnline({ ...base, wasOnline: true })).toBe(false);
  });

  it('never announces ourselves', () => {
    expect(shouldAnnounceOnline({ ...base, isSelf: true })).toBe(false);
  });

  it('stays silent when the contact went offline', () => {
    expect(shouldAnnounceOnline({ ...base, status: 'offline' })).toBe(false);
  });
});

describe('isPublishAccepted', () => {
  const ok = (value: string): PromiseSettledResult<string> => ({ status: 'fulfilled', value });
  const rejected = (reason: string): PromiseSettledResult<string> => ({ status: 'rejected', reason });

  it('counts a fulfilled OK reason (including an empty one) as accepted', () => {
    expect(isPublishAccepted(ok(''))).toBe(true);
    expect(isPublishAccepted(ok('duplicate:'))).toBe(true);
  });

  it('rejects the "connection failure" marker the pool resolves on no-connect', () => {
    expect(isPublishAccepted(ok('connection failure: relay down'))).toBe(false);
  });

  it('rejects an explicit relay rejection (OK:false / timeout)', () => {
    expect(isPublishAccepted(rejected('blocked: spam'))).toBe(false);
  });

  it('a send is delivered when any one relay accepts it', () => {
    const results = [ok('connection failure: a'), rejected('timeout'), ok('')];
    expect(results.some(isPublishAccepted)).toBe(true);
  });

  it('a send fails only when every relay rejects', () => {
    const results = [ok('connection failure: a'), rejected('timeout')];
    expect(results.some(isPublishAccepted)).toBe(false);
  });
});
