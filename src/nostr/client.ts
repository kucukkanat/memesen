// The one impure module: it owns the relay connections and all network I/O.
// It speaks Nostr and emits normalised, UI-agnostic events through callbacks;
// the React layer turns those into reducer actions. Nothing here imports React.

import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent } from 'nostr-tools/pure';
import type { Event, EventTemplate } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';
import type { SubCloser } from 'nostr-tools/abstract-pool';
import * as nip04 from 'nostr-tools/nip04';
import { v2 as nip44 } from 'nostr-tools/nip44';
import { createRumor, createSeal, createWrap, unwrapEvent } from 'nostr-tools/nip59';

import type { Profile, StatusKey } from '../state/types';
import { parseProfile, serialiseProfile } from './profiles';
import { sameRelay } from './relays';
import { decodeWire, encodeWire, type WirePayload } from './wire';
import { APP_DATA_READ, KIND_APP_DATA, KIND_CHAT, KIND_CONTACTS, KIND_DM_LEGACY, KIND_GIFT_WRAP, KIND_METADATA, KIND_STATUS, KIND_TYPING } from './kinds';

/** A decrypted DM, normalised across NIP-17 and NIP-04 sources. */
export interface IncomingMessage {
  readonly id: string;
  /** The other party's pubkey (sender if inbound, recipient if it's our echo). */
  readonly partner: string;
  readonly mine: boolean;
  readonly createdAt: number;
  readonly payload: WirePayload;
  /**
   * True only for events that arrived *after* the relay's stored backlog
   * (i.e. after EOSE). Lets the UI toast for genuinely new messages without
   * re-announcing the whole history on every reload/reconnect.
   */
  readonly live: boolean;
}

/**
 * Whether an incoming message should surface a notification toast: only
 * messages from the other party (not our own echo) that arrived live, i.e.
 * after the relay's stored backlog. This keeps reloads/reconnects quiet.
 */
export const shouldAnnounce = (message: IncomingMessage): boolean => !message.mine && message.live;

export interface ClientHandlers {
  readonly onProfile: (pubkey: string, profile: Profile) => void;
  readonly onFollows: (entries: ReadonlyArray<{ pubkey: string; petname: string }>) => void;
  readonly onPresence: (pubkey: string, status: StatusKey, at: number) => void;
  readonly onMessage: (message: IncomingMessage) => void;
  /** The other party is typing us a message (ephemeral; auto-expires upstream). */
  readonly onTyping: (pubkey: string) => void;
  readonly onRelayStatus: (url: string, status: 'connected' | 'error') => void;
  /** Read markers synced from another device (decrypted NIP-78 app data). */
  readonly onReadMarkers: (markers: Readonly<Record<string, number>>) => void;
  /** Fired once the read-marker backlog has been drained (relay reached EOSE). */
  readonly onReadSynced: () => void;
}

const PRESENCE_KEYS: ReadonlySet<string> = new Set(['online', 'busy', 'away', 'offline']);
const nowSec = (): number => Math.floor(Date.now() / 1000);
const tag = (event: { tags: string[][] }, name: string): string[] | undefined =>
  event.tags.find((t) => t[0] === name);

export class NostrClient {
  private readonly pool = new SimplePool();
  private readonly subs: SubCloser[] = [];
  private contactsSub: SubCloser | null = null;
  /** NIP-44 conversation key to ourselves, for encrypting our own app data. */
  private readonly selfKey: Uint8Array;

  constructor(
    private readonly secret: Uint8Array,
    readonly pubkey: string,
    private relays: string[],
    private readonly handlers: ClientHandlers,
  ) {
    this.selfKey = nip44.utils.getConversationKey(secret, pubkey);
    // The pool reports a normalised URL; map it back to the exact URL we were
    // configured with so the UI's per-relay status actually matches.
    this.pool.onRelayConnectionSuccess = (url) => this.handlers.onRelayStatus(this.configured(url), 'connected');
    this.pool.onRelayConnectionFailure = (url) => this.handlers.onRelayStatus(this.configured(url), 'error');
  }

