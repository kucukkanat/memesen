import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { AppState, Identity, SelectableStatus } from './state/types';
import { WINK_GLYPHS } from './state/data';
import { pick } from './state/helpers';
import { initialState, reducer } from './state/reducer';
import { resolveContact } from './state/view';
import { playSound, resumeAudio, setMuted } from './audio/sounds';
import { useDrag } from './hooks/useDrag';
import { useResize } from './hooks/useResize';
import { useNostr, type NostrSink } from './hooks/useNostr';
import { loadActive, loadIdentities, loadRelays } from './nostr/identity';
import { normaliseRelay } from './nostr/relays';
import { avatarFor, createKeyPair, npubOf, pubkeyFromInput, pubkeyFromNsec, shortNpub } from './nostr/keys';
import { isNip05, queryProfile } from 'nostr-tools/nip05';
import { Taskbar } from './components/Taskbar';
import { SignIn } from './components/SignIn';
import { BuddyList } from './components/BuddyList';
import { ChatWindow } from './components/ChatWindow';
import { RelayManager } from './components/RelayManager';
import { AddContact } from './components/AddContact';
import { ChangePicture } from './components/ChangePicture';
import { ShareContact } from './components/ShareContact';
import { InviteDialog } from './components/InviteDialog';
import { ToastStack } from './components/Toasts';
import type { Toast } from './components/Toasts';

const CLOCK_INTERVAL_MS = 20_000;
const AUTO_AWAY_MS = 5 * 60_000; // MSN flipped you to Away after ~5 min idle.
const NUDGE_COOLDOWN_MS = 6_000; // "You may not send a Nudge that often."
const TOAST_TTL_MS = 6_000;
const SHAKE_MS = 900;
const WINK_MS = 1400;

// Build the initial state synchronously from persisted storage, so a refresh
// comes back already signed-in (no flash of the sign-in screen) and the
// persistence effects write back the same data instead of clobbering it.
const bootState = (): AppState => {
  const base = initialState(Date.now());
  const identities = loadIdentities();
  const relays = loadRelays().map((r) => ({ ...r, status: 'connecting' as const }));
  const active = loadActive();
  const me = active ? identities.find((i) => i.pubkey === active) : undefined;
  if (!me) return { ...base, identities, relays };
  return {
    ...base,
    identities,
    relays,
    screen: 'desktop',
    myPubkey: me.pubkey,
    myName: me.name || shortNpub(me.pubkey),
    myAvatar: avatarFor(me.pubkey),
  };
};

