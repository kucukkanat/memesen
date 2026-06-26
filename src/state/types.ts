// Core domain types for the Messenger app. Everything the UI renders is
// derived from `AppState`; the reducer is the only thing that produces a new one.

export type StatusKey = 'online' | 'busy' | 'away' | 'invisible' | 'offline';

/** Statuses a user can deliberately set (you can't choose to be "offline"). */
export type SelectableStatus = Exclude<StatusKey, 'offline'>;

export interface StatusInfo {
  readonly label: string;
}

export interface Contact {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly status: StatusKey;
  readonly psm: string;
  readonly avatar: string;
}

export type Message =
  | { readonly kind: 'system'; readonly text: string }
  | {
      readonly kind: 'chat';
      readonly sender: string;
      readonly body: string;
      readonly time: string;
      readonly mine: boolean;
    };

export interface Chat {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly status: StatusKey;
  readonly avatar: string;
  readonly messages: readonly Message[];
  readonly draft: string;
  readonly emojiOpen: boolean;
  readonly winkOn: boolean;
  readonly winkGlyph: string;
  readonly shake: boolean;
  readonly typing: boolean;
  /** Taskbar button flashes orange while there's an unread message. */
  readonly flashing: boolean;
  readonly z: number;
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export type Screen = 'signin' | 'desktop';

export interface AppState {
  readonly screen: Screen;
  readonly email: string;
  readonly password: string;
  readonly signinStatus: SelectableStatus;
  readonly myStatus: StatusKey;
  readonly myName: string;
  readonly myPsm: string;
  readonly statusPickerOpen: boolean;
  readonly onlineGroupOpen: boolean;
  readonly offlineGroupOpen: boolean;
  readonly chats: readonly Chat[];
  readonly zTop: number;
  readonly now: number;
  readonly buddyTop: number;
  /** `null` => anchored to the right edge. */
  readonly buddyLeft: number | null;
  /** `null` => centered on screen; a number => dragged to an explicit position. */
  readonly signinTop: number | null;
  readonly signinLeft: number | null;
  readonly myAvatar: string;
}

export type Group = 'online' | 'offline';

export type Action =
  | { type: 'SET_EMAIL'; email: string }
  | { type: 'SET_PASSWORD'; password: string }
  | { type: 'SET_SIGNIN_STATUS'; status: SelectableStatus }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'TOGGLE_STATUS_PICKER' }
  | { type: 'SET_STATUS'; status: SelectableStatus }
  | { type: 'SET_PSM'; psm: string }
  | { type: 'TOGGLE_GROUP'; group: Group }
  | { type: 'OPEN_CHAT'; contact: Contact }
  | { type: 'CLOSE_CHAT'; id: string }
  | { type: 'FOCUS_CHAT'; id: string }
  | { type: 'MOVE_CHAT'; id: string; top: number; left: number }
  | { type: 'RESIZE_CHAT'; id: string; width: number; height: number }
  | { type: 'MOVE_BUDDY'; top: number; left: number }
  | { type: 'MOVE_SIGNIN'; top: number; left: number }
  | { type: 'SET_DRAFT'; id: string; draft: string }
  | { type: 'SEND_MESSAGE'; id: string; body: string; time: string }
  | { type: 'APPEND_MESSAGE'; id: string; message: Message }
  | { type: 'SET_TYPING'; id: string; typing: boolean }
  | { type: 'SET_SHAKE'; id: string; shake: boolean }
  | { type: 'SET_FLASH'; id: string; on: boolean }
  | { type: 'SET_WINK'; id: string; on: boolean; glyph?: string }
  | { type: 'TOGGLE_EMOJI'; id: string }
  | { type: 'TICK'; now: number };
