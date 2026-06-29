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

import type { Profile, RelayStatus, StatusKey } from '../state/types';
import { PRESENCE_TTL_MS } from '../state/data';
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

// Sender/receiver clock skew tolerated before a message is judged "backlog". Far
// smaller than any "away a long while" gap, so it never reopens the flood window,
// but generous enough to cover ordinary clock drift between peers.
export const LIVE_SKEW_MS = 60_000;

/**
 * Whether a DM is genuinely *new* (toast-worthy), hardened against a relay that's
 * slow to stream a large backlog. EOSE alone isn't enough: nostr-tools fires a
 * subscription's `oneose` once every relay has EOSE'd *or hit its ~4.4s
 * eoseTimeout*, so a relay still replaying a big stored history when that timer
 * trips flips `live` true mid-backlog — and every remaining old message would
 * then toast. We additionally require the message's real send time to be at/after
 * the moment we (re)subscribed: backlog is older, so it stays silent even when
 * `eoseLive` races true. `skewMs` absorbs modest peer clock differences.
 */
export const isLiveMessage = (
  eoseLive: boolean,
  createdAtSec: number,
  connectedAtSec: number,
  skewMs: number = LIVE_SKEW_MS,
): boolean => eoseLive && createdAtSec * 1000 >= connectedAtSec * 1000 - skewMs;

/**
 * Whether a single relay accepted a publish. `pool.publish` resolves each relay
 * to its `OK` reason string on success, but *also* resolves (not rejects) with a
 * `"connection failure: …"` marker when it couldn't even connect; an explicit
 * reject is an `OK:false`/timeout. So "accepted" = fulfilled with anything that
 * isn't the connection-failure marker. A send counts as delivered if *any* relay
 * accepts it.
 */
export const isPublishAccepted = (result: PromiseSettledResult<string>): boolean =>
  result.status === 'fulfilled' && !result.value.startsWith('connection failure');

/**
 * Whether a contact reads as present *right now*: a non-offline status whose
 * timestamp hasn't aged past the presence TTL. This is the same decay the buddy
 * list applies, so a stale stored 'online' (a peer who closed their tab without
 * broadcasting offline) reads as offline here too. `now` and `at*1000` are ms.
 */
export const isPresenceFresh = (status: StatusKey, at: number, now: number): boolean =>
  status !== 'offline' && now - at * 1000 <= PRESENCE_TTL_MS;

/**
 * Whether a presence update is a genuine "just came online" worth a toast:
 * fresh and present, seen *live* (after the relay's stored backlog drained at
 * EOSE — not replayed history), for a contact we didn't already think was
 * online, and never ourselves.
 */
export const shouldAnnounceOnline = (p: {
  readonly status: StatusKey;
  readonly at: number;
  readonly now: number;
  readonly live: boolean;
  readonly wasOnline: boolean;
  readonly isSelf: boolean;
}): boolean => p.live && !p.wasOnline && !p.isSelf && isPresenceFresh(p.status, p.at, p.now);

/**
 * Whether the app becoming visible again warrants a forced reconnect: only if
 * it was actually hidden (`hiddenSince > 0`) for at least the grace window. The
 * grace ignores momentary app-switcher peeks so a quick glance away doesn't
 * needlessly tear down and rebuild every socket. `hiddenSince`/`now` are ms.
 */
export const shouldReconnectOnResume = (hiddenSince: number, now: number, graceMs: number): boolean =>
  hiddenSince > 0 && now - hiddenSince >= graceMs;

export interface ClientHandlers {
  readonly onProfile: (pubkey: string, profile: Profile) => void;
  readonly onFollows: (entries: ReadonlyArray<{ pubkey: string; petname: string }>) => void;
  /**
   * A contact's presence. `live` is false while the relay replays its stored
   * presence backlog on (re)connect and true for events seen after EOSE, so a
   * stale stored status can't masquerade as a fresh sign-in.
   */
  readonly onPresence: (pubkey: string, status: StatusKey, at: number, live: boolean) => void;
  readonly onMessage: (message: IncomingMessage) => void;
  /**
   * The final outcome of one of our outgoing DMs, after retries: `delivered` is
   * true once at least one relay accepted the recipient's copy, false if every
   * relay rejected it across all attempts (we're offline / all relays down). The
   * UI turns this into a per-message ✓/⚠ marker and a connection warning.
   */
  readonly onDelivery: (partner: string, rumorId: string, delivered: boolean) => void;
  /** The other party is typing us a message (ephemeral; auto-expires upstream). */
  readonly onTyping: (pubkey: string) => void;
  readonly onRelayStatus: (url: string, status: RelayStatus) => void;
  /** Read markers synced from another device (decrypted NIP-78 app data). */
  readonly onReadMarkers: (markers: Readonly<Record<string, number>>) => void;
  /** Fired once the read-marker backlog has been drained (relay reached EOSE). */
  readonly onReadSynced: () => void;
}

