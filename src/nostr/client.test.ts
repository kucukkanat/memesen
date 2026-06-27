import { describe, expect, it } from 'bun:test';
import { shouldAnnounce, type IncomingMessage } from './client';

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
