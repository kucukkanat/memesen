import { describe, expect, it } from 'bun:test';
import type { Action, AppState, Chat } from './types';
import { initialState, reducer } from './reducer';
import { isUnread } from './view';

const unread = (s: AppState, pubkey: string): boolean => {
  const c = s.chats.find((chat) => chat.pubkey === pubkey);
  return c ? isUnread(c, s.lastReadAt) : false;
};

const T0 = new Date(2004, 2, 1, 21, 7).getTime();
const base = (): AppState => initialState(T0);

// Valid 64-char hex pubkeys (npub-encodable) for the social-graph tests.
const ALICE = 'a'.repeat(64);
const BOB = 'b'.repeat(64);
const ME = 'c'.repeat(64);

const run = (start: AppState, ...actions: readonly Action[]): AppState => actions.reduce(reducer, start);
const chatOf = (s: AppState, pubkey: string): Chat | undefined => s.chats.find((c) => c.pubkey === pubkey);
const signedIn = (): AppState => reducer(base(), { type: 'SIGN_IN', pubkey: ME, name: 'me', avatar: 'beach' });

const text = (id: string, partner: string, body: string, mine = false, at = 1000): Action => ({
  type: 'MESSAGE_RECEIVED', id, partner, mine, at, time: '(9:07 PM)', payload: { kind: 'text', body }, live: true,
});

describe('reducer — purity', () => {
  it('never mutates the previous state', () => {
    const s = base();
    const next = reducer(s, { type: 'SET_PSM', psm: 'hi' });
    expect(s.myPsm).toBe('');
    expect(next).not.toBe(s);
    expect(next.myPsm).toBe('hi');
  });
});

describe('reducer — identity', () => {
  it('upserts identities by pubkey rather than duplicating', () => {
    const s = run(base(),
      { type: 'ADD_IDENTITY', identity: { pubkey: ALICE, nsec: 'n1', name: 'a' } },
      { type: 'ADD_IDENTITY', identity: { pubkey: ALICE, nsec: 'n1', name: 'a renamed' } },
    );
    expect(s.identities).toHaveLength(1);
    expect(s.identities[0]?.name).toBe('a renamed');
  });

  it('signs in to the desktop and carries the chosen status', () => {
    const s = reducer({ ...base(), signinStatus: 'busy' }, { type: 'SIGN_IN', pubkey: ME, name: 'me', avatar: 'beach' });
    expect(s.screen).toBe('desktop');
    expect(s.myPubkey).toBe(ME);
    expect(s.myStatus).toBe('busy');
    expect(s.myAvatar).toBe('beach');
  });

  it('signs out, clearing the session graph but keeping identities', () => {
    const s = run(signedIn(),
      { type: 'ADD_IDENTITY', identity: { pubkey: ME, nsec: 'n', name: 'me' } },
      { type: 'FOLLOWS_LOADED', entries: [{ pubkey: ALICE, petname: '' }] },
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'SIGN_OUT' },
    );
    expect(s.screen).toBe('signin');
    expect(s.myPubkey).toBeNull();
    expect(s.chats).toHaveLength(0);
    expect(s.follows).toHaveLength(0);
    expect(s.identities).toHaveLength(1);
  });
});

