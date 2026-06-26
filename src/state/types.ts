// Core domain types. The UI renders entirely from `AppState`; the reducer is
// the only producer of a new one. Identities, relays and the social graph come
// from Nostr — contacts/profiles/presence are normalised maps keyed by pubkey.

export type StatusKey = 'online' | 'busy' | 'away' | 'invisible' | 'offline';

/** Statuses a user can deliberately set (you can't choose to be "offline"). */
export type SelectableStatus = Exclude<StatusKey, 'offline'>;

export interface StatusInfo {
  readonly label: string;
}

/** A locally-stored Nostr account. The nsec is plaintext (see README). */
export interface Identity {
  readonly pubkey: string; // hex
  readonly nsec: string; // bech32 secret
  readonly name: string; // last-known display name, for the account picker
}

/** Relay as persisted (no runtime connection state). */
export interface StoredRelay {
  readonly url: string;
  readonly enabled: boolean;
}

export type RelayStatus = 'connecting' | 'connected' | 'error';

export interface RelayInfo extends StoredRelay {
  readonly status: RelayStatus;
}

/** NIP-01 kind-0 profile, mapped onto MSN's identity fields. */
export interface Profile {
  readonly name?: string;
  readonly displayName?: string;
  readonly about?: string; // -> personal message
  readonly picture?: string;
  readonly nip05?: string; // -> the "e-mail"-shaped handle
}

/** Latest presence we've seen for a pubkey. `at` is a Nostr created_at (secs). */
export interface Presence {
  readonly status: StatusKey;
  readonly at: number;
}

export type Message =
  | { readonly kind: 'system'; readonly text: string }
  | {
      readonly kind: 'chat';
      readonly id: string; // rumor/event id, used to dedupe relay echoes
      readonly mine: boolean;
      readonly body: string;
      readonly time: string; // pre-formatted clock, e.g. "(9:07 PM)"
    };

/** A DM payload as it crosses the reducer boundary (already decrypted). */
export type WireKind = 'text' | 'nudge' | 'wink';
export interface IncomingPayload {
  readonly kind: WireKind;
  readonly body: string;
}

export interface Chat {
  readonly pubkey: string;
  readonly messages: readonly Message[];
  /** Event ids already folded in, so duplicate relay deliveries are ignored. */
  readonly seen: readonly string[];
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

  // identity
  readonly identities: readonly Identity[];
  readonly myPubkey: string | null;
  readonly myName: string;
  readonly myPsm: string;
  readonly myAvatar: string;
  readonly myStatus: StatusKey;
  readonly signinStatus: SelectableStatus;

  // network
  readonly relays: readonly RelayInfo[];

  // social graph (normalised, keyed by pubkey)
  readonly follows: readonly string[];
  readonly petnames: Readonly<Record<string, string>>;
  readonly profiles: Readonly<Record<string, Profile>>;
  readonly presence: Readonly<Record<string, Presence>>;

  // ui
  readonly statusPickerOpen: boolean;
  readonly onlineGroupOpen: boolean;
  readonly offlineGroupOpen: boolean;
  readonly relayManagerOpen: boolean;
  readonly addContactOpen: boolean;
  readonly chats: readonly Chat[];
  readonly zTop: number;
  readonly now: number;
  readonly buddyTop: number;
  /** `null` => anchored to the right edge. */
  readonly buddyLeft: number | null;
  /** `null` => centered on screen; a number => dragged to an explicit position. */
  readonly signinTop: number | null;
  readonly signinLeft: number | null;
}

export type Group = 'online' | 'offline';

export type Action =
  // boot + identity
  | { type: 'HYDRATE'; identities: readonly Identity[]; relays: readonly StoredRelay[] }
  | { type: 'ADD_IDENTITY'; identity: Identity }
  | { type: 'REMOVE_IDENTITY'; pubkey: string }
  | { type: 'SET_SIGNIN_STATUS'; status: SelectableStatus }
  | { type: 'SIGN_IN'; pubkey: string; name: string; avatar: string }
  | { type: 'SIGN_OUT' }
  // self
  | { type: 'TOGGLE_STATUS_PICKER' }
  | { type: 'SET_STATUS'; status: SelectableStatus }
  | { type: 'SET_PSM'; psm: string }
  | { type: 'SET_MY_NAME'; name: string }
  // network data
  | { type: 'PROFILE_LOADED'; pubkey: string; profile: Profile }
  | { type: 'FOLLOWS_LOADED'; entries: ReadonlyArray<{ pubkey: string; petname: string }> }
  | { type: 'PRESENCE_LOADED'; pubkey: string; status: StatusKey; at: number }
  // contacts
  | { type: 'ADD_CONTACT'; pubkey: string; petname: string }
  | { type: 'REMOVE_CONTACT'; pubkey: string }
  // relays
  | { type: 'ADD_RELAY'; url: string }
  | { type: 'REMOVE_RELAY'; url: string }
  | { type: 'TOGGLE_RELAY'; url: string }
  | { type: 'RELAY_STATUS'; url: string; status: RelayStatus }
  // windows / dialogs
  | { type: 'TOGGLE_GROUP'; group: Group }
  | { type: 'TOGGLE_RELAY_MANAGER' }
  | { type: 'TOGGLE_ADD_CONTACT' }
  | { type: 'OPEN_CHAT'; pubkey: string }
  | { type: 'CLOSE_CHAT'; pubkey: string }
  | { type: 'FOCUS_CHAT'; pubkey: string }
  | { type: 'MOVE_CHAT'; pubkey: string; top: number; left: number }
  | { type: 'RESIZE_CHAT'; pubkey: string; width: number; height: number }
  | { type: 'MOVE_BUDDY'; top: number; left: number }
  | { type: 'MOVE_SIGNIN'; top: number; left: number }
  | { type: 'SET_DRAFT'; pubkey: string; draft: string }
  | { type: 'TOGGLE_EMOJI'; pubkey: string }
  | { type: 'SET_SHAKE'; pubkey: string; shake: boolean }
  | { type: 'SET_FLASH'; pubkey: string; on: boolean }
  | { type: 'SET_WINK'; pubkey: string; on: boolean; glyph?: string }
  // messaging
  | { type: 'MESSAGE_SENT'; pubkey: string; id: string; time: string; payload: IncomingPayload }
  | { type: 'MESSAGE_RECEIVED'; id: string; partner: string; mine: boolean; time: string; payload: IncomingPayload }
  | { type: 'APPEND_SYSTEM'; pubkey: string; text: string }
  | { type: 'TICK'; now: number };