  /** Open every live subscription for the active identity. */
  start(): void {
    // Our own metadata, follow list and presence (and any future edits to them).
    this.subs.push(
      this.pool.subscribe(this.relays, { kinds: [KIND_METADATA, KIND_CONTACTS, KIND_STATUS], authors: [this.pubkey] }, {
        onevent: (e) => this.onOwnEvent(e),
      }),
    );
    // Inbound + our own echoed DMs. Gift wraps are backdated up to 2 days, so we
    // deliberately use no `since` here and lean on the relay's own limit. Each
    // sub flips `live` on EOSE so the backlog replayed on (re)connect doesn't
    // re-toast; only events after EOSE are announced as new.
    const gift = { live: false };
    this.subs.push(
      this.pool.subscribe(this.relays, { kinds: [KIND_GIFT_WRAP], '#p': [this.pubkey] }, {
        onevent: (e) => this.onGiftWrap(e, gift.live),
        oneose: () => { gift.live = true; },
      }),
    );
    const inbound = { live: false };
    this.subs.push(
      this.pool.subscribe(this.relays, { kinds: [KIND_DM_LEGACY], '#p': [this.pubkey] }, {
        onevent: (e) => this.onLegacyDm(e, inbound.live),
        oneose: () => { inbound.live = true; },
      }),
    );
    const echo = { live: false };
    this.subs.push(
      this.pool.subscribe(this.relays, { kinds: [KIND_DM_LEGACY], authors: [this.pubkey] }, {
        onevent: (e) => this.onLegacyDm(e, echo.live),
        oneose: () => { echo.live = true; },
      }),
    );
    // Ephemeral "is typing" pings addressed to us. Relays don't store these, so
    // there's no backlog and no `live` gating — every delivery is real-time.
    this.subs.push(
      this.pool.subscribe(this.relays, { kinds: [KIND_TYPING], '#p': [this.pubkey] }, {
        onevent: (e) => { if (e.pubkey !== this.pubkey) this.handlers.onTyping(e.pubkey); },
      }),
    );
    // Our own encrypted read markers (NIP-78). EOSE signals the backlog is
    // drained, so the app knows it can safely publish without clobbering a
    // newer copy that lives on the relay.
    this.subs.push(
      this.pool.subscribe(this.relays, { kinds: [KIND_APP_DATA], authors: [this.pubkey], '#d': [APP_DATA_READ] }, {
        onevent: (e) => this.onReadMarkers(e),
        oneose: () => this.handlers.onReadSynced(),
      }),
    );
  }

  /** Swap the relay set live (used by the Connection manager). */
  setRelays(relays: string[]): void {
    this.relays = relays;
  }

  /** Resolve a pool-reported (normalised) URL back to our configured spelling. */
  private configured(reported: string): string {
    return this.relays.find((u) => sameRelay(u, reported)) ?? reported;
  }

  // --- inbound -------------------------------------------------------------

  private onOwnEvent(event: Event): void {
    if (event.kind === KIND_METADATA) this.handlers.onProfile(event.pubkey, parseProfile(event.content));
    else if (event.kind === KIND_CONTACTS) this.onContactList(event);
    else if (event.kind === KIND_STATUS) this.onStatus(event);
  }

  private onContactList(event: Event): void {
    const entries = event.tags
      .filter((t) => t[0] === 'p' && typeof t[1] === 'string')
      .map((t) => ({ pubkey: t[1] as string, petname: t[3] ?? '' }));
    this.handlers.onFollows(entries);
    this.subscribeContacts(entries.map((e) => e.pubkey));
  }

  private onStatus(event: Event): void {
    if ((tag(event, 'd')?.[1] ?? 'general') !== 'general') return;
    const declared = tag(event, 'status')?.[1];
    const status: StatusKey = declared && PRESENCE_KEYS.has(declared) ? (declared as StatusKey) : 'online';
    this.handlers.onPresence(event.pubkey, status, event.created_at);
    if (event.content.trim()) this.handlers.onProfile(event.pubkey, { about: event.content });
  }

  private onGiftWrap(event: Event, live: boolean): void {
    try {
      const rumor = unwrapEvent(event, this.secret);
      if (rumor.kind !== KIND_CHAT) return;
      const mine = rumor.pubkey === this.pubkey;
      const partner = mine ? tag(rumor, 'p')?.[1] : rumor.pubkey;
      if (!partner) return;
      this.handlers.onMessage({ id: rumor.id, partner, mine, createdAt: rumor.created_at, payload: decodeWire(rumor.content), live });
    } catch {
      // A wrap we can't open (not ours / malformed) is silently ignored.
    }
  }

  private onLegacyDm(event: Event, live: boolean): void {
    const mine = event.pubkey === this.pubkey;
    const partner = mine ? tag(event, 'p')?.[1] : event.pubkey;
    if (!partner) return;
    try {
      const text = nip04.decrypt(this.secret, partner, event.content);
      this.handlers.onMessage({ id: event.id, partner, mine, createdAt: event.created_at, payload: decodeWire(text), live });
    } catch {
      // Undecryptable legacy DM — ignore.
    }
  }

