// The single source of truth. `reducer` is pure: same (state, action) => same
// state. All non-determinism (clock, RNG, network I/O) is resolved by the
// caller (the useNostr hook) and handed in via the action payload.

import type { Action, AppState, Chat, Delivery, IncomingPayload, Message, Profile, RelayInfo } from './types';
import { DEFAULT_AVATAR } from './data';
import { DEFAULT_COLOR, DEFAULT_FONT } from '../ui/fonts';
import { DEFAULT_RELAYS } from '../nostr/relays';
import { displayName } from './view';

const SAFETY_NOTICE =
  'Never give out your password or credit card number in an instant message conversation.';

export const initialState = (now: number): AppState => ({
  screen: 'signin',
  identities: [],
  myPubkey: null,
  myName: '',
  myPsm: '',
  myAvatar: DEFAULT_AVATAR,
  myStatus: 'online',
  signinStatus: 'online',
  fontFamily: DEFAULT_FONT,
  fontColor: DEFAULT_COLOR,
  relays: DEFAULT_RELAYS.map((url) => ({ url, enabled: true, status: 'connecting' as const })),
  follows: [],
  petnames: {},
  profiles: {},
  presence: {},
  lastReadAt: {},
  statusPickerOpen: false,
  onlineGroupOpen: true,
  offlineGroupOpen: true,
  relayManagerOpen: false,
  addContactOpen: false,
  shareOpen: false,
  changePictureOpen: false,
  chats: [],
  zTop: 30,
  now,
  buddyTop: 18,
  buddyLeft: null,
  signinTop: null,
  signinLeft: null,
});

const mapChat = (state: AppState, pubkey: string, fn: (chat: Chat) => Chat): readonly Chat[] =>
  state.chats.map((c) => (c.pubkey === pubkey ? fn(c) : c));

/** Open windows only — drives the cascade offset for the next one opened. */
const openCount = (state: AppState): number => state.chats.reduce((n, c) => (c.open ? n + 1 : n), 0);

const newChat = (pubkey: string, z: number, index: number): Chat => ({
  pubkey,
  messages: [{ kind: 'system', text: SAFETY_NOTICE, at: 0 }],
  seen: [],
  draft: '',
  emojiOpen: false,
  winkOn: false,
  winkGlyph: '😉',
  shake: false,
  typing: false,
  lastInboundAt: 0,
  open: true,
  z,
  top: 70 + index * 26,
  left: 60 + index * 30,
  width: 470,
  height: 504,
});

// Keep the transcript chronological: relays replay backlog out of order and
// gift wraps can be backdated, so sort on every insert. Array.sort is stable,
// so equal-timestamp messages keep their arrival order.
const append = (chat: Chat, message: Message): Chat => ({
  ...chat,
  messages: [...chat.messages, message].sort((a, b) => a.at - b.at),
});
const markSeen = (chat: Chat, id: string): Chat => ({ ...chat, seen: [...chat.seen, id] });

/** Advance a conversation's read marker; never moves it backwards. */
const markRead = (
  markers: Readonly<Record<string, number>>,
  pubkey: string,
  at: number,
): Readonly<Record<string, number>> =>
  at > (markers[pubkey] ?? 0) ? { ...markers, [pubkey]: at } : markers;

/** Newest `created_at` in a transcript (messages are kept sorted ascending). */
const newestAt = (chat: Chat): number => chat.messages[chat.messages.length - 1]?.at ?? 0;

const mergeProfile = (prev: Profile | undefined, next: Profile): Profile => ({ ...prev, ...next });

const mapRelay = (relays: readonly RelayInfo[], url: string, fn: (r: RelayInfo) => RelayInfo): readonly RelayInfo[] =>
  relays.map((r) => (r.url === url ? fn(r) : r));

interface ApplyArgs {
  readonly pubkey: string;
  readonly id: string;
  readonly mine: boolean;
  readonly at: number;
  readonly time: string;
  readonly payload: IncomingPayload;
  /** true => from the network (may flash a background window); false => our own optimistic send. */
  readonly inbound: boolean;
  /**
   * true => a real-time event the user should feel (shake/wink animations,
   * sounds). false => stored backlog the relay replays on every (re)connect.
   * Effect flags must stay off for backlog, else they latch `true` forever
   * (their reset timer only runs on the live path) and replay on every mount.
   */
  readonly live: boolean;
}

