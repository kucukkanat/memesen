import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Contact, SelectableStatus } from './state/types';
import { AUTO_REPLIES, CONTACTS, WINK_GLYPHS } from './state/data';
import { formatTime, pick } from './state/helpers';
import { initialState, reducer } from './state/reducer';
import { playSound, resumeAudio, setMuted } from './audio/sounds';
import { useDrag } from './hooks/useDrag';
import { useResize } from './hooks/useResize';
import { Taskbar } from './components/Taskbar';
import { SignIn } from './components/SignIn';
import { BuddyList } from './components/BuddyList';
import { ChatWindow } from './components/ChatWindow';
import { ToastStack } from './components/Toasts';
import type { Toast } from './components/Toasts';

const CLOCK_INTERVAL_MS = 20_000;
const AUTO_AWAY_MS = 5 * 60_000; // MSN flipped you to Away after ~5 min idle.
const NUDGE_COOLDOWN_MS = 6_000; // "You may not send a Nudge that often."
const TOAST_TTL_MS = 6_000;
const replyDelay = (): number => 900 + Math.random() * 1600;
const nudgeBackDelay = (): number => 1400 + Math.random() * 1000;

export const App = () => {
  // `Date.now()` is the one impurity at the edge; the reducer never calls it.
  const [state, dispatch] = useReducer(reducer, Date.now(), initialState);
  const drag = useDrag();
  const resize = useResize();

  // Latest-state ref so deferred timers (replies, nudges) read current chats.
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const [muted, setMutedState] = useState(false);
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
          dispatch({ type: 'SET_STATUS', status: 'away' });
        }
      }, AUTO_AWAY_MS);
    };
    const onActivity = (): void => {
      if (autoAway.current) {
        autoAway.current = false;
        dispatch({ type: 'SET_STATUS', status: beforeAway.current });
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
  }, [state.screen]);

  // Flash the browser tab title while any conversation has an unread message.
  useEffect(() => {
    const flashing = state.chats.find((c) => c.flashing);
    if (!flashing) {
      document.title = 'MSN Messenger';
      return;
    }
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? `${flashing.name} says...` : 'MSN Messenger';
    }, 600);
    return () => {
      clearInterval(id);
      document.title = 'MSN Messenger';
    };
  }, [state.chats]);

  const signIn = useCallback(() => {
    resumeAudio();
    playSound('signin');
    dispatch({ type: 'SIGN_IN' });
    // After connecting, your online contacts "sign in" with toasts + the chime.
    CONTACTS.filter((c) => c.status !== 'offline').forEach((c, i) => {
      setTimeout(() => {
        playSound('online');
        pushToast({ title: c.name, body: 'has just signed in.', status: c.status, avatar: c.avatar });
      }, 1800 + i * 1400);
    });
  }, [pushToast]);

  const scheduleReply = useCallback((id: string) => {
    const chat = stateRef.current.chats.find((c) => c.id === id);
    if (!chat || chat.status === 'offline') return;
    dispatch({ type: 'SET_TYPING', id, typing: true });
    setTimeout(() => {
      const cur = stateRef.current.chats.find((c) => c.id === id);
      if (!cur) return;
      dispatch({ type: 'SET_TYPING', id, typing: false });
      dispatch({
        type: 'APPEND_MESSAGE',
        id,
        message: { kind: 'chat', sender: cur.name, body: pick(AUTO_REPLIES), time: formatTime(Date.now()), mine: false },
      });
      playSound('message');
      // Flash the taskbar button unless this is the focused (top-most) window.
      if (cur.z !== stateRef.current.zTop) dispatch({ type: 'SET_FLASH', id, on: true });
      pushToast({ title: cur.name, body: 'sent you a message.', status: cur.status, avatar: cur.avatar });
    }, replyDelay());
  }, [pushToast]);

  const handleSend = useCallback((id: string) => {
    const chat = stateRef.current.chats.find((c) => c.id === id);
    const raw = chat?.draft.trim() ?? '';
    if (!chat || !raw) return;
    dispatch({ type: 'SEND_MESSAGE', id, body: raw, time: formatTime(Date.now()) });
    playSound('send');
    scheduleReply(id);
  }, [scheduleReply]);

  const handleNudge = useCallback((id: string) => {
    const chat = stateRef.current.chats.find((c) => c.id === id);
    if (!chat) return;
    const last = nudgeAt.current[id] ?? 0;
    if (Date.now() - last < NUDGE_COOLDOWN_MS) {
      dispatch({ type: 'APPEND_MESSAGE', id, message: { kind: 'system', text: 'You may not send a Nudge that often.' } });
      return;
    }
    nudgeAt.current[id] = Date.now();
    dispatch({ type: 'APPEND_MESSAGE', id, message: { kind: 'system', text: 'You have just sent a Nudge.' } });
    dispatch({ type: 'SET_SHAKE', id, shake: true });
    playSound('nudge');
    setTimeout(() => dispatch({ type: 'SET_SHAKE', id, shake: false }), 900);
    if (chat.status === 'offline') return;
    setTimeout(() => {
      dispatch({ type: 'APPEND_MESSAGE', id, message: { kind: 'system', text: `${chat.name} has just sent you a Nudge.` } });
      dispatch({ type: 'SET_SHAKE', id, shake: true });
      playSound('nudge');
      setTimeout(() => dispatch({ type: 'SET_SHAKE', id, shake: false }), 900);
    }, nudgeBackDelay());
  }, []);

  const handleWink = useCallback((id: string) => {
    dispatch({ type: 'SET_WINK', id, on: true, glyph: pick(WINK_GLYPHS) });
    dispatch({ type: 'APPEND_MESSAGE', id, message: { kind: 'system', text: 'You have sent a Wink.' } });
    playSound('alert');
    setTimeout(() => dispatch({ type: 'SET_WINK', id, on: false }), 1400);
  }, []);

  const pickEmoji = useCallback((id: string, code: string) => {
    const chat = stateRef.current.chats.find((c) => c.id === id);
    if (!chat) return;
    dispatch({ type: 'SET_DRAFT', id, draft: chat.draft + code });
    dispatch({ type: 'TOGGLE_EMOJI', id });
  }, []);

  const editPsm = useCallback(() => {
    const next = window.prompt('Personal message:', stateRef.current.myPsm);
    if (next !== null) dispatch({ type: 'SET_PSM', psm: next });
  }, []);

  const setStatus = useCallback((status: SelectableStatus) => {
    autoAway.current = false;
    dispatch({ type: 'SET_STATUS', status });
  }, []);

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
                { id: '__buddy__', label: `${state.myName} - Messenger`, status: state.myStatus, flashing: false },
                ...state.chats.map((c) => ({ id: c.id, label: c.name, status: c.status, flashing: c.flashing })),
              ]
            : []
        }
        onFocusWindow={(id) => {
          if (id !== '__buddy__') dispatch({ type: 'FOCUS_CHAT', id });
        }}
      />

      {state.screen === 'signin' && (
        <SignIn
          email={state.email}
          password={state.password}
          status={state.signinStatus}
          top={state.signinTop}
          left={state.signinLeft}
          onDrag={(e: ReactMouseEvent) => drag(e, ({ top, left }) => dispatch({ type: 'MOVE_SIGNIN', top, left }))}
          onEmail={(email) => dispatch({ type: 'SET_EMAIL', email })}
          onPassword={(password) => dispatch({ type: 'SET_PASSWORD', password })}
          onStatus={(status: SelectableStatus) => dispatch({ type: 'SET_SIGNIN_STATUS', status })}
          onSubmit={signIn}
        />
      )}

      {state.screen === 'desktop' && (
        <>
          <BuddyList
            state={state}
            onDrag={(e: ReactMouseEvent) => drag(e, ({ top, left }) => dispatch({ type: 'MOVE_BUDDY', top, left }))}
            onSignOut={() => dispatch({ type: 'SIGN_OUT' })}
            onToggleStatusPicker={() => dispatch({ type: 'TOGGLE_STATUS_PICKER' })}
            onPickStatus={setStatus}
            onEditPsm={editPsm}
            onToggleGroup={(group) => dispatch({ type: 'TOGGLE_GROUP', group })}
            onOpenChat={(contact: Contact) => dispatch({ type: 'OPEN_CHAT', contact })}
          />
          {state.chats.map((chat) => (
            <ChatWindow
              key={chat.id}
              chat={chat}
              myAvatar={state.myAvatar}
              myName={state.myName}
              onTitleDrag={(e) => {
                dispatch({ type: 'FOCUS_CHAT', id: chat.id });
                drag(e, ({ top, left }) => dispatch({ type: 'MOVE_CHAT', id: chat.id, top, left }));
              }}
              onFocus={() => dispatch({ type: 'FOCUS_CHAT', id: chat.id })}
              onResize={(e) => {
                dispatch({ type: 'FOCUS_CHAT', id: chat.id });
                resize(e, { width: 336, height: 360 }, ({ width, height }) =>
                  dispatch({ type: 'RESIZE_CHAT', id: chat.id, width, height }),
                );
              }}
              onClose={() => dispatch({ type: 'CLOSE_CHAT', id: chat.id })}
              onDraft={(draft) => dispatch({ type: 'SET_DRAFT', id: chat.id, draft })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(chat.id);
                }
              }}
              onSend={() => handleSend(chat.id)}
              onNudge={() => handleNudge(chat.id)}
              onWink={() => handleWink(chat.id)}
              onToggleEmoji={() => dispatch({ type: 'TOGGLE_EMOJI', id: chat.id })}
              onPickEmoji={(code) => pickEmoji(chat.id, code)}
            />
          ))}
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((ts) => ts.filter((t) => t.id !== id))} />
    </div>
  );
};