export const App = () => {
  // `Date.now()` is the one impurity at the edge; the reducer never calls it.
  const [state, dispatch] = useReducer(reducer, null, bootState);
  const drag = useDrag();
  const resize = useResize();

  // Latest-state ref so deferred timers and network callbacks read current state.
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const [muted, setMutedState] = useState(false);
  // A pubkey pulled from an `?add=` invite link, pending the user's confirmation.
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const toastId = useRef(0);
  const nudgeAt = useRef<Record<string, number>>({});

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts, { ...toast, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), TOAST_TTL_MS);
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const next = !m;
      setMuted(next);
      return next;
    });
  }, []);

  const inviteLinkFor = useCallback(
    (pubkey: string) => `${window.location.origin}${window.location.pathname}?add=${npubOf(pubkey)}`,
    [],
  );

  // Copy text, confirming with a toast; falls back to a prompt if the
  // Clipboard API is unavailable (e.g. insecure context).
  const copy = useCallback((text: string, label: string) => {
    const done = (): void => pushToast({ title: 'Copied', body: `Your ${label} is on the clipboard.`, status: 'online', avatar: stateRef.current.myAvatar });
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => window.prompt(`Copy your ${label}:`, text));
    } else {
      window.prompt(`Copy your ${label}:`, text);
    }
  }, [pushToast]);

  // Strip the `?add=` param so a refresh doesn't re-prompt.
  const clearInviteParam = useCallback(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('add')) return;
    url.searchParams.delete('add');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // UX side-effects for inbound relay events (sounds, toasts, effect timers).
  const sink: NostrSink = useMemo(
    () => ({
      onIncoming: (partner, message) => {
        const c = resolveContact(stateRef.current, partner);
        const toastStatus = c.status === 'offline' ? 'online' : c.status;
        if (message.payload.kind === 'nudge') {
          playSound('nudge');
          pushToast({ title: c.name, body: 'sent you a Nudge.', status: toastStatus, avatar: c.avatar });
          setTimeout(() => dispatch({ type: 'SET_SHAKE', pubkey: partner, shake: false }), SHAKE_MS);
        } else if (message.payload.kind === 'wink') {
          playSound('alert');
          pushToast({ title: c.name, body: 'sent you a Wink.', status: toastStatus, avatar: c.avatar });
          setTimeout(() => dispatch({ type: 'SET_WINK', pubkey: partner, on: false }), WINK_MS);
        } else {
          playSound('message');
          pushToast({ title: c.name, body: 'sent you a message.', status: toastStatus, avatar: c.avatar });
        }
      },
      onContactOnline: (pubkey) => {
        const c = resolveContact(stateRef.current, pubkey);
        playSound('online');
        pushToast({ title: c.name, body: 'has just signed in.', status: c.status === 'offline' ? 'online' : c.status, avatar: c.avatar });
      },
    }),
    [pushToast],
  );

  const nostr = useNostr(state, dispatch, sink);

  const doSignIn = useCallback((identity: Identity) => {
    resumeAudio();
    playSound('signin');
    dispatch({ type: 'SIGN_IN', pubkey: identity.pubkey, name: identity.name || shortNpub(identity.pubkey), avatar: avatarFor(identity.pubkey) });
  }, []);

  // Pick up an `?add=<npub>` invite link on load.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('add');
    if (!param) return;
    const pubkey = pubkeyFromInput(param);
    if (pubkey) setPendingInvite(pubkey);
    else clearInviteParam();
  }, [clearInviteParam]);

  // Once signed in, fetch the inviter's profile for a friendly prompt; an
  // invite that points at your own key is silently dismissed.
  useEffect(() => {
    if (!pendingInvite || state.screen !== 'desktop') return;
    if (pendingInvite === state.myPubkey) {
      setPendingInvite(null);
      clearInviteParam();
      return;
    }
    nostr.lookup(pendingInvite);
  }, [pendingInvite, state.screen, state.myPubkey, nostr, clearInviteParam]);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), CLOCK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Auto-away: drop to "Away" after idle, restore the prior status on activity.
  const autoAway = useRef(false);
  const beforeAway = useRef<SelectableStatus>('online');
  useEffect(() => {
    if (state.screen !== 'desktop') return;
    let timer = 0;
    const arm = (): void => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        const cur = stateRef.current.myStatus;
        if (cur === 'online' || cur === 'busy') {
          beforeAway.current = cur;
          autoAway.current = true;
          nostr.setStatus('away');
        }
      }, AUTO_AWAY_MS);
    };
    const onActivity = (): void => {
      if (autoAway.current) {
        autoAway.current = false;
        nostr.setStatus(beforeAway.current);
      }
      arm();
    };
    arm();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('mousedown', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('mousedown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [state.screen, nostr]);

  // Flash the browser tab title while any conversation has an unread message.
  useEffect(() => {
    const flashing = state.chats.find((c) => c.flashing);
    if (!flashing) {
      document.title = 'MSN Messenger';
      return;
    }
    const name = resolveContact(stateRef.current, flashing.pubkey).name;
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? `${name} says...` : 'MSN Messenger';
    }, 600);
    return () => {
      clearInterval(id);
      document.title = 'MSN Messenger';
    };
  }, [state.chats]);

  // --- identity actions ----------------------------------------------------

  const signInPubkey = useCallback((pubkey: string) => {
    const id = stateRef.current.identities.find((i) => i.pubkey === pubkey);
    if (id) doSignIn(id);
  }, [doSignIn]);

  const createIdentity = useCallback(() => {
    const kp = createKeyPair();
    const identity: Identity = { pubkey: kp.pubkey, nsec: kp.nsec, name: '' };
    dispatch({ type: 'ADD_IDENTITY', identity });
    doSignIn(identity);
  }, [doSignIn]);

  const importIdentity = useCallback(() => {
    const raw = window.prompt('Paste your account secret key:');
    if (!raw) return;
    const nsec = raw.trim();
    try {
      const pubkey = pubkeyFromNsec(nsec);
      const identity: Identity = { pubkey, nsec, name: '' };
      dispatch({ type: 'ADD_IDENTITY', identity });
      doSignIn(identity);
    } catch {
      window.alert("That doesn't look like a valid account secret key.");
    }
  }, [doSignIn]);

  const signOut = useCallback(() => {
    playSound('offline');
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  const editPsm = useCallback(() => {
    const next = window.prompt('Personal message:', stateRef.current.myPsm);
    if (next !== null) nostr.setPsm(next);
  }, [nostr]);

  const editName = useCallback(() => {
    const next = window.prompt('Display name:', stateRef.current.myName);
    if (next) nostr.setName(next.trim());
  }, [nostr]);

  // --- messaging actions ---------------------------------------------------

  const handleSend = useCallback((pubkey: string) => {
    const chat = stateRef.current.chats.find((c) => c.pubkey === pubkey);
    const raw = chat?.draft.trim() ?? '';
    if (!chat || !raw) return;
    nostr.sendText(pubkey, raw);
    playSound('send');
  }, [nostr]);

  const handleNudge = useCallback((pubkey: string) => {
    const last = nudgeAt.current[pubkey] ?? 0;
    if (Date.now() - last < NUDGE_COOLDOWN_MS) {
      dispatch({ type: 'APPEND_SYSTEM', pubkey, text: 'You may not send a Nudge that often.' });
      return;
    }
    nudgeAt.current[pubkey] = Date.now();
    nostr.sendNudge(pubkey);
    playSound('nudge');
    setTimeout(() => dispatch({ type: 'SET_SHAKE', pubkey, shake: false }), SHAKE_MS);
  }, [nostr]);

  const handleWink = useCallback((pubkey: string) => {
    nostr.sendWink(pubkey, pick(WINK_GLYPHS));
    playSound('alert');
    setTimeout(() => dispatch({ type: 'SET_WINK', pubkey, on: false }), WINK_MS);
  }, [nostr]);

  const pickEmoji = useCallback((pubkey: string, code: string) => {
    const chat = stateRef.current.chats.find((c) => c.pubkey === pubkey);
    if (!chat) return;
    dispatch({ type: 'SET_DRAFT', pubkey, draft: chat.draft + code });
    dispatch({ type: 'TOGGLE_EMOJI', pubkey });
  }, []);

  // --- contacts & relays ---------------------------------------------------

  const addContact = useCallback(async (input: string, petname: string): Promise<string | null> => {
    let pubkey = pubkeyFromInput(input);
    if (!pubkey && isNip05(input)) {
      try {
        pubkey = (await queryProfile(input))?.pubkey ?? null;
      } catch {
        pubkey = null;
      }
    }
    if (!pubkey) return "We couldn't find that contact. Check the address and try again.";
    if (pubkey === stateRef.current.myPubkey) return "That's your own key!";
    nostr.addContact(pubkey, petname);
    return null;
  }, [nostr]);

  const acceptInvite = useCallback(() => {
    if (pendingInvite && !stateRef.current.follows.includes(pendingInvite)) nostr.addContact(pendingInvite, '');
    setPendingInvite(null);
    clearInviteParam();
  }, [pendingInvite, nostr, clearInviteParam]);

  const dismissInvite = useCallback(() => {
    setPendingInvite(null);
    clearInviteParam();
  }, [clearInviteParam]);

  const addRelay = useCallback((url: string) => {
    const normalised = normaliseRelay(url);
    if (!normalised) {
      window.alert('Enter a valid server address, e.g. wss://server.example.com');
      return;
    }
    dispatch({ type: 'ADD_RELAY', url: normalised });
  }, []);

  const setStatus = useCallback((status: SelectableStatus) => {
    autoAway.current = false;
    nostr.setStatus(status);
  }, [nostr]);

  // --- render --------------------------------------------------------------

  const contacts = useMemo(() => state.follows.map((p) => resolveContact(state, p)), [state]);
  const relaySummary = {
    connected: state.relays.filter((r) => r.status === 'connected').length,
    total: state.relays.length,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 780,
        overflow: 'hidden',
        background: 'linear-gradient(170deg,#2f6fd0 0%,#5a9be0 28%,#9fd06a 52%,#79b948 72%,#5f9a36 100%)',
      }}
    >
      <Taskbar
        now={state.now}
        muted={muted}
        onToggleMute={toggleMute}
        windows={
          state.screen === 'desktop'
            ? [
                { id: '__buddy__', label: `${state.myName || 'You'} - Messenger`, status: state.myStatus, flashing: false },
                ...state.chats.map((c) => {
                  const r = resolveContact(state, c.pubkey);
                  return { id: c.pubkey, label: r.name, status: r.status, flashing: c.flashing };
                }),
              ]
            : []
        }
        onFocusWindow={(id) => {
          if (id !== '__buddy__') dispatch({ type: 'FOCUS_CHAT', pubkey: id });
        }}
      />

      {state.screen === 'signin' && (
        <SignIn
          identities={state.identities}
          status={state.signinStatus}
          top={state.signinTop}
          left={state.signinLeft}
          onDrag={(e: ReactMouseEvent) => drag(e, ({ top, left }) => dispatch({ type: 'MOVE_SIGNIN', top, left }))}
          onStatus={(status: SelectableStatus) => dispatch({ type: 'SET_SIGNIN_STATUS', status })}
          onSignIn={signInPubkey}
          onCreate={createIdentity}
          onImport={importIdentity}
          onRemove={(pubkey) => dispatch({ type: 'REMOVE_IDENTITY', pubkey })}
        />
      )}

      {state.screen === 'desktop' && (
        <>
          <BuddyList
            state={state}
            contacts={contacts}
            relaySummary={relaySummary}
            onDrag={(e: ReactMouseEvent) => drag(e, ({ top, left }) => dispatch({ type: 'MOVE_BUDDY', top, left }))}
            onSignOut={signOut}
            onToggleStatusPicker={() => dispatch({ type: 'TOGGLE_STATUS_PICKER' })}
            onPickStatus={setStatus}
            onEditPsm={editPsm}
            onEditName={editName}
            onChangePicture={() => dispatch({ type: 'TOGGLE_CHANGE_PICTURE' })}
            onToggleGroup={(group) => dispatch({ type: 'TOGGLE_GROUP', group })}
            onOpenChat={(pubkey) => dispatch({ type: 'OPEN_CHAT', pubkey })}
            onRemoveContact={(pubkey) => dispatch({ type: 'REMOVE_CONTACT', pubkey })}
            onAddContact={() => dispatch({ type: 'TOGGLE_ADD_CONTACT' })}
            onShare={() => dispatch({ type: 'TOGGLE_SHARE' })}
            onOpenRelays={() => dispatch({ type: 'TOGGLE_RELAY_MANAGER' })}
          />

          {state.chats.map((chat) => (
            <ChatWindow
              key={chat.pubkey}
              chat={chat}
              contact={resolveContact(state, chat.pubkey)}
              inContacts={state.follows.includes(chat.pubkey)}
              myAvatar={state.myAvatar}
              myName={state.myName || 'You'}
              onAddContact={() => nostr.addContact(chat.pubkey, '')}
              onTitleDrag={(e) => {
                dispatch({ type: 'FOCUS_CHAT', pubkey: chat.pubkey });
                drag(e, ({ top, left }) => dispatch({ type: 'MOVE_CHAT', pubkey: chat.pubkey, top, left }));
              }}
              onFocus={() => dispatch({ type: 'FOCUS_CHAT', pubkey: chat.pubkey })}
              onResize={(e) => {
                dispatch({ type: 'FOCUS_CHAT', pubkey: chat.pubkey });
                resize(e, { width: 336, height: 360 }, ({ width, height }) =>
                  dispatch({ type: 'RESIZE_CHAT', pubkey: chat.pubkey, width, height }),
                );
              }}
              onClose={() => dispatch({ type: 'CLOSE_CHAT', pubkey: chat.pubkey })}
              onDraft={(draft) => dispatch({ type: 'SET_DRAFT', pubkey: chat.pubkey, draft })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(chat.pubkey);
                }
              }}
              onSend={() => handleSend(chat.pubkey)}
              onNudge={() => handleNudge(chat.pubkey)}
              onWink={() => handleWink(chat.pubkey)}
              onToggleEmoji={() => dispatch({ type: 'TOGGLE_EMOJI', pubkey: chat.pubkey })}
              onPickEmoji={(code) => pickEmoji(chat.pubkey, code)}
            />
          ))}

          {state.relayManagerOpen && (
            <RelayManager
              relays={state.relays}
              onAdd={addRelay}
              onRemove={(url) => dispatch({ type: 'REMOVE_RELAY', url })}
              onToggle={(url) => dispatch({ type: 'TOGGLE_RELAY', url })}
              onClose={() => dispatch({ type: 'TOGGLE_RELAY_MANAGER' })}
            />
          )}

          {state.addContactOpen && <AddContact onAdd={addContact} onClose={() => dispatch({ type: 'TOGGLE_ADD_CONTACT' })} />}

          {state.changePictureOpen && (
            <ChangePicture
              current={state.myAvatar}
              name={state.myName || 'You'}
              onChoose={(picture) => {
                nostr.setAvatar(picture);
                dispatch({ type: 'TOGGLE_CHANGE_PICTURE' });
              }}
              onClose={() => dispatch({ type: 'TOGGLE_CHANGE_PICTURE' })}
            />
          )}

          {state.shareOpen && state.myPubkey && (
            <ShareContact
              name={state.myName || 'You'}
              avatar={state.myAvatar}
              npub={npubOf(state.myPubkey)}
              link={inviteLinkFor(state.myPubkey)}
              onCopyNpub={() => state.myPubkey && copy(npubOf(state.myPubkey), 'contact address')}
              onCopyLink={() => state.myPubkey && copy(inviteLinkFor(state.myPubkey), 'invite link')}
              onClose={() => dispatch({ type: 'TOGGLE_SHARE' })}
            />
          )}

          {pendingInvite && pendingInvite !== state.myPubkey && (
            <InviteDialog
              contact={resolveContact(state, pendingInvite)}
              alreadyAdded={state.follows.includes(pendingInvite)}
              onAdd={acceptInvite}
              onCancel={dismissInvite}
            />
          )}
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((ts) => ts.filter((t) => t.id !== id))} />
    </div>
  );
};