const PRESENCE_KEYS: ReadonlySet<string> = new Set(['online', 'busy', 'away', 'offline']);
const nowSec = (): number => Math.floor(Date.now() / 1000);
const tag = (event: { tags: string[][] }, name: string): string[] | undefined =>
  event.tags.find((t) => t[0] === name);
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Backoff between send attempts. A DM that no relay accepts is retried on this
// schedule (≈20s total) so a brief socket drop or relay hiccup recovers on its
// own; only after the last attempt is the message reported as undelivered.
const SEND_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000];
// How often we reconcile the live socket state into per-relay UI status. The
// pool's connection callbacks only fire on the *first* connect, so without this
// the dots would never reflect a silent drop-and-reconnect cycle.
const HEALTH_INTERVAL_MS = 4000;

export class NostrClient {
  // Keepalive + auto-reconnect are the backbone of reliability: ping/pong
  // detects half-open sockets (laptop sleep, mobile background, flaky NAT) and
  // reconnect re-establishes dropped connections with backoff, re-running every
  // open subscription (with `since` advanced past the last event seen) so no
  // stored message is missed. Without these, a single dropped socket silently
  // stops delivery until a full reload — the bug this work fixes.
  private readonly pool = new SimplePool({ enablePing: true, enableReconnect: true });
  private readonly subs: SubCloser[] = [];
  private contactsSub: SubCloser | null = null;
  /** NIP-44 conversation key to ourselves, for encrypting our own app data. */
  private readonly selfKey: Uint8Array;
  /** Last per-relay status we reported, so the heartbeat only emits on change. */
  private readonly health = new Map<string, RelayStatus>();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  /** Set on close so an in-flight send retry loop stops touching a dead pool. */
  private closed = false;
  /**
   * When the live subscriptions were last (re)opened, in seconds. Everything sent
   * before this is backlog; combined with EOSE it makes "new message" immune to a
   * slow relay tripping the eoseTimeout mid-replay (see {@link isLiveMessage}).
   */
  private connectedAtSec = 0;

  constructor(
    private readonly secret: Uint8Array,
    readonly pubkey: string,
    private relays: string[],
    private readonly handlers: ClientHandlers,
  ) {
    this.selfKey = nip44.utils.getConversationKey(secret, pubkey);
    // The pool reports a normalised URL; map it back to the exact URL we were
    // configured with so the UI's per-relay status actually matches.
    this.pool.onRelayConnectionSuccess = (url) => this.report(this.configured(url), 'connected');
    this.pool.onRelayConnectionFailure = (url) => this.report(this.configured(url), 'error');
  }

  /** Start the client: open every live subscription and begin health polling. */
  start(): void {
    this.openSubscriptions();
    this.healthTimer = setInterval(() => this.pollHealth(), HEALTH_INTERVAL_MS);
  }

  /**
   * Force a clean reconnect of every relay and re-open all subscriptions.
   *
   * iOS (and other mobile browsers) suspend a backgrounded tab/PWA and silently
   * tear down its WebSockets. On resume the sockets are dead — or zombie
   * half-open, where `readyState` still reads OPEN so nothing notices — and the
   * pool's own auto-reconnect can't be relied on: its backoff timers are frozen
   * while suspended, and a relay whose first wake-up attempt fails is dropped
   * from the pool permanently (`skipReconnection`). So when the app returns to
   * the foreground we don't wait on any of that — we tear every socket and
   * subscription down and rebuild from scratch, which deterministically resumes
   * delivery. Re-draining the relay backlog stays quiet: the per-sub EOSE/`live`
   * gating means replayed history can't re-toast.
   */
  reconnect(): void {
    if (this.closed) return;
    this.contactsSub?.close();
    this.contactsSub = null;
    for (const sub of this.subs) sub.close();
    this.subs.length = 0;
    // Drop the underlying sockets (zombies included) so the next subscribe
    // rebuilds them via ensureRelay rather than reusing a dead connection.
    this.pool.close(this.relays);
    this.openSubscriptions();
  }