describe('reducer — social graph', () => {
  it('loads follows and petnames, de-duplicating pubkeys', () => {
    const s = reducer(signedIn(), {
      type: 'FOLLOWS_LOADED',
      entries: [{ pubkey: ALICE, petname: 'Ally' }, { pubkey: ALICE, petname: 'Ally' }, { pubkey: BOB, petname: '' }],
    });
    expect(s.follows).toEqual([ALICE, BOB]);
    expect(s.petnames[ALICE]).toBe('Ally');
  });

  it('only keeps the newest presence for a pubkey', () => {
    const s = run(signedIn(),
      { type: 'PRESENCE_LOADED', pubkey: ALICE, status: 'online', at: 200 },
      { type: 'PRESENCE_LOADED', pubkey: ALICE, status: 'away', at: 100 },
    );
    expect(s.presence[ALICE]).toEqual({ status: 'online', at: 200 });
  });

  it('merges profile fields and reflects my own profile into the header', () => {
    const s = run(signedIn(),
      { type: 'PROFILE_LOADED', pubkey: ME, profile: { name: 'Neo' } },
      { type: 'PROFILE_LOADED', pubkey: ME, profile: { about: 'the one' } },
    );
    expect(s.myName).toBe('Neo');
    expect(s.myPsm).toBe('the one');
    expect(s.profiles[ME]).toEqual({ name: 'Neo', about: 'the one' });
  });

  it('toggles the share dialog', () => {
    expect(base().shareOpen).toBe(false);
    expect(reducer(base(), { type: 'TOGGLE_SHARE' }).shareOpen).toBe(true);
  });

  it('sets my display picture and reflects it into my profile', () => {
    const s = reducer(signedIn(), { type: 'SET_AVATAR', picture: 'memesen:rocket' });
    expect(s.myAvatar).toBe('memesen:rocket');
    expect(s.profiles[ME]?.picture).toBe('memesen:rocket');
  });

  it('adopts a loaded profile picture for my own header', () => {
    const s = reducer(signedIn(), { type: 'PROFILE_LOADED', pubkey: ME, profile: { picture: 'https://x/y.png' } });
    expect(s.myAvatar).toBe('https://x/y.png');
  });

  it('adds and removes contacts and closes the add dialog', () => {
    const added = run(signedIn(),
      { type: 'TOGGLE_ADD_CONTACT' },
      { type: 'ADD_CONTACT', pubkey: ALICE, petname: 'Ally' },
    );
    expect(added.follows).toEqual([ALICE]);
    expect(added.petnames[ALICE]).toBe('Ally');
    expect(added.addContactOpen).toBe(false);

    const removed = reducer(added, { type: 'REMOVE_CONTACT', pubkey: ALICE });
    expect(removed.follows).toHaveLength(0);
    expect(removed.petnames[ALICE]).toBeUndefined();
  });

  it('renames a contact and clears the petname when blank', () => {
    const added = reducer(signedIn(), { type: 'ADD_CONTACT', pubkey: ALICE, petname: 'Ally' });

    const renamed = reducer(added, { type: 'SET_PETNAME', pubkey: ALICE, petname: 'Alice B.' });
    expect(renamed.petnames[ALICE]).toBe('Alice B.');
    expect(renamed.follows).toEqual([ALICE]); // membership untouched

    const cleared = reducer(renamed, { type: 'SET_PETNAME', pubkey: ALICE, petname: '' });
    expect(cleared.petnames[ALICE]).toBeUndefined(); // falls back to profile name
    expect(cleared.follows).toEqual([ALICE]);
  });
});

describe('reducer — relays', () => {
  it('adds, toggles, statuses and removes relays without duplicates', () => {
    const s = run(base(),
      { type: 'ADD_RELAY', url: 'wss://a' },
      { type: 'ADD_RELAY', url: 'wss://a' },
      { type: 'TOGGLE_RELAY', url: 'wss://a' },
      { type: 'RELAY_STATUS', url: 'wss://a', status: 'connected' },
    );
    const added = s.relays.filter((r) => r.url === 'wss://a');
    expect(added).toHaveLength(1);
    expect(added[0]).toEqual({ url: 'wss://a', enabled: false, status: 'connected' });

    const removed = reducer(s, { type: 'REMOVE_RELAY', url: 'wss://a' });
    expect(removed.relays.some((r) => r.url === 'wss://a')).toBe(false);
  });
});

