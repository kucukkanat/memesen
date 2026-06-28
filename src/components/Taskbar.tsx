import type { CSSProperties } from 'react';
import type { StatusKey } from '../state/types';
import { formatClock } from '../state/helpers';
import { Butterfly, StatusIcon } from '../assets/icons';
import { RichText } from '../assets/emoticons';
import { useIsMobile, MOBILE_NAV_H } from '../hooks/useIsMobile';

export interface TaskbarWindow {
  readonly id: string;
  readonly label: string;
  readonly status: StatusKey;
  readonly flashing: boolean;
}

export interface TaskbarProps {
  readonly now: number;
  readonly muted: boolean;
  readonly onToggleMute: () => void;
  readonly windows: readonly TaskbarWindow[];
  readonly onFocusWindow: (id: string) => void;
  /** Mobile only: which window the bottom-nav should mark as current. */
  readonly activeId?: string | undefined;
}

/** Sentinel id for the buddy-list "home" entry (mirrors App). */
const BUDDY_ID = '__buddy__';

const WIN_BTN: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  maxWidth: 160,
  height: 23,
  padding: '0 9px',
  borderRadius: 3,
  fontSize: 11,
  color: '#fff',
  cursor: 'pointer',
  textShadow: '1px 1px 1px rgba(0,0,0,.35)',
  overflow: 'hidden',
};

export const Taskbar = (props: TaskbarProps) => {
  const mobile = useIsMobile();
  return mobile ? <MobileNav {...props} /> : <DesktopTaskbar {...props} />;
};

/**
 * The mobile bottom navigation: the taskbar reimagined as touch tabs. The buddy
 * list becomes a "Contacts" home button; each open conversation is a tab that
 * flashes on a new message. No "start" button, no clock — the phone's own
 * status bar already shows the time.
 */
const MobileNav = ({ muted, onToggleMute, windows, onFocusWindow, activeId }: TaskbarProps) => (
  <div
    data-testid="taskbar-nav"
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      minHeight: MOBILE_NAV_H,
      paddingBottom: 'var(--safe-bottom)',
      background: 'linear-gradient(180deg,#3168d8 0%,#1d4fc4 9%,#2358cf 90%,#1840a8 100%)',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 30,
      boxShadow: '0 -1px 6px rgba(0,0,0,.35)',
    }}
  >
    <div data-testid="taskbar-window-list" className="msn-scroll" style={{ display: 'flex', alignItems: 'stretch', gap: 6, padding: '5px 6px', flex: 1, overflowX: 'auto' }}>
      {windows.map((w) => {
        const active = w.id === activeId;
        const home = w.id === BUDDY_ID;
        return (
          <div
            key={w.id}
            data-testid="taskbar-window-item"
            className="msn-taskbtn"
            onClick={() => onFocusWindow(w.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minWidth: 60,
              maxWidth: 96,
              padding: '0 10px',
              borderRadius: 7,
              color: '#fff',
              fontSize: 10,
              cursor: 'pointer',
              textShadow: '1px 1px 1px rgba(0,0,0,.35)',
              background: w.flashing
                ? 'linear-gradient(180deg,#ffb347,#f08000)'
                : active
                  ? 'linear-gradient(180deg,#6aa3ec,#3a73d4)'
                  : 'transparent',
              border: active || w.flashing ? '1px solid rgba(255,255,255,.55)' : '1px solid transparent',
              animation: w.flashing ? 'msn-taskflash 1s steps(1) infinite' : 'none',
            }}
          >
            {home ? <Butterfly size={18} /> : <StatusIcon status={w.status} size={16} />}
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {home ? 'Contacts' : <RichText text={w.label} size={12} />}
            </span>
          </div>
        );
      })}
    </div>

    <div
      data-testid="taskbar-mute-toggle"
      className="msn-link"
      title={muted ? 'Sounds off — tap to unmute' : 'Sounds on — tap to mute'}
      onClick={onToggleMute}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, fontSize: 20, color: '#fff', cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,.18)' }}
    >
      {muted ? '🔇' : '🔊'}
    </div>
  </div>
);

const DesktopTaskbar = ({ now, muted, onToggleMute, windows, onFocusWindow }: TaskbarProps) => (
  <div
    data-testid="taskbar"
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 34,
      background: 'linear-gradient(180deg,#3168d8 0%,#1d4fc4 9%,#2358cf 90%,#1840a8 100%)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 30,
      boxShadow: '0 -1px 0 #5a8be8 inset',
    }}
  >
    <div
      data-testid="taskbar-start-button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        height: '100%',
        padding: '0 28px 0 11px',
        background: 'linear-gradient(180deg,#6cbf44 0%,#4a9a2c 48%,#367f1c 100%)',
        boxShadow: 'inset 0 1px 0 #9ee06a, 1px 0 2px rgba(0,0,0,.3)',
        fontWeight: 'bold',
        fontStyle: 'italic',
        fontSize: 16,
        color: '#fff',
        textShadow: '1px 1px 2px rgba(0,0,0,.45)',
        borderRadius: '0 11px 11px 0',
      }}
    >
      <span style={{ fontSize: 17 }}>⊞</span> start
    </div>

    {/* open-window buttons */}
    <div data-testid="taskbar-window-list" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px', flex: 1, overflow: 'hidden' }}>
      {windows.map((w) => (
        <div
          key={w.id}
          data-testid="taskbar-window-item"
          className="msn-taskbtn"
          onClick={() => onFocusWindow(w.id)}
          style={{
            ...WIN_BTN,
            background: w.flashing
              ? 'linear-gradient(180deg,#ffb347,#f08000)'
              : 'linear-gradient(180deg,#4f86e0,#2a5fc4)',
            border: w.flashing ? '1px solid #c25e00' : '1px solid #1c4aa8',
            animation: w.flashing ? 'msn-taskflash 1s steps(1) infinite' : 'none',
          }}
        >
          <StatusIcon status={w.status} size={13} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><RichText text={w.label} size={14} /></span>
        </div>
      ))}
    </div>

    {/* system tray */}
    <div
      data-testid="taskbar-tray"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        height: '100%',
        padding: '0 13px',
        background: 'linear-gradient(180deg,#2d8de0,#127bd4)',
        boxShadow: 'inset 1px 0 0 rgba(255,255,255,.25), inset 0 1px 0 rgba(255,255,255,.3)',
      }}
    >
      <span
        data-testid="taskbar-mute-toggle"
        className="msn-link"
        title={muted ? 'Sounds off — click to unmute' : 'Sounds on — click to mute'}
        onClick={onToggleMute}
        style={{ fontSize: 13, color: '#fff', cursor: 'pointer', textShadow: '1px 1px 1px rgba(0,0,0,.35)' }}
      >
        {muted ? '🔇' : '🔊'}
      </span>
      <Butterfly size={15} />
      <span data-testid="taskbar-clock" style={{ color: '#fff', textShadow: '1px 1px 1px rgba(0,0,0,.35)' }}>{formatClock(now)}</span>
    </div>
  </div>
);