  private openSubscriptions(): void {
    // Mark the backlog/live boundary: messages stamped before now are history the
    // relay is about to replay, regardless of when its EOSE actually lands.
    this.connectedAtSec = nowSec();
    // Our own metadata, follow list and presence (and any future edits to them).
    const own = { live: false };
    this.subs.push(
      this.pool.subscribe(this.relays, { kinds: [KIND_METADATA, KIND_CONTACTS, KIND_STATUS], authors: [this.pubkey] }, {
        onevent: (e) => this.onOwnEvent(e, own.live),
        oneose: () => { own.live = true; },
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

  /** Emit a per-relay status, deduping so unchanged states don't churn the UI. */
  private report(url: string, status: RelayStatus): void {
    if (this.health.get(url) === status) return;
    this.health.set(url, status);
    this.handlers.onRelayStatus(url, status);
  }

  /**
   * Reconcile each configured relay's live socket state into UI status. A relay
   * present in the pool and connected is 'connected'; present but down is
   * 'connecting' (it's mid-reconnect); absent means an initial connect failed
   * and it was dropped — 'error'. This keeps the dots honest across the silent
   * drop/reconnect cycles the pool handles internally.
   */
  private pollHealth(): void {
    const live = this.pool.listConnectionStatus();
    for (const url of this.relays) {
      let status: RelayStatus = 'error';
      for (const [reported, connected] of live) {
        if (sameRelay(reported, url)) { status = connected ? 'connected' : 'connecting'; break; }
      }
      this.report(url, status);
    }
  }

  // --- inbound -------------------------------------------------------------

  private onOwnEvent(event: Event, live: boolean): void {
    if (event.kind === KIND_METADATA) this.handlers.onProfile(event.pubkey, parseProfile(event.content));
    else if (event.kind === KIND_CONTACTS) this.onContactList(event);
    else if (event.kind === KIND_STATUS) this.onStatus(event, live);
  }

  private onContactList(event: Event): void {
    const entries = event.tags
      .filter((t) => t[0] === 'p' && typeof t[1] === 'string')
      .map((t) => ({ pubkey: t[1] as string, petname: t[3] ?? '' }));
    this.handlers.onFollows(entries);
    this.subscribeContacts(entries.map((e) => e.pubkey));
  }

  private onStatus(event: Event, live: boolean): void {
    if ((tag(event, 'd')?.[1] ?? 'general') !== 'general') return;
    const declared = tag(event, 'status')?.[1];
    const status: StatusKey = declared && PRESENCE_KEYS.has(declared) ? (declared as StatusKey) : 'online';
    this.handlers.onPresence(event.pubkey, status, event.created_at, live);
    if (event.content.trim()) this.handlers.onProfile(event.pubkey, { about: event.content });
  }

  private onGiftWrap(event: Event, live: boolean): void {
    try {
      const rumor = unwrapEvent(event, this.secret);
      if (rumor.kind !== KIND_CHAT) return;
      const mine = rumor.pubkey === this.pubkey;
      const partner = mine ? tag(rumor, 'p')?.[1] : rumor.pubkey;
      if (!partner) return;
      this.handlers.onMessage({ id: rumor.id, partner, mine, createdAt: rumor.created_at, payload: decodeWire(rumor.content), live: isLiveMessage(live, rumor.created_at, this.connectedAtSec) });
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
      this.handlers.onMessage({ id: event.id, partner, mine, createdAt: event.created_at, payload: decodeWire(text), live: isLiveMessage(live, event.created_at, this.connectedAtSec) });
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
    // Presence is replaceable, so the relay replays each contact's last status on
    // (re)subscribe. Gate on EOSE — exactly like the DM subs — so the stored
    // backlog is absorbed silently and only post-EOSE changes are "live".
    const presence = { live: false };
    this.contactsSub = this.pool.subscribe(this.relays, { kinds: [KIND_METADATA, KIND_STATUS], authors: pubkeys }, {
      onevent: (e) => {
        if (e.kind === KIND_METADATA) this.handlers.onProfile(e.pubkey, parseProfile(e.content));
        else this.onStatus(e, presence.live);
      },
      oneose: () => { presence.live = true; },
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
   *
   * Delivery is no longer fire-and-forget: each wrap is published with retry
   * (see {@link deliver}) and the recipient copy's final outcome is reported via
   * `onDelivery`, so a message that genuinely couldn't be sent surfaces to the
   * user instead of vanishing.
   */
  sendDm(toPubkey: string, payload: WirePayload): string {
    const rumor = createRumor(
      { kind: KIND_CHAT, content: encodeWire(payload), tags: [['p', toPubkey]], created_at: nowSec() },
      this.secret,
    );
    // The recipient copy is what "delivered" means; report on it. The self copy
    // is only our own history backup, so it's best-effort (retried, not reported).
    const recipientWrap = createWrap(createSeal(rumor, this.secret, toPubkey), toPubkey);
    const selfWrap = createWrap(createSeal(rumor, this.secret, this.pubkey), this.pubkey);
    // Suppress the report if we were torn down mid-flight (relay swap / sign-out)
    // so closing the client can't flash a phantom "not delivered" warning.
    void this.deliver(recipientWrap).then((ok) => { if (!this.closed) this.handlers.onDelivery(toPubkey, rumor.id, ok); });
    void this.deliver(selfWrap);
    return rumor.id;
  }

  /**
   * Publish one already-signed event, retrying across the whole relay set on the
   * backoff schedule until at least one relay accepts it. Re-publishing the same
   * event is idempotent (relays dedupe by id), so retrying after a partial
   * success is harmless. Resolves true if any attempt landed, false if every
   * relay rejected it across all attempts.
   */
  private async deliver(event: Event): Promise<boolean> {
    for (let attempt = 0; !this.closed; attempt++) {
      const results = await Promise.allSettled(this.pool.publish(this.relays, event));
      if (results.some(isPublishAccepted)) return true;
      if (attempt >= SEND_RETRY_DELAYS_MS.length) return false;
      await sleep(SEND_RETRY_DELAYS_MS[attempt] ?? 0);
    }
    return false;
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
        else this.onStatus(e, false);
      },
      oneose: () => sub.close(),
    });
  }

  close(): void {
    this.closed = true;
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.healthTimer = null;
    this.contactsSub?.close();
    for (const sub of this.subs) sub.close();
    this.pool.close(this.relays);
  }
}