describe('reducer — chat windows', () => {
  it('opens a chat with the standard safety notice', () => {
    const s = reducer(signedIn(), { type: 'OPEN_CHAT', pubkey: ALICE });
    expect(s.chats).toHaveLength(1);
    expect(chatOf(s, ALICE)?.messages[0]).toEqual({
      kind: 'system',
      text: 'Never give out your password or credit card number in an instant message conversation.',
      at: 0,
    });
  });

  it('does not duplicate a chat, just raises it to the front', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'OPEN_CHAT', pubkey: BOB },
      { type: 'OPEN_CHAT', pubkey: ALICE },
    );
    expect(s.chats).toHaveLength(2);
    const a = chatOf(s, ALICE);
    const b = chatOf(s, BOB);
    expect(a && b && a.z > b.z).toBe(true);
  });

  it('focusing clears the flash and raises the window', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'OPEN_CHAT', pubkey: BOB }, // alice now in the background
      text('e1', ALICE, 'oi'), // flashes alice's background window
      { type: 'FOCUS_CHAT', pubkey: ALICE },
    );
    expect(unread(s, ALICE)).toBe(false);
  });

  it('FOCUS_BUDDY raises the buddy list above the front-most chat', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'OPEN_CHAT', pubkey: BOB }, // bob is now the front-most window
    );
    expect(s.buddyZ).toBeLessThan(chatOf(s, BOB)!.z); // pinned behind to start
    const focused = reducer(s, { type: 'FOCUS_BUDDY' });
    expect(focused.buddyZ).toBeGreaterThan(chatOf(focused, BOB)!.z);
    expect(focused.buddyZ).toBe(focused.zTop);
  });

  it('closing a window keeps the transcript, just hides it', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      text('e1', ALICE, 'hi there'),
      { type: 'CLOSE_CHAT', pubkey: ALICE },
    );
    const c = chatOf(s, ALICE);
    expect(c?.open).toBe(false);
    expect(c?.messages.some((m) => m.kind === 'chat')).toBe(true); // history retained
  });

  it('reopening a closed conversation shows it again with its history', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      text('e1', ALICE, 'hi there'),
      { type: 'CLOSE_CHAT', pubkey: ALICE },
      { type: 'OPEN_CHAT', pubkey: ALICE },
    );
    const c = chatOf(s, ALICE);
    expect(c?.open).toBe(true);
    expect(c?.messages.filter((m) => m.kind === 'chat')).toHaveLength(1);
  });

  it('resizes only the targeted chat, leaving its position untouched', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'RESIZE_CHAT', pubkey: ALICE, width: 600, height: 540 },
    );
    const c = chatOf(s, ALICE);
    expect([c?.width, c?.height, c?.top, c?.left]).toEqual([600, 540, 70, 60]);
  });
});

