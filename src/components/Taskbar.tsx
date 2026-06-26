import type { CSSProperties } from 'react';
import type { StatusKey } from '../state/types';
import { formatClock } from '../state/helpers';
import { Butterfly, StatusIcon } from '../assets/icons';
import { RichText } from '../assets/emoticons';

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
}

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

export const Taskbar = ({ now, muted, onToggleMute, windows, onFocusWindow }: TaskbarProps) => (
  <div
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px', flex: 1, overflow: 'hidden' }}>
      {windows.map((w) => (
        <div
          key={w.id}
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
        className="msn-link"
        title={muted ? 'Sounds off — click to unmute' : 'Sounds on — click to mute'}
        onClick={onToggleMute}
        style={{ fontSize: 13, color: '#fff', cursor: 'pointer', textShadow: '1px 1px 1px rgba(0,0,0,.35)' }}
      >
        {muted ? '🔇' : '🔊'}
      </span>
      <Butterfly size={15} />
      <span style={{ color: '#fff', textShadow: '1px 1px 1px rgba(0,0,0,.35)' }}>{formatClock(now)}</span>
    </div>
  </div>
);
