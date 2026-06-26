import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { SelectableStatus } from '../state/types';
import { DEFAULT_AVATAR } from '../state/data';
import { CLOSE_BTN, GREEN_BTN, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly } from '../assets/icons';
import { Avatar } from '../assets/avatars';

const FIELD: CSSProperties = {
  width: '100%',
  padding: '4px 5px',
  border: '1px solid #7a93b8',
  borderTopColor: '#5a73a0',
  fontFamily: 'Tahoma, sans-serif',
  fontSize: 11,
  marginBottom: 9,
};
const LABEL: CSSProperties = { textAlign: 'left', color: '#333', marginBottom: 3 };

export interface SignInProps {
  readonly email: string;
  readonly password: string;
  readonly status: SelectableStatus;
  /** `null` => render centered; a number => dragged to an explicit position. */
  readonly top: number | null;
  readonly left: number | null;
  readonly onDrag: (e: ReactMouseEvent) => void;
  readonly onEmail: (v: string) => void;
  readonly onPassword: (v: string) => void;
  readonly onStatus: (v: SelectableStatus) => void;
  readonly onSubmit: () => void;
}

export const SignIn = (p: SignInProps) => {
  const dragged = p.left != null && p.top != null;
  const placement: CSSProperties = dragged
    ? { top: p.top ?? 0, left: p.left ?? 0 }
    : { top: '46%', left: '50%', transform: 'translate(-50%,-50%)' };

  return (
  <div
    data-win="signin"
    style={{
      position: 'absolute',
      ...placement,
      width: 296,
      boxShadow: '0 10px 34px rgba(0,0,0,.45)',
      zIndex: 10,
    }}
  >
    <div onMouseDown={p.onDrag} style={{ ...TITLE_BAR, height: 25, borderRadius: '7px 7px 0 0', cursor: 'move' }}>
      <span style={TITLE_TEXT}>.NET Messenger Service</span>
      <div style={{ ...CLOSE_BTN, width: 21, height: 18 }}>✕</div>
    </div>
    <div
      style={{
        background: 'linear-gradient(180deg,#cfe2fb 0%,#ffffff 34%,#ffffff 100%)',
        border: '1px solid #06387c',
        borderTop: 'none',
        paddingBottom: 16,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg,#aacef5,#dcecfb)',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          borderBottom: '1px solid #b0c6e6',
        }}
      >
        <span style={{ display: 'flex', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,.25))' }}><Butterfly size={42} /></span>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 9, color: '#5a7aa8', fontWeight: 'bold' }}>Windows</div>
          <div style={{ fontSize: 19, fontWeight: 'bold', color: '#1a4a9c', letterSpacing: '.3px' }}>Messenger</div>
        </div>
      </div>

      <div style={{ padding: '20px 28px 0', textAlign: 'center' }}>
        <div style={{ width: 52, margin: '0 auto 14px', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}>
          <Avatar pic={DEFAULT_AVATAR} size={52} status="online" />
        </div>

        <div style={LABEL}>E-mail address:</div>
        <input
          className="msn-field"
          value={p.email}
          onChange={(e) => p.onEmail(e.target.value)}
          placeholder="you@hotmail.com"
          style={FIELD}
        />
        <div style={LABEL}>Password:</div>
        <input
          className="msn-field"
          type="password"
          value={p.password}
          onChange={(e) => p.onPassword(e.target.value)}
          placeholder="••••••••••"
          style={FIELD}
        />
        <div style={LABEL}>Status:</div>
        <select
          value={p.status}
          onChange={(e) => p.onStatus(e.target.value as SelectableStatus)}
          style={{ ...FIELD, padding: '3px 4px', marginBottom: 16 }}
        >
          <option value="online">Online</option>
          <option value="busy">Busy</option>
          <option value="away">Away</option>
          <option value="invisible">Appear Offline</option>
        </select>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            color: '#333',
            marginBottom: 16,
            justifyContent: 'flex-start',
          }}
        >
          <input type="checkbox" /> Sign me in automatically
        </label>

        <button
          onClick={p.onSubmit}
          style={{ ...GREEN_BTN, display: 'block', margin: '0 auto', padding: '6px 30px' }}
        >
          Sign In
        </button>

        <div
          style={{
            marginTop: 16,
            color: '#2a5db0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <span className="msn-link">Get a new .NET Passport</span>
          <span className="msn-link">Forgot your password?</span>
        </div>
      </div>
    </div>
  </div>
  );
};