describe('reducer — messaging', () => {
  it('an inbound message opens a chat in the foreground (no flash)', () => {
    const s = reducer(signedIn(), text('e1', ALICE, 'hello :)'));
    const c = chatOf(s, ALICE);
    expect(unread(s, ALICE)).toBe(false);
    expect(c?.messages.at(-1)).toEqual({ kind: 'chat', id: 'e1', mine: false, body: 'hello :)', time: '(9:07 PM)', at: 1000 });
  });

  it('flashes a background window when a message arrives for it', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE }, // alice in foreground
      { type: 'OPEN_CHAT', pubkey: BOB }, // bob now in front, alice is behind
      text('e1', ALICE, 'oi'),
    );
    expect(unread(s, ALICE)).toBe(true);
  });

  it('a live message opens its window; replayed backlog does not (clean reload)', () => {
    const backlog = (id: string, at: number): Action => ({
      type: 'MESSAGE_RECEIVED', id, partner: BOB, mine: false, at, time: '(9:07 PM)', payload: { kind: 'text', body: 'hi' }, live: false,
    });
    // A reload replays history as backlog: the transcript is rebuilt but stays
    // closed, so no window pops up.
    const reloaded = run(signedIn(), backlog('b1', 1000), backlog('b2', 2000));
    expect(chatOf(reloaded, BOB)?.open).toBe(false);
    expect(chatOf(reloaded, BOB)?.messages.some((m) => m.kind === 'chat')).toBe(true);
    // A genuinely live message then opens the window.
    const live = reducer(reloaded, text('b3', BOB, 'you there?', false, 3000));
    expect(chatOf(live, BOB)?.open).toBe(true);
  });

  it('does not re-flash a read conversation when the backlog replays (the reload bug)', () => {
    // Simulate a reload: the read marker survives (loaded from storage / sync),
    // then the relay replays the whole history as backlog (live=false).
    const replay = (id: string, at: number): Action => ({
      type: 'MESSAGE_RECEIVED', id, partner: ALICE, mine: false, at, time: '(9:07 PM)', payload: { kind: 'text', body: 'hi' }, live: false,
    });
    const s = run(
      { ...signedIn(), lastReadAt: { [ALICE]: 3000 } },
      { type: 'OPEN_CHAT', pubkey: BOB }, // something else holds the foreground
      replay('r1', 1000),
      replay('r3', 3000),
      replay('r2', 2000),
    );
    expect(unread(s, ALICE)).toBe(false);
  });

  it('flashes when the backlog contains a message newer than the read marker', () => {
    const s = run(
      { ...signedIn(), lastReadAt: { [ALICE]: 3000 } },
      { type: 'OPEN_CHAT', pubkey: BOB },
      { type: 'MESSAGE_RECEIVED', id: 'r4', partner: ALICE, mine: false, at: 4000, time: '(9:07 PM)', payload: { kind: 'text', body: 'new!' }, live: false },
    );
    expect(unread(s, ALICE)).toBe(true);
  });

  it('merges read markers by max, never rolling a conversation back to unread', () => {
    const s = run(
      { ...signedIn(), lastReadAt: { [ALICE]: 5000 } },
      { type: 'READ_MARKERS_LOADED', markers: { [ALICE]: 2000, [BOB]: 9000 } },
    );
    expect(s.lastReadAt[ALICE]).toBe(5000);
    expect(s.lastReadAt[BOB]).toBe(9000);
  });

  it('orders the transcript by timestamp even when relayed out of order', () => {
    // Backlog replayed newest-first, plus a backdated gift wrap arriving last.
    const s = run(signedIn(),
      text('e3', ALICE, 'third', false, 3000),
      text('e1', ALICE, 'first', false, 1000),
      text('e2', ALICE, 'second', false, 2000),
    );
    const bodies = chatOf(s, ALICE)?.messages.filter((m) => m.kind === 'chat').map((m) => m.kind === 'chat' && m.body);
    expect(bodies).toEqual(['first', 'second', 'third']);
    // Safety notice (at: 0) stays pinned to the top.
    expect(chatOf(s, ALICE)?.messages[0]?.kind).toBe('system');
  });

  it('dedupes a relay echo of an already-applied message id', () => {
    const s = run(signedIn(), text('dup', ALICE, 'once'), text('dup', ALICE, 'once'));
    const chats = chatOf(s, ALICE)?.messages.filter((m) => m.kind === 'chat');
    expect(chats).toHaveLength(1);
  });

  it('optimistic send records the id so its own echo is ignored', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'SET_DRAFT', pubkey: ALICE, draft: 'hi' },
      { type: 'MESSAGE_SENT', pubkey: ALICE, id: 'r1', at: 1000, time: '(9:07 PM)', payload: { kind: 'text', body: 'hi' } },
      text('r1', ALICE, 'hi', true), // the gift-wrapped echo of our own send
    );
    const c = chatOf(s, ALICE);
    expect(c?.draft).toBe('');
    expect(c?.messages.filter((m) => m.kind === 'chat')).toHaveLength(1);
    expect(c?.messages.at(-1)).toMatchObject({ mine: true, body: 'hi' });
  });

  it('renders an inbound nudge as a system line and shakes the window', () => {
    const s = reducer(signedIn(), { type: 'MESSAGE_RECEIVED', id: 'n1', partner: ALICE, mine: false, at: 1000, time: '(9:07 PM)', payload: { kind: 'nudge', body: '' }, live: true });
    const c = chatOf(s, ALICE);
    expect(c?.shake).toBe(true);
    expect(c?.messages.at(-1)).toMatchObject({ kind: 'system' });
  });

  it('renders an inbound wink and arms the overlay glyph', () => {
    const s = reducer(signedIn(), { type: 'MESSAGE_RECEIVED', id: 'w1', partner: ALICE, mine: false, at: 1000, time: '(9:07 PM)', payload: { kind: 'wink', body: '🎉' }, live: true });
    const c = chatOf(s, ALICE);
    expect(c?.winkOn).toBe(true);
    expect(c?.winkGlyph).toBe('🎉');
  });

  // Regression: a nudge/wink replayed from the relay backlog (live=false) must
  // log its system line but NOT arm the shake/wink flag. Those flags are only
  // reset by a live-path timer, so latching them on backlog leaves them stuck
  // `true` and the animation replays on every window mount (e.g. taskbar tap).
  it('does not shake the window for a backlog nudge (live=false)', () => {
    const s = reducer(signedIn(), { type: 'MESSAGE_RECEIVED', id: 'n2', partner: ALICE, mine: false, at: 1000, time: '(9:07 PM)', payload: { kind: 'nudge', body: '' }, live: false });
    const c = chatOf(s, ALICE);
    expect(c?.shake).toBe(false);
    expect(c?.messages.at(-1)).toMatchObject({ kind: 'system' });
  });

  it('does not arm the wink overlay for a backlog wink (live=false)', () => {
    const s = reducer(signedIn(), { type: 'MESSAGE_RECEIVED', id: 'w2', partner: ALICE, mine: false, at: 1000, time: '(9:07 PM)', payload: { kind: 'wink', body: '🎉' }, live: false });
    const c = chatOf(s, ALICE);
    expect(c?.winkOn).toBe(false);
    expect(c?.winkGlyph).toBe('🎉');
  });
});