/** Fold one decrypted DM into the relevant chat, opening it if necessary. */
const applyMessage = (state: AppState, args: ApplyArgs): AppState => {
  const { pubkey, id, mine, at, time, payload, inbound, live } = args;
  const existing = state.chats.find((c) => c.pubkey === pubkey);
  if (existing?.seen.includes(id)) return state; // duplicate relay delivery

  const opening = existing === undefined;
  const zTop = opening ? state.zTop + 1 : state.zTop;
  const base = existing ?? newChat(pubkey, zTop, openCount(state));
  const name = displayName(pubkey, state.petnames[pubkey] ?? '', state.profiles[pubkey]);

  let chat = markSeen(base, id);
  switch (payload.kind) {
    case 'text':
      // Our own outgoing text starts 'sending' so the UI can show a pending ✓
      // and flip it to sent/failed once the relay outcome lands (MESSAGE_DELIVERY).
      chat = append(chat, { kind: 'chat', id, mine, body: payload.body, time, at, ...(inbound ? {} : { delivery: 'sending' as const }) });
      if (!inbound) chat = { ...chat, draft: '' };
      break;
    case 'nudge':
      chat = append(chat, { kind: 'system', text: mine ? 'You have just sent a Nudge.' : `${name} has just sent you a Nudge.`, at });
      if (live) chat = { ...chat, shake: true };
      break;
    case 'wink':
      chat = append(chat, { kind: 'system', text: mine ? 'You have sent a Wink.' : `${name} sent you a Wink.`, at });
      chat = { ...chat, winkGlyph: payload.body || chat.winkGlyph };
      if (live) chat = { ...chat, winkOn: true };
      break;
  }
  // Only live activity puts a window on screen. Backlog replayed on (re)connect
  // rebuilds the transcript but leaves the window closed, so a reload lands on a
  // clean desktop instead of reopening every past conversation; unread ones are
  // surfaced in the buddy list instead.
  chat = { ...chat, open: (existing?.open ?? false) || live };

  // Unread tracking is derived from `lastInboundAt` vs the read marker, so the
  // taskbar flash is a pure function of state and can't be left latched across a
  // reload. The marker only advances on *live* activity (never on the relay
  // backlog, which would otherwise mark genuinely-unread history as read).
  let lastReadAt = state.lastReadAt;
  if (inbound && !mine) {
    // They sent it, so they've stopped typing — drop the indicator.
    chat = { ...chat, typing: false, lastInboundAt: Math.max(chat.lastInboundAt, at) };
    const background = existing !== undefined && existing.z !== state.zTop;
    // Live message you're actively looking at (foreground, or a brand-new
    // conversation that opens focused) counts as read; a background one flashes.
    if (live && !background) lastReadAt = markRead(lastReadAt, pubkey, at);
  } else if (mine && live) {
    // Sending a message means you've seen everything in the conversation.
    lastReadAt = markRead(lastReadAt, pubkey, at);
  }

  const chats = opening ? [...state.chats, chat] : mapChat(state, pubkey, () => chat);
  return { ...state, chats, zTop, lastReadAt };
};

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_IDENTITY':
      return { ...state, identities: [...state.identities.filter((i) => i.pubkey !== action.identity.pubkey), action.identity] };
    case 'REMOVE_IDENTITY':
      return { ...state, identities: state.identities.filter((i) => i.pubkey !== action.pubkey) };
    case 'SET_SIGNIN_STATUS':
      return { ...state, signinStatus: action.status };

    case 'SIGN_IN':
      return {
        ...state,
        screen: 'desktop',
        myPubkey: action.pubkey,
        myName: action.name,
        myAvatar: action.avatar,
        myStatus: state.signinStatus,
        signinTop: null,
        signinLeft: null,
      };
    case 'SIGN_OUT':
      return {
        ...state,
        screen: 'signin',
        myPubkey: null,
        myName: '',
        myPsm: '',
        chats: [],
        follows: [],
        petnames: {},
        profiles: {},
        presence: {},
        lastReadAt: {},
        statusPickerOpen: false,
        relayManagerOpen: false,
        addContactOpen: false,
        shareOpen: false,
        changePictureOpen: false,
        signinTop: null,
        signinLeft: null,
      };

    case 'TOGGLE_STATUS_PICKER':
      return { ...state, statusPickerOpen: !state.statusPickerOpen };
    case 'SET_STATUS':
      return { ...state, myStatus: action.status, statusPickerOpen: false };
    case 'SET_PSM':
      return { ...state, myPsm: action.psm };
    case 'SET_MY_NAME':
      return { ...state, myName: action.name };
    case 'SET_FONT':
      return { ...state, fontFamily: action.fontFamily, fontColor: action.fontColor };
    case 'SET_AVATAR':
      return {
        ...state,
        myAvatar: action.picture,
        profiles: state.myPubkey
          ? { ...state.profiles, [state.myPubkey]: mergeProfile(state.profiles[state.myPubkey], { picture: action.picture }) }
          : state.profiles,
      };

    case 'PROFILE_LOADED': {
      const profiles = { ...state.profiles, [action.pubkey]: mergeProfile(state.profiles[action.pubkey], action.profile) };
      if (action.pubkey !== state.myPubkey) return { ...state, profiles };
      const merged = profiles[action.pubkey];
      const picture = merged?.picture?.trim();
      return {
        ...state,
        profiles,
        myName: merged?.displayName || merged?.name || state.myName,
        myPsm: merged?.about ?? state.myPsm,
        myAvatar: picture ? picture : state.myAvatar,
      };
    }
    case 'FOLLOWS_LOADED': {
      const follows = [...new Set(action.entries.map((e) => e.pubkey))];
      const petnames = { ...state.petnames };
      for (const e of action.entries) if (e.petname) petnames[e.pubkey] = e.petname;
      return { ...state, follows, petnames };
    }
    case 'PRESENCE_LOADED': {
      const prev = state.presence[action.pubkey];
      if (prev && prev.at >= action.at) return state;
      return { ...state, presence: { ...state.presence, [action.pubkey]: { status: action.status, at: action.at } } };
    }

    case 'ADD_CONTACT': {
      const follows = state.follows.includes(action.pubkey) ? state.follows : [...state.follows, action.pubkey];
      const petnames = action.petname ? { ...state.petnames, [action.pubkey]: action.petname } : state.petnames;
      return { ...state, follows, petnames, addContactOpen: false };
    }
    case 'REMOVE_CONTACT': {
      const petnames = { ...state.petnames };
      delete petnames[action.pubkey];
      return { ...state, follows: state.follows.filter((p) => p !== action.pubkey), petnames };
    }
    case 'SET_PETNAME': {
      // An empty petname clears the override, so the row falls back to the
      // contact's own profile name (see `displayName`).
      const petnames = { ...state.petnames };
      if (action.petname) petnames[action.pubkey] = action.petname;
      else delete petnames[action.pubkey];
      return { ...state, petnames };
    }

    case 'ADD_RELAY':
      return state.relays.some((r) => r.url === action.url)
        ? state
        : { ...state, relays: [...state.relays, { url: action.url, enabled: true, status: 'connecting' }] };
    case 'REMOVE_RELAY':
      return { ...state, relays: state.relays.filter((r) => r.url !== action.url) };
    case 'TOGGLE_RELAY':
      return { ...state, relays: mapRelay(state.relays, action.url, (r) => ({ ...r, enabled: !r.enabled })) };
    case 'RELAY_STATUS':
      return { ...state, relays: mapRelay(state.relays, action.url, (r) => ({ ...r, status: action.status })) };

    case 'TOGGLE_GROUP':
      return action.group === 'online'
        ? { ...state, onlineGroupOpen: !state.onlineGroupOpen }
        : { ...state, offlineGroupOpen: !state.offlineGroupOpen };
    case 'TOGGLE_RELAY_MANAGER':
      return { ...state, relayManagerOpen: !state.relayManagerOpen };
    case 'TOGGLE_ADD_CONTACT':
      return { ...state, addContactOpen: !state.addContactOpen };
    case 'TOGGLE_SHARE':
      return { ...state, shareOpen: !state.shareOpen };
    case 'TOGGLE_CHANGE_PICTURE':
      return { ...state, changePictureOpen: !state.changePictureOpen, statusPickerOpen: false };

    case 'OPEN_CHAT': {
      const z = state.zTop + 1;
      const existing = state.chats.find((c) => c.pubkey === action.pubkey);
      if (existing) {
        const lastReadAt = markRead(state.lastReadAt, action.pubkey, newestAt(existing));
        return { ...state, zTop: z, lastReadAt, statusPickerOpen: false, chats: mapChat(state, action.pubkey, (c) => ({ ...c, z, open: true })) };
      }
      return { ...state, zTop: z, statusPickerOpen: false, chats: [...state.chats, newChat(action.pubkey, z, openCount(state))] };
    }
    case 'CLOSE_CHAT':
      // Keep the transcript (and read marker) — just take the window off screen.
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, open: false })) };
    case 'FOCUS_CHAT': {
      const z = state.zTop + 1;
      const existing = state.chats.find((c) => c.pubkey === action.pubkey);
      const lastReadAt = existing ? markRead(state.lastReadAt, action.pubkey, newestAt(existing)) : state.lastReadAt;
      return { ...state, zTop: z, lastReadAt, chats: mapChat(state, action.pubkey, (c) => ({ ...c, z, open: true })) };
    }
    case 'MOVE_CHAT':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, top: action.top, left: action.left })) };
    case 'RESIZE_CHAT':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, width: action.width, height: action.height })) };
    case 'MOVE_BUDDY':
      return { ...state, buddyTop: action.top, buddyLeft: action.left };
    case 'MOVE_SIGNIN':
      return { ...state, signinTop: action.top, signinLeft: action.left };
    case 'SET_DRAFT':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, draft: action.draft })) };
    case 'TOGGLE_EMOJI':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, emojiOpen: !c.emojiOpen })) };
    case 'SET_SHAKE':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, shake: action.shake })) };
    case 'SET_WINK':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, winkOn: action.on, winkGlyph: action.glyph ?? c.winkGlyph })) };

    case 'MESSAGE_SENT':
      return applyMessage(state, { pubkey: action.pubkey, id: action.id, mine: true, at: action.at, time: action.time, payload: action.payload, inbound: false, live: true });
    case 'MESSAGE_RECEIVED':
      return applyMessage(state, { pubkey: action.partner, id: action.id, mine: action.mine, at: action.at, time: action.time, payload: action.payload, inbound: true, live: action.live });
    case 'MESSAGE_DELIVERY': {
      const delivery: Delivery = action.ok ? 'sent' : 'failed';
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.messages.some((m) => m.kind === 'chat' && m.id === action.id)
            ? { ...c, messages: c.messages.map((m) => (m.kind === 'chat' && m.id === action.id ? { ...m, delivery } : m)) }
            : c,
        ),
      };
    }
    case 'APPEND_SYSTEM':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => append(c, { kind: 'system', text: action.text, at: Math.floor(state.now / 1000) })) };

    // Typing only ever decorates an *existing* conversation — it never opens a
    // window, so an unsolicited ping from a stranger can't pop one up.
    case 'CONTACT_TYPING':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, typing: true })) };
    case 'CLEAR_TYPING':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, typing: false })) };

    case 'READ_MARKERS_LOADED': {
      // Merge by max so neither a stale local copy nor an out-of-order relay
      // delivery can roll a conversation back to "unread".
      const merged: Record<string, number> = { ...state.lastReadAt };
      for (const [pubkey, at] of Object.entries(action.markers)) {
        if (typeof at === 'number' && at > (merged[pubkey] ?? 0)) merged[pubkey] = at;
      }
      return { ...state, lastReadAt: merged };
    }

    case 'TICK':
      return { ...state, now: action.now };
  }
};
