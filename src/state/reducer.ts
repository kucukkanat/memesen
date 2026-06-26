// The single source of truth. `reducer` is pure: same (state, action) => same
// state. All non-determinism (clock, RNG, network I/O) is resolved by the
// caller (the useNostr hook) and handed in via the action payload.

import type { Action, AppState, Chat, IncomingPayload, Message, Profile, RelayInfo } from './types';
import { DEFAULT_AVATAR } from './data';
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
  relays: DEFAULT_RELAYS.map((url) => ({ url, enabled: true, status: 'connecting' as const })),
  follows: [],
  petnames: {},
  profiles: {},
  presence: {},
  statusPickerOpen: false,
  onlineGroupOpen: true,
  offlineGroupOpen: true,
  relayManagerOpen: false,
  addContactOpen: false,
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

const newChat = (pubkey: string, z: number, index: number): Chat => ({
  pubkey,
  messages: [{ kind: 'system', text: SAFETY_NOTICE }],
  seen: [],
  draft: '',
  emojiOpen: false,
  winkOn: false,
  winkGlyph: '😉',
  shake: false,
  typing: false,
  flashing: false,
  z,
  top: 70 + index * 26,
  left: 60 + index * 30,
  width: 452,
  height: 470,
});

const append = (chat: Chat, message: Message): Chat => ({ ...chat, messages: [...chat.messages, message] });
const markSeen = (chat: Chat, id: string): Chat => ({ ...chat, seen: [...chat.seen, id] });

const mergeProfile = (prev: Profile | undefined, next: Profile): Profile => ({ ...prev, ...next });

const mapRelay = (relays: readonly RelayInfo[], url: string, fn: (r: RelayInfo) => RelayInfo): readonly RelayInfo[] =>
  relays.map((r) => (r.url === url ? fn(r) : r));

interface ApplyArgs {
  readonly pubkey: string;
  readonly id: string;
  readonly mine: boolean;
  readonly time: string;
  readonly payload: IncomingPayload;
  /** true => from the network (may flash a background window); false => our own optimistic send. */
  readonly inbound: boolean;
}

/** Fold one decrypted DM into the relevant chat, opening it if necessary. */
const applyMessage = (state: AppState, args: ApplyArgs): AppState => {
  const { pubkey, id, mine, time, payload, inbound } = args;
  const existing = state.chats.find((c) => c.pubkey === pubkey);
  if (existing?.seen.includes(id)) return state; // duplicate relay delivery

  const opening = existing === undefined;
  const zTop = opening ? state.zTop + 1 : state.zTop;
  const base = existing ?? newChat(pubkey, zTop, state.chats.length);
  const name = displayName(pubkey, state.petnames[pubkey] ?? '', state.profiles[pubkey]);

  let chat = markSeen(base, id);
  switch (payload.kind) {
    case 'text':
      chat = append(chat, { kind: 'chat', id, mine, body: payload.body, time });
      if (!inbound) chat = { ...chat, draft: '' };
      break;
    case 'nudge':
      chat = append(chat, { kind: 'system', text: mine ? 'You have just sent a Nudge.' : `${name} has just sent you a Nudge.` });
      chat = { ...chat, shake: true };
      break;
    case 'wink':
      chat = append(chat, { kind: 'system', text: mine ? 'You have sent a Wink.' : `${name} sent you a Wink.` });
      chat = { ...chat, winkOn: true, winkGlyph: payload.body || chat.winkGlyph };
      break;
  }
  // Flash the taskbar only for inbound messages to an already-open background window.
  if (inbound && !mine && existing && existing.z !== state.zTop) chat = { ...chat, flashing: true };

  const chats = opening ? [...state.chats, chat] : mapChat(state, pubkey, () => chat);
  return { ...state, chats, zTop };
};

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        identities: action.identities,
        relays: action.relays.map((r) => ({ ...r, status: 'connecting' as const })),
      };
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
        statusPickerOpen: false,
        relayManagerOpen: false,
        addContactOpen: false,
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

    case 'PROFILE_LOADED': {
      const profiles = { ...state.profiles, [action.pubkey]: mergeProfile(state.profiles[action.pubkey], action.profile) };
      if (action.pubkey !== state.myPubkey) return { ...state, profiles };
      const merged = profiles[action.pubkey];
      return {
        ...state,
        profiles,
        myName: merged?.displayName || merged?.name || state.myName,
        myPsm: merged?.about ?? state.myPsm,
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

    case 'OPEN_CHAT': {
      const z = state.zTop + 1;
      const existing = state.chats.find((c) => c.pubkey === action.pubkey);
      if (existing) {
        return { ...state, zTop: z, statusPickerOpen: false, chats: mapChat(state, action.pubkey, (c) => ({ ...c, z, flashing: false })) };
      }
      return { ...state, zTop: z, statusPickerOpen: false, chats: [...state.chats, newChat(action.pubkey, z, state.chats.length)] };
    }
    case 'CLOSE_CHAT':
      return { ...state, chats: state.chats.filter((c) => c.pubkey !== action.pubkey) };
    case 'FOCUS_CHAT': {
      const z = state.zTop + 1;
      return { ...state, zTop: z, chats: mapChat(state, action.pubkey, (c) => ({ ...c, z, flashing: false })) };
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
    case 'SET_FLASH':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, flashing: action.on })) };
    case 'SET_WINK':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => ({ ...c, winkOn: action.on, winkGlyph: action.glyph ?? c.winkGlyph })) };

    case 'MESSAGE_SENT':
      return applyMessage(state, { pubkey: action.pubkey, id: action.id, mine: true, time: action.time, payload: action.payload, inbound: false });
    case 'MESSAGE_RECEIVED':
      return applyMessage(state, { pubkey: action.partner, id: action.id, mine: action.mine, time: action.time, payload: action.payload, inbound: true });
    case 'APPEND_SYSTEM':
      return { ...state, chats: mapChat(state, action.pubkey, (c) => append(c, { kind: 'system', text: action.text })) };

    case 'TICK':
      return { ...state, now: action.now };
  }
};