describe('reducer — typing indicator', () => {
  it('lights and clears the indicator on an open conversation', () => {
    const open = run(signedIn(), { type: 'OPEN_CHAT', pubkey: ALICE });
    const typing = reducer(open, { type: 'CONTACT_TYPING', pubkey: ALICE });
    expect(chatOf(typing, ALICE)?.typing).toBe(true);
    const cleared = reducer(typing, { type: 'CLEAR_TYPING', pubkey: ALICE });
    expect(chatOf(cleared, ALICE)?.typing).toBe(false);
  });

  it('never opens a window — a ping for an unknown chat is a no-op', () => {
    const s = reducer(signedIn(), { type: 'CONTACT_TYPING', pubkey: ALICE });
    expect(chatOf(s, ALICE)).toBeUndefined();
  });

  it('drops the indicator once the awaited message actually arrives', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'CONTACT_TYPING', pubkey: ALICE },
      text('e1', ALICE, 'here it is'),
    );
    expect(chatOf(s, ALICE)?.typing).toBe(false);
  });

  it('leaves our own echoed message without disturbing the flag', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'CONTACT_TYPING', pubkey: ALICE },
      // our own send (mine) shouldn't clear *their* typing state
      { type: 'MESSAGE_SENT', pubkey: ALICE, id: 'm1', at: 2000, time: '(9:08 PM)', payload: { kind: 'text', body: 'hi' } },
    );
    expect(chatOf(s, ALICE)?.typing).toBe(true);
  });
});

