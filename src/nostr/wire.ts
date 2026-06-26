// MSN had Nudges and Winks; Nostr DMs are just text. We smuggle those as the
// plaintext message body using a private control prefix, so a regular Nostr
// client shows a harmless string and a memesen peer renders the real effect.

export type WireKind = 'text' | 'nudge' | 'wink';

export interface WirePayload {
  readonly kind: WireKind;
  /** For 'text', the message; for 'wink', the chosen glyph; '' for 'nudge'. */
  readonly body: string;
}

const CTRL = '\u0001';
const NUDGE = `${CTRL}nudge`;
const WINK = `${CTRL}wink:`;

export const encodeWire = (payload: WirePayload): string => {
  switch (payload.kind) {
    case 'nudge':
      return NUDGE;
    case 'wink':
      return `${WINK}${payload.body}`;
    case 'text':
      return payload.body;
  }
};

export const decodeWire = (content: string): WirePayload => {
  if (content === NUDGE) return { kind: 'nudge', body: '' };
  if (content.startsWith(WINK)) return { kind: 'wink', body: content.slice(WINK.length) };
  return { kind: 'text', body: content };
};
