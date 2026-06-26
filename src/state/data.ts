// Static seed data + brand glyphs. Period-accurate buddy list circa 2004.

import type { Contact, StatusInfo, StatusKey } from './types';

// Avatar values are keys into the real display-picture set in `assets/avatars`.
export const DEFAULT_AVATAR = 'msn';
export const MY_AVATAR = 'beach';

// Presence labels. The coloured indicator itself is drawn by <StatusIcon/>.
export const STATUS: Readonly<Record<StatusKey, StatusInfo>> = {
  online: { label: 'Online' },
  busy: { label: 'Busy' },
  away: { label: 'Away' },
  invisible: { label: 'Appear Offline' },
  offline: { label: 'Offline' },
};

export const statusOf = (key: StatusKey): StatusInfo => STATUS[key];

export const CONTACTS: readonly Contact[] = [
  { id: 'sarah', name: '✗ Sarah ✗', email: 'sazzlexo@hotmail.com', status: 'online', psm: '~*~ skool sux ~*~ (A)', avatar: 'flower' },
  { id: 'mike', name: 'Mike (at work, msg me)', email: 'mike_t@hotmail.com', status: 'busy', psm: 'crunch time :@', avatar: 'moto' },
  { id: 'jess', name: 'jess :) brb dinner', email: 'jessrox123@hotmail.com', status: 'away', psm: 'brb!! (L)', avatar: 'duck' },
  { id: 'dan', name: '~DJ Dan~ (8)', email: 'danthedj@hotmail.com', status: 'online', psm: 'new mixtape out now (8)', avatar: 'rocket' },
  { id: 'mum', name: 'Mum', email: 'family_pc@hotmail.com', status: 'online', psm: '', avatar: 'chess' },
  { id: 'tom', name: 'Tom_92', email: 'tom92@hotmail.com', status: 'offline', psm: '', avatar: 'soccer' },
  { id: 'becca', name: 'becca xoxo', email: 'beccaboo@hotmail.com', status: 'offline', psm: '', avatar: 'horses' },
];

// Auto-replies sprinkle in emoticon shortcut codes (`:)`, `(L)`...) which the
// chat transcript renders as inline SVG emoticons, just like the real client.
export const AUTO_REPLIES: readonly string[] = [
  'lol omg :D', 'no wayyy :O', 'hahaha :P', 'brb', 'wat u up 2? :)', 'omg same!! :D',
  'soooo bored rn :(', 'did u do the homework?? :S', 'ttyl (L)', 'rofl :D', 'k :|',
  'g2g in a sec', 'check ur email i sent u smth', 'r u going 2 the party fri? (Y)',
  ':P:P:P', 'awwww (L)', 'nudge me back! ;)', 'thats so cool (H)', 'miss u (U)',
];

export const WINK_GLYPHS: readonly string[] = ['😉', '😍', '🎉', '💋', '🤪', '😂'];
