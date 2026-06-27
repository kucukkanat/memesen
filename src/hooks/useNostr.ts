// Bridges the impure NostrClient to the pure reducer. It owns the client's
// lifecycle (recreated whenever the active identity or the enabled relay set
// changes), funnels inbound relay events into actions, exposes typed commands
// for outbound actions, and persists identities/active-account/relays.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { Action, AppState, Profile, SelectableStatus } from '../state/types';
import { formatTime } from '../state/helpers';
import { secretFromNsec } from '../nostr/keys';
import { NostrClient, shouldAnnounce, type IncomingMessage } from '../nostr/client';
import { loadReadMarkers, saveActive, saveIdentities, saveReadMarkers, saveRelays } from '../nostr/identity';

/** UX side effects the App layer owns (sounds, toasts) — fired at the I/O edge. */
export interface NostrSink {
  readonly onIncoming: (partner: string, message: IncomingMessage) => void;
  readonly onContactOnline: (pubkey: string) => void;
}

export interface NostrCommands {
  readonly sendText: (pubkey: string, body: string) => void;
  readonly sendNudge: (pubkey: string) => void;
  readonly sendWink: (pubkey: string, glyph: string) => void;
  readonly setStatus: (status: SelectableStatus) => void;
  readonly setPsm: (psm: string) => void;
  readonly setName: (name: string) => void;
  readonly setAvatar: (picture: string) => void;
  readonly addContact: (pubkey: string, petname: string) => void;
  readonly removeContact: (pubkey: string) => void;
  readonly renameContact: (pubkey: string, petname: string) => void;
  /** One-shot fetch of a pubkey's profile/presence (e.g. for an invite preview). */
  readonly lookup: (pubkey: string) => void;
}

const ANNOUNCE_GRACE_MS = 2500; // suppress the initial presence backlog flood