  private onReadMarkers(event: Event): void {
    try {
      const parsed: unknown = JSON.parse(nip44.decrypt(event.content, this.selfKey));
      if (typeof parsed !== 'object' || parsed === null) return;
      const markers: Record<string, number> = {};
      for (const [pubkey, at] of Object.entries(parsed)) {
        if (typeof at === 'number') markers[pubkey] = at;
      }
      this.handlers.onReadMarkers(markers);
    } catch {
      // Not ours / malformed / superseded encryption — ignore.
    }
  }

  private subscribeContacts(pubkeys: string[]): void {
    this.contactsSub?.close();
    if (pubkeys.length === 0) return;
    this.contactsSub = this.pool.subscribe(this.relays, { kinds: [KIND_METADATA, KIND_STATUS], authors: pubkeys }, {
      onevent: (e) => {
        if (e.kind === KIND_METADATA) this.handlers.onProfile(e.pubkey, parseProfile(e.content));
        else this.onStatus(e);
      },
    });
  }

  // --- outbound ------------------------------------------------------------

  private publish(template: EventTemplate): void {
    const signed = finalizeEvent(template, this.secret);
    void Promise.allSettled(this.pool.publish(this.relays, signed));
  }

  /**
   * Send a NIP-17 DM. We gift-wrap once for the recipient and once for
   * ourselves (so our sent history survives a reload), and return the rumor id
   * so the caller can optimistically render the message and dedupe its echo.
   */
  sendDm(toPubkey: string, payload: WirePayload): string {
    const rumor = createRumor(
      { kind: KIND_CHAT, content: encodeWire(payload), tags: [['p', toPubkey]], created_at: nowSec() },
      this.secret,
    );
    for (const recipient of [toPubkey, this.pubkey]) {
      const wrap = createWrap(createSeal(rumor, this.secret, recipient), recipient);
      void Promise.allSettled(this.pool.publish(this.relays, wrap));
    }
    return rumor.id;
  }

  /**
   * Broadcast an ephemeral "I'm typing to you" ping. Like our NIP-38 presence
   * it's a public signal (the relay sees sender + recipient), which is
   * consistent with this app already broadcasting status in the clear; the
   * gift-wrapped message channel itself stays private as before. The receiver
   * lights its typing indicator and auto-expires it, so no "stopped" ping is
   * needed — we simply stop re-sending.
   */
  sendTyping(toPubkey: string): void {
    this.publish({ kind: KIND_TYPING, content: '', tags: [['p', toPubkey]], created_at: nowSec() });
  }

  publishProfile(profile: Profile): void {
    this.publish({ kind: KIND_METADATA, content: serialiseProfile(profile), tags: [], created_at: nowSec() });
  }

  /** Publish NIP-38 presence. 'invisible' is broadcast as 'offline' to peers. */
  publishStatus(status: StatusKey, psm: string): void {
    const wire = status === 'invisible' ? 'offline' : status;
    this.publish({
      kind: KIND_STATUS,
      content: psm,
      tags: [['d', 'general'], ['status', wire]],
      created_at: nowSec(),
    });
  }

  /**
   * Publish our read markers as an encrypted-to-self NIP-78 app-data event.
   * Replaceable (kind + `d` tag), so the relay only keeps the newest — other
   * devices read it back and reconcile their own flashing taskbar buttons.
   */
  publishReadMarkers(markers: Readonly<Record<string, number>>): void {
    const content = nip44.encrypt(JSON.stringify(markers), this.selfKey);
    this.publish({ kind: KIND_APP_DATA, content, tags: [['d', APP_DATA_READ]], created_at: nowSec() });
  }

  publishContacts(entries: ReadonlyArray<{ pubkey: string; petname: string }>): void {
    const tags = entries.map((e) => (e.petname ? ['p', e.pubkey, '', e.petname] : ['p', e.pubkey]));
    this.publish({ kind: KIND_CONTACTS, content: '', tags, created_at: nowSec() });
    this.subscribeContacts(entries.map((e) => e.pubkey));
  }

  /** Best-effort one-shot fetch of a single profile (for unknown senders). */
  fetchProfile(pubkey: string): void {
    const filter: Filter = { kinds: [KIND_METADATA, KIND_STATUS], authors: [pubkey], limit: 2 };
    const sub = this.pool.subscribe(this.relays, filter, {
      onevent: (e) => {
        if (e.kind === KIND_METADATA) this.handlers.onProfile(e.pubkey, parseProfile(e.content));
        else this.onStatus(e);
      },
      oneose: () => sub.close(),
    });
  }

  close(): void {
    this.contactsSub?.close();
    for (const sub of this.subs) sub.close();
    this.pool.close(this.relays);
  }
}
