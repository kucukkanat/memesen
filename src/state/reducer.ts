// The single source of truth. `reducer` is pure: same (state, action) => same
// state. Anything non-deterministic (clock, RNG, timers) is resolved by the
// caller and handed in via the action payload.

import type { Action, AppState, Chat, Contact, Message } from './types';
import { MY_AVATAR } from './data';

const SAFETY_NOTICE =
  'Never give out your password or credit card number in an instant message conversation.';
const OFFLINE_NOTICE =
  'This person is offline. Messages will be delivered when they sign in.';

export const initialState = (now: number): AppState => ({
  screen: 'signin',
  email: '',
  password: '',
  signinStatus: 'online',
  myStatus: 'online',
  myName: 'Me',
  myPsm: 'Listening to Linkin Park - Numb (8)',
  statusPickerOpen: false,
  onlineGroupOpen: true,
  offlineGroupOpen: true,
  chats: [],
  zTop: 30,
  now,
  buddyTop: 18,
  buddyLeft: null,
  signinTop: null,
  signinLeft: null,
  myAvatar: MY_AVATAR,
});

const mapChat = (state: AppState, id: string, fn: (chat: Chat) => Chat): readonly Chat[] =>
  state.chats.map((c) => (c.id === id ? fn(c) : c));

const newChat = (contact: Contact, z: number, index: number): Chat => ({
  id: contact.id,
  name: contact.name,
  email: contact.email,
  status: contact.status,
  avatar: contact.avatar,
  messages: [{ kind: 'system', text: contact.status === 'offline' ? OFFLINE_NOTICE : SAFETY_NOTICE }],
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

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_EMAIL':
      return { ...state, email: action.email };
    case 'SET_PASSWORD':
      return { ...state, password: action.password };
    case 'SET_SIGNIN_STATUS':
      return { ...state, signinStatus: action.status };

    case 'SIGN_IN': {
      const name = state.email.split('@')[0]?.trim() || 'Me';
      return { ...state, screen: 'desktop', myStatus: state.signinStatus, myName: name };
    }
    case 'SIGN_OUT':
      return { ...state, screen: 'signin', chats: [], statusPickerOpen: false, signinTop: null, signinLeft: null };

    case 'TOGGLE_STATUS_PICKER':
      return { ...state, statusPickerOpen: !state.statusPickerOpen };
    case 'SET_STATUS':
      return { ...state, myStatus: action.status, statusPickerOpen: false };
    case 'SET_PSM':
      return { ...state, myPsm: action.psm };

    case 'TOGGLE_GROUP':
      return action.group === 'online'
        ? { ...state, onlineGroupOpen: !state.onlineGroupOpen }
        : { ...state, offlineGroupOpen: !state.offlineGroupOpen };

    case 'OPEN_CHAT': {
      const z = state.zTop + 1;
      const existing = state.chats.find((c) => c.id === action.contact.id);
      if (existing) {
        return {
          ...state,
          zTop: z,
          statusPickerOpen: false,
          chats: mapChat(state, existing.id, (c) => ({ ...c, z })),
        };
      }
      return {
        ...state,
        zTop: z,
        statusPickerOpen: false,
        chats: [...state.chats, newChat(action.contact, z, state.chats.length)],
      };
    }
    case 'CLOSE_CHAT':
      return { ...state, chats: state.chats.filter((c) => c.id !== action.id) };
    case 'FOCUS_CHAT': {
      const z = state.zTop + 1;
      // Focusing a window reads its messages, so it stops flashing.
      return { ...state, zTop: z, chats: mapChat(state, action.id, (c) => ({ ...c, z, flashing: false })) };
    }
    case 'MOVE_CHAT':
      return { ...state, chats: mapChat(state, action.id, (c) => ({ ...c, top: action.top, left: action.left })) };
    case 'RESIZE_CHAT':
      return { ...state, chats: mapChat(state, action.id, (c) => ({ ...c, width: action.width, height: action.height })) };
    case 'MOVE_BUDDY':
      return { ...state, buddyTop: action.top, buddyLeft: action.left };
    case 'MOVE_SIGNIN':
      return { ...state, signinTop: action.top, signinLeft: action.left };

    case 'SET_DRAFT':
      return { ...state, chats: mapChat(state, action.id, (c) => ({ ...c, draft: action.draft })) };
    case 'SEND_MESSAGE':
      return {
        ...state,
        chats: mapChat(state, action.id, (c) =>
          append({ ...c, draft: '' }, { kind: 'chat', sender: state.myName, body: action.body, time: action.time, mine: true }),
        ),
      };
    case 'APPEND_MESSAGE':
      return { ...state, chats: mapChat(state, action.id, (c) => append(c, action.message)) };
    case 'SET_TYPING':
      return { ...state, chats: mapChat(state, action.id, (c) => ({ ...c, typing: action.typing })) };
    case 'SET_SHAKE':
      return { ...state, chats: mapChat(state, action.id, (c) => ({ ...c, shake: action.shake })) };
    case 'SET_FLASH':
      return { ...state, chats: mapChat(state, action.id, (c) => ({ ...c, flashing: action.on })) };
    case 'SET_WINK':
      return {
        ...state,
        chats: mapChat(state, action.id, (c) => ({ ...c, winkOn: action.on, winkGlyph: action.glyph ?? c.winkGlyph })),
      };
    case 'TOGGLE_EMOJI':
      return { ...state, chats: mapChat(state, action.id, (c) => ({ ...c, emojiOpen: !c.emojiOpen })) };

    case 'TICK':
      return { ...state, now: action.now };
  }
};
