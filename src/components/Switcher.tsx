// The Alt+Tab overlay: a 3D cover-flow carousel of the open windows. Driven
// entirely by `useWindowSwitcher` — this file is pure presentation. The
// selected card sits flat and centred; its neighbours fan back in depth and
// rotate toward it, so cycling sweeps the stack past the front like flicking
// through album art.

import type { CSSProperties } from 'react';
import type { SwitcherWindow } from '../hooks/useWindowSwitcher';
import { Butterfly, StatusIcon } from '../assets/icons';
import { RichText } from '../assets/emoticons';

export interface SwitcherProps {
  readonly items: readonly SwitcherWindow[];
  readonly index: number;
  readonly isMac: boolean;
  readonly onHover: (index: number) => void;
  readonly onPick: (index: number) => void;
}

const CARD_W = 248;
const CARD_H = 188;
// How far each step from centre pushes a card sideways / back, and how hard it
// rotates toward the middle. Tuned so ~3 cards each side read clearly.
const SPREAD_X = 168;
const DEPTH_Z = 150;
const TILT = 38;
const VISIBLE = 4; // cards shown on either side of the selection

const cardTransform = (offset: number): CSSProperties => {
  const dir = Math.sign(offset);
  const mag = Math.abs(offset);
  return {
    transform:
      `translateX(${offset * SPREAD_X}px) ` +
      `translateZ(${-mag * DEPTH_Z}px) ` +
      `rotateY(${-dir * TILT}deg) ` +
      `scale(${offset === 0 ? 1 : 0.92})`,
    // Centre card on top, then fall back by distance.
    zIndex: 100 - mag,
    opacity: mag > VISIBLE ? 0 : 1 - mag * 0.12,
    // Far-off cards stop catching clicks once they've faded out.
    pointerEvents: mag > VISIBLE ? 'none' : 'auto',
  };
};

const Card = ({ win, selected }: { win: SwitcherWindow; selected: boolean }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 9,
      overflow: 'hidden',
      background: '#ece9d8',
      border: selected ? '1px solid #ffd34d' : '1px solid #06387c',
      boxShadow: selected
        ? '0 0 0 3px rgba(255,200,60,.85), 0 18px 40px rgba(0,0,0,.55)'
        : '0 12px 28px rgba(0,0,0,.5)',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* mini title bar */}
    <div
      style={{
        height: 26,
        flexShrink: 0,
        background: 'linear-gradient(180deg,#2d8bf5,#0a5fd6 50%,#0a52c4)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        color: '#fff',
      }}
    >
      {win.kind === 'buddy' ? <Butterfly size={14} /> : <StatusIcon status={win.status} size={13} />}
      <span style={{ flex: 1, fontWeight: 'bold', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '1px 1px 1px rgba(0,0,0,.4)' }}>
        <RichText text={win.label} size={13} />
      </span>
      <span style={{ width: 13, height: 11, borderRadius: 2, background: 'linear-gradient(180deg,#e8806a,#c83020)', border: '1px solid #fff' }} />
    </div>

    {/* body: big avatar + preview line */}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'linear-gradient(180deg,#ffffff,#eef2f9)' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img src={win.avatar} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', border: '1px solid #9bb0d0', background: '#fff' }} />
        {win.unread && (
          <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 12, height: 12, padding: '0 3px', borderRadius: 7, background: 'linear-gradient(180deg,#ffb347,#f08000)', border: '1px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,.4)' }} />
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#0a3a86', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <RichText text={win.label} size={14} />
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: '#5a6b86', height: 30, overflow: 'hidden', lineHeight: '15px' }}>
          {win.snippet ? <RichText text={win.snippet} size={12} /> : <span style={{ fontStyle: 'italic', opacity: 0.7 }}>{win.kind === 'buddy' ? 'Your contact list' : 'No messages yet'}</span>}
        </div>
      </div>
    </div>
  </div>
);

export const Switcher = ({ items, index, isMac, onHover, onPick }: SwitcherProps) => {
  const current = items[index];
  const combo = isMac ? 'Option ⌥ + Tab' : 'Alt + ` (above Tab)';
  return (
    <div
      data-testid="window-switcher"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(120% 120% at 50% 40%, rgba(20,52,110,.62), rgba(6,20,52,.82))',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        animation: 'msn-switcher-in .14s ease-out',
      }}
    >
      {/* the carousel stage */}
      <div style={{ perspective: 1400, width: '100%', height: CARD_H + 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', transformStyle: 'preserve-3d', width: CARD_W, height: CARD_H }}>
          {items.map((win, i) => {
            const offset = i - index;
            return (
              <div
                key={win.id}
                onMouseEnter={() => onHover(i)}
                onClick={() => onPick(i)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: CARD_W,
                  height: CARD_H,
                  cursor: 'pointer',
                  transition: 'transform .26s cubic-bezier(.22,.61,.36,1), opacity .26s ease',
                  ...cardTransform(offset),
                }}
              >
                <Card win={win} selected={offset === 0} />
              </div>
            );
          })}
        </div>
      </div>

      {/* selected window name */}
      <div style={{ marginTop: 6, fontSize: 19, fontWeight: 'bold', color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {current ? <RichText text={current.label} size={20} /> : null}
      </div>

      {/* hint line */}
      <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,.82)', textShadow: '0 1px 3px rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={pill}>{combo}</span>
        <span>cycle</span>
        <span style={pill}>↑ ↓ ← →</span>
        <span>move</span>
        <span style={pill}>Esc</span>
        <span>cancel</span>
      </div>
    </div>
  );
};

const pill: CSSProperties = {
  padding: '2px 8px',
  borderRadius: 5,
  background: 'rgba(255,255,255,.16)',
  border: '1px solid rgba(255,255,255,.3)',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
};
