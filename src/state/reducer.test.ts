import { describe, expect, it } from 'bun:test';
import type { Action, AppState, Contact } from './types';
import { initialState, reducer } from './reducer';
import { CONTACTS } from './data';

const T0 = new Date(2004, 2, 1, 21, 7).getTime();
const base = (): AppState => initialState(T0);

/** Fold a sequence of actions for integration-style assertions. */
const run = (start: AppState, ...actions: readonly Action[]): AppState =>
  actions.reduce(reducer, start);

const contact = (id: string): Contact => {
  const c = CONTACTS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown contact ${id}`);
  return c;
};

describe('reducer — purity', () => {
  it('never mutates the previous state', () => {
    const s = base();
    const next = reducer(s, { type: 'SET_EMAIL', email: 'a@b.com' });
    expect(s.email).toBe('');
    expect(next).not.toBe(s);
    expect(next.email).toBe('a@b.com');
  });
});

describe('reducer — sign in / out', () => {
  it('derives the screen name from the email and carries the chosen status', () => {
    const s = run(base(),
      { type: 'SET_EMAIL', email: 'cooldude@hotmail.com' },
      { type: 'SET_SIGNIN_STATUS', status: 'busy' },
      { type: 'SIGN_IN' },
    );
    expect(s.screen).toBe('desktop');
    expect(s.myName).toBe('cooldude');
    expect(s.myStatus).toBe('busy');
  });

  it('keeps "appear offline" as invisible after signing in', () => {
    const s = run(base(),
      { type: 'SET_EMAIL', email: 'ghost@hotmail.com' },
      { type: 'SET_SIGNIN_STATUS', status: 'invisible' },
      { type: 'SIGN_IN' },
    );
    expect(s.myStatus).toBe('invisible');
  });

  it('falls back to Me with no email', () => {
    expect(run(base(), { type: 'SIGN_IN' }).myName).toBe('Me');
  });

  it('sign out clears chats and returns to the sign-in screen', () => {
    const s = run(base(),
      { type: 'SIGN_IN' },
      { type: 'OPEN_CHAT', contact: contact('sarah') },
      { type: 'SIGN_OUT' },
    );
    expect(s.screen).toBe('signin');
    expect(s.chats).toHaveLength(0);
  });
});

describe('reducer — chats', () => {
  it('opens a chat with a safety notice for online contacts', () => {
    const s = reducer(base(), { type: 'OPEN_CHAT', contact: contact('sarah') });
    expect(s.chats).toHaveLength(1);
    expect(s.chats[0]?.messages[0]).toEqual({
      kind: 'system',
      text: 'Never give out your password or credit card number in an instant message conversation.',
    });
  });

  it('opens an offline contact with the offline notice', () => {
    const s = reducer(base(), { type: 'OPEN_CHAT', contact: contact('tom') });
    expect(s.chats[0]?.messages[0]).toEqual({
      kind: 'system',
      text: 'This person is offline. Messages will be delivered when they sign in.',
    });
  });

  it('does not duplicate a chat, just raises it to the front', () => {
    const s = run(base(),
      { type: 'OPEN_CHAT', contact: contact('sarah') },
      { type: 'OPEN_CHAT', contact: contact('mike') },
      { type: 'OPEN_CHAT', contact: contact('sarah') },
    );
    expect(s.chats).toHaveLength(2);
    const sarah = s.chats.find((c) => c.id === 'sarah');
    const mike = s.chats.find((c) => c.id === 'mike');
    expect(sarah && mike && sarah.z > mike.z).toBe(true);
  });

  it('focus raises a window above the others', () => {
    const s = run(base(),
      { type: 'OPEN_CHAT', contact: contact('sarah') },
      { type: 'OPEN_CHAT', contact: contact('mike') },
      { type: 'FOCUS_CHAT', id: 'sarah' },
    );
    const sarah = s.chats.find((c) => c.id === 'sarah');
    const mike = s.chats.find((c) => c.id === 'mike');
    expect(sarah && mike && sarah.z > mike.z).toBe(true);
  });

  it('flashes a taskbar button and clears it when the window is focused', () => {
    const opened = run(base(), { type: 'OPEN_CHAT', contact: contact('sarah') });
    expect(opened.chats[0]?.flashing).toBe(false);

    const flashed = reducer(opened, { type: 'SET_FLASH', id: 'sarah', on: true });
    expect(flashed.chats[0]?.flashing).toBe(true);

    const focused = reducer(flashed, { type: 'FOCUS_CHAT', id: 'sarah' });
    expect(focused.chats[0]?.flashing).toBe(false);
  });

  it('resizes only the targeted chat, leaving its position untouched', () => {
    const s = run(base(),
      { type: 'OPEN_CHAT', contact: contact('sarah') },
      { type: 'RESIZE_CHAT', id: 'sarah', width: 600, height: 540 },
    );
    const chat = s.chats.find((c) => c.id === 'sarah');
    expect(chat?.width).toBe(600);
    expect(chat?.height).toBe(540);
    expect(chat?.top).toBe(70);
    expect(chat?.left).toBe(60);
  });

  it('closing removes only the targeted chat', () => {
    const s = run(base(),
      { type: 'OPEN_CHAT', contact: contact('sarah') },
      { type: 'OPEN_CHAT', contact: contact('mike') },
      { type: 'CLOSE_CHAT', id: 'sarah' },
    );
    expect(s.chats.map((c) => c.id)).toEqual(['mike']);
  });

  it('sending appends my message and clears the draft', () => {
    const s = run(base(),
      { type: 'SET_EMAIL', email: 'me@hotmail.com' },
      { type: 'SIGN_IN' },
      { type: 'OPEN_CHAT', contact: contact('sarah') },
      { type: 'SET_DRAFT', id: 'sarah', draft: 'hello' },
      { type: 'SEND_MESSAGE', id: 'sarah', body: 'hello', time: '(9:07 PM)' },
    );
    const chat = s.chats.find((c) => c.id === 'sarah');
    expect(chat?.draft).toBe('');
    expect(chat?.messages.at(-1)).toEqual({ kind: 'chat', sender: 'me', body: 'hello', time: '(9:07 PM)', mine: true });
  });
});

describe('reducer — status, groups, and movement', () => {
  it('picking a status closes the picker', () => {
    const s = run(base(),
      { type: 'TOGGLE_STATUS_PICKER' },
      { type: 'SET_STATUS', status: 'away' },
    );
    expect(s.myStatus).toBe('away');
    expect(s.statusPickerOpen).toBe(false);
  });

  it('toggles contact groups independently', () => {
    const s = run(base(), { type: 'TOGGLE_GROUP', group: 'offline' });
    expect(s.onlineGroupOpen).toBe(true);
    expect(s.offlineGroupOpen).toBe(false);
  });

  it('moving the buddy window switches it from right-anchored to a left coordinate', () => {
    expect(base().buddyLeft).toBeNull();
    const s = reducer(base(), { type: 'MOVE_BUDDY', top: 40, left: 120 });
    expect(s.buddyLeft).toBe(120);
    expect(s.buddyTop).toBe(40);
  });

  it('the sign-in window starts centered and takes explicit coords once dragged', () => {
    expect(base().signinLeft).toBeNull();
    const s = reducer(base(), { type: 'MOVE_SIGNIN', top: 60, left: 200 });
    expect(s.signinTop).toBe(60);
    expect(s.signinLeft).toBe(200);
  });

  it('signing out re-centers the sign-in window', () => {
    const s = run(base(),
      { type: 'MOVE_SIGNIN', top: 60, left: 200 },
      { type: 'SIGN_IN' },
      { type: 'SIGN_OUT' },
    );
    expect(s.signinTop).toBeNull();
    expect(s.signinLeft).toBeNull();
  });
});
