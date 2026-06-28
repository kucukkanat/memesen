// MSN had Nudges and Winks; Nostr DMs are just text. We smuggle those — and
// shared pictures — as the plaintext message body using a private control
// prefix, so a regular Nostr client shows a harmless string and a memesen peer
// renders the real effect. An image rides as its `data:` URL after the prefix.

export type WireKind = 'text' | 'nudge' | 'wink' | 'image';

export interface WirePayload {
  readonly kind: WireKind;
  /**
   * For 'text', the message; for 'wink', the chosen glyph; '' for 'nudge'; for
   * 'image', the `data:image/...;base64,…` URL of the (already downscaled) picture.
   */
  readonly body: string;
}

const CTRL = '';
const NUDGE = `${CTRL}nudge`;
const WINK = `${CTRL}wink:`;
const IMAGE = `${CTRL}img:`;

export const encodeWire = (payload: WirePayload): string => {
  switch (payload.kind) {
    case 'nudge':
      return NUDGE;
    case 'wink':
      return `${WINK}${payload.body}`;
    case 'image':
      return `${IMAGE}${payload.body}`;
    case 'text':
      return payload.body;
  }
};

export const decodeWire = (content: string): WirePayload => {
  if (content === NUDGE) return { kind: 'nudge', body: '' };
  if (content.startsWith(WINK)) return { kind: 'wink', body: content.slice(WINK.length) };
  // Only treat it as an image if what follows the prefix really is an image
  // data URL — otherwise a peer (or a crafted DM) could smuggle arbitrary
  // `data:`/markup into an <img src>. Anything else falls back to plain text.
  if (content.startsWith(IMAGE)) {
    const body = content.slice(IMAGE.length);
    if (isImageDataUrl(body)) return { kind: 'image', body };
  }
  return { kind: 'text', body: content };
};

/** A `data:image/<type>;base64,…` URL — the only shape we'll render in an <img>. */
export const isImageDataUrl = (s: string): boolean => /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+=*$/i.test(s);