describe('reducer — delivery tracking', () => {
  const sent = (id: string, body = 'hi'): Action => ({
    type: 'MESSAGE_SENT', pubkey: ALICE, id, at: 2000, time: '(9:08 PM)', payload: { kind: 'text', body },
  });
  const chatBody = (s: AppState, id: string) =>
    chatOf(s, ALICE)?.messages.find((m) => m.kind === 'chat' && m.id === id);

  it('marks our own outgoing text as "sending" optimistically', () => {
    const s = run(signedIn(), sent('m1'));
    expect(chatBody(s, 'm1')).toMatchObject({ mine: true, delivery: 'sending' });
  });

  it('does not tag received messages with a delivery state', () => {
    const s = run(signedIn(), text('r1', ALICE, 'yo'));
    const m = chatBody(s, 'r1');
    expect(m?.kind).toBe('chat');
    expect(m && 'delivery' in m && m.delivery).toBeFalsy();
  });

  it('flips to "sent" when a relay confirms delivery', () => {
    const s = run(signedIn(), sent('m1'), { type: 'MESSAGE_DELIVERY', id: 'm1', ok: true });
    expect(chatBody(s, 'm1')).toMatchObject({ delivery: 'sent' });
  });

  it('flips to "failed" when every relay rejected it', () => {
    const s = run(signedIn(), sent('m1'), { type: 'MESSAGE_DELIVERY', id: 'm1', ok: false });
    expect(chatBody(s, 'm1')).toMatchObject({ delivery: 'failed' });
  });

  it('ignores a delivery update for an unknown message id', () => {
    const s = run(signedIn(), sent('m1'));
    const after = reducer(s, { type: 'MESSAGE_DELIVERY', id: 'ghost', ok: false });
    expect(after.chats).toEqual(s.chats);
  });
});

describe('reducer — image messages', () => {
  const DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
  const chatMsg = (s: AppState, id: string) =>
    chatOf(s, ALICE)?.messages.find((m) => m.kind === 'chat' && m.id === id);

  it('flags an outgoing image and tracks its delivery like text', () => {
    const s = run(signedIn(), {
      type: 'MESSAGE_SENT', pubkey: ALICE, id: 'img1', at: 3000, time: '(9:09 PM)', payload: { kind: 'image', body: DATA_URL },
    });
    expect(chatMsg(s, 'img1')).toMatchObject({ mine: true, image: true, body: DATA_URL, delivery: 'sending' });
  });

  it('flips an image to "sent" on relay confirmation', () => {
    const s = run(signedIn(),
      { type: 'MESSAGE_SENT', pubkey: ALICE, id: 'img1', at: 3000, time: '(9:09 PM)', payload: { kind: 'image', body: DATA_URL } },
      { type: 'MESSAGE_DELIVERY', id: 'img1', ok: true },
    );
    expect(chatMsg(s, 'img1')).toMatchObject({ image: true, delivery: 'sent' });
  });

  it('records an inbound image and flashes it unread', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'FOCUS_CHAT', pubkey: BOB }, // push ALICE to the background so it flashes
      { type: 'MESSAGE_RECEIVED', id: 'img2', partner: ALICE, mine: false, at: 4000, time: '(9:10 PM)', payload: { kind: 'image', body: DATA_URL }, live: true },
    );
    expect(chatMsg(s, 'img2')).toMatchObject({ mine: false, image: true, body: DATA_URL });
    expect(unread(s, ALICE)).toBe(true);
  });

  it('leaves a half-typed draft intact when an image is sent', () => {
    const s = run(signedIn(),
      { type: 'OPEN_CHAT', pubkey: ALICE },
      { type: 'SET_DRAFT', pubkey: ALICE, draft: 'brb typing' },
      { type: 'MESSAGE_SENT', pubkey: ALICE, id: 'img3', at: 3000, time: '(9:09 PM)', payload: { kind: 'image', body: DATA_URL } },
    );
    expect(chatOf(s, ALICE)?.draft).toBe('brb typing');
  });
});