export const useNostr = (state: AppState, dispatch: Dispatch<Action>, sink: NostrSink): NostrCommands => {
  const clientRef = useRef<NostrClient | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sinkRef = useRef(sink);
  sinkRef.current = sink;
  // Gate read-marker publishing until we've drained the relay's copy (EOSE), so
  // an early publish can't replace a newer remote marker set with a partial one.
  const [readSynced, setReadSynced] = useState(false);
  const lastPublishedRead = useRef('');

  // Persist the bits that must survive a reload.
  useEffect(() => saveIdentities(state.identities), [state.identities]);
  useEffect(() => saveActive(state.myPubkey), [state.myPubkey]);
  useEffect(
    () => saveRelays(state.relays.map((r) => ({ url: r.url, enabled: r.enabled }))),
    [state.relays],
  );

  // Read markers: persist locally every change, and seed from local storage when
  // the active account changes (the refresh path also seeds via bootState).
  useEffect(() => {
    if (state.myPubkey) saveReadMarkers(state.myPubkey, state.lastReadAt);
  }, [state.myPubkey, state.lastReadAt]);
  useEffect(() => {
    if (state.myPubkey) dispatch({ type: 'READ_MARKERS_LOADED', markers: loadReadMarkers(state.myPubkey) });
  }, [state.myPubkey, dispatch]);

  const activeNsec = useMemo(
    () => state.identities.find((i) => i.pubkey === state.myPubkey)?.nsec ?? null,
    [state.identities, state.myPubkey],
  );
  const relayKey = state.relays.filter((r) => r.enabled).map((r) => r.url).sort().join(',');

  // (Re)build the client when identity or the enabled relay set changes.
  useEffect(() => {
    if (!state.myPubkey || !activeNsec) return;
    const relays = relayKey ? relayKey.split(',') : [];
    const startedAt = Date.now();
    const online = new Set<string>();
    // A fresh client must re-drain the relay's read markers before publishing.
    setReadSynced(false);
    lastPublishedRead.current = '';

    const client = new NostrClient(secretFromNsec(activeNsec), state.myPubkey, relays, {
      onProfile: (pubkey, profile) => dispatch({ type: 'PROFILE_LOADED', pubkey, profile }),
      onFollows: (entries) => dispatch({ type: 'FOLLOWS_LOADED', entries }),
      onPresence: (pubkey, status, at) => {
        dispatch({ type: 'PRESENCE_LOADED', pubkey, status, at });
        const present = status !== 'offline';
        if (present && !online.has(pubkey)) {
          online.add(pubkey);
          if (Date.now() - startedAt > ANNOUNCE_GRACE_MS) sinkRef.current.onContactOnline(pubkey);
        } else if (!present) {
          online.delete(pubkey);
        }
      },
      onMessage: (message) => {
        dispatch({
          type: 'MESSAGE_RECEIVED',
          id: message.id,
          partner: message.partner,
          mine: message.mine,
          at: message.createdAt,
          time: formatTime(message.createdAt * 1000),
          payload: message.payload,
          live: message.live,
        });
        // Only toast for genuinely new messages — `live` is false for the
        // stored backlog the relay replays on every (re)connect.
        if (shouldAnnounce(message)) sinkRef.current.onIncoming(message.partner, message);
      },
      onRelayStatus: (url, status) => dispatch({ type: 'RELAY_STATUS', url, status }),
      onReadMarkers: (markers) => dispatch({ type: 'READ_MARKERS_LOADED', markers }),
      onReadSynced: () => setReadSynced(true),
    });

    clientRef.current = client;
    client.start();
    // Announce our presence so peers can see us straight away.
    client.publishStatus(stateRef.current.myStatus, stateRef.current.myPsm);

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [state.myPubkey, activeNsec, relayKey, dispatch]);

  // Sync read markers to relays (debounced) once the remote copy is reconciled.
  // We publish the whole map — `READ_MARKERS_LOADED` has merged any remote keys
  // by now, so a replaceable overwrite can't drop another device's progress.
  useEffect(() => {
    if (!readSynced) return;
    const markers = state.lastReadAt;
    const json = JSON.stringify(markers);
    if (json === lastPublishedRead.current || Object.keys(markers).length === 0) return;
    const timer = setTimeout(() => {
      lastPublishedRead.current = json;
      clientRef.current?.publishReadMarkers(markers);
    }, 1500);
    return () => clearTimeout(timer);
  }, [state.lastReadAt, readSynced]);

  const followEntries = useCallback(
    (extra?: { pubkey: string; petname: string }) => {
      const s = stateRef.current;
      const base = s.follows.map((p) => ({ pubkey: p, petname: s.petnames[p] ?? '' }));
      return extra && !s.follows.includes(extra.pubkey) ? [...base, extra] : base;
    },
    [],
  );

  const sendText = useCallback((pubkey: string, body: string) => {
    const client = clientRef.current;
    if (!client) return;
    const id = client.sendDm(pubkey, { kind: 'text', body });
    dispatch({ type: 'MESSAGE_SENT', pubkey, id, at: Math.floor(Date.now() / 1000), time: formatTime(Date.now()), payload: { kind: 'text', body } });
  }, [dispatch]);

  const sendNudge = useCallback((pubkey: string) => {
    const client = clientRef.current;
    if (!client) return;
    const id = client.sendDm(pubkey, { kind: 'nudge', body: '' });
    dispatch({ type: 'MESSAGE_SENT', pubkey, id, at: Math.floor(Date.now() / 1000), time: formatTime(Date.now()), payload: { kind: 'nudge', body: '' } });
  }, [dispatch]);

  const sendWink = useCallback((pubkey: string, glyph: string) => {
    const client = clientRef.current;
    if (!client) return;
    const id = client.sendDm(pubkey, { kind: 'wink', body: glyph });
    dispatch({ type: 'MESSAGE_SENT', pubkey, id, at: Math.floor(Date.now() / 1000), time: formatTime(Date.now()), payload: { kind: 'wink', body: glyph } });
  }, [dispatch]);

  const setStatus = useCallback((status: SelectableStatus) => {
    dispatch({ type: 'SET_STATUS', status });
    clientRef.current?.publishStatus(status, stateRef.current.myPsm);
  }, [dispatch]);

  const setPsm = useCallback((psm: string) => {
    dispatch({ type: 'SET_PSM', psm });
    clientRef.current?.publishStatus(stateRef.current.myStatus, psm);
  }, [dispatch]);

  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_MY_NAME', name });
    const s = stateRef.current;
    if (!s.myPubkey) return;
    const profile: Profile = { ...s.profiles[s.myPubkey], name };
    clientRef.current?.publishProfile(profile);
  }, [dispatch]);

  const setAvatar = useCallback((picture: string) => {
    dispatch({ type: 'SET_AVATAR', picture });
    const s = stateRef.current;
    if (!s.myPubkey) return;
    const profile: Profile = { ...s.profiles[s.myPubkey], picture };
    clientRef.current?.publishProfile(profile);
  }, [dispatch]);

  const addContact = useCallback((pubkey: string, petname: string) => {
    dispatch({ type: 'ADD_CONTACT', pubkey, petname });
    const client = clientRef.current;
    if (!client) return;
    client.publishContacts(followEntries({ pubkey, petname }));
    client.fetchProfile(pubkey);
  }, [dispatch, followEntries]);

  const removeContact = useCallback((pubkey: string) => {
    dispatch({ type: 'REMOVE_CONTACT', pubkey });
    clientRef.current?.publishContacts(followEntries().filter((e) => e.pubkey !== pubkey));
  }, [dispatch, followEntries]);

  const renameContact = useCallback((pubkey: string, petname: string) => {
    dispatch({ type: 'SET_PETNAME', pubkey, petname });
    // followEntries() still reflects pre-dispatch petnames, so override the
    // renamed entry inline rather than relying on the not-yet-applied state.
    clientRef.current?.publishContacts(
      followEntries().map((e) => (e.pubkey === pubkey ? { ...e, petname } : e)),
    );
  }, [dispatch, followEntries]);

  const lookup = useCallback((pubkey: string) => clientRef.current?.fetchProfile(pubkey), []);

  return { sendText, sendNudge, sendWink, setStatus, setPsm, setName, setAvatar, addContact, removeContact, renameContact, lookup };
};
