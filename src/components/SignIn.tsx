import { useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { Identity, SelectableStatus } from '../state/types';
import { DEFAULT_AVATAR } from '../state/data';
import { CLOSE_BTN, GREEN_BTN, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly, StatusIcon } from '../assets/icons';
import { Avatar } from '../assets/avatars';
import { avatarFor, shortNpub } from '../nostr/keys';

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
  readonly identities: readonly Identity[];
  readonly status: SelectableStatus;
  /** `null` => render centered; a number => dragged to an explicit position. */
  readonly top: number | null;
  readonly left: number | null;
  readonly onDrag: (e: ReactMouseEvent) => void;
  readonly onStatus: (v: SelectableStatus) => void;
  readonly onSignIn: (pubkey: string) => void;
  readonly onCreate: () => void;
  readonly onImport: () => void;
  readonly onRemove: (pubkey: string) => void;
}

const labelFor = (i: Identity): string => i.name || shortNpub(i.pubkey);

export const SignIn = (p: SignInProps) => {
  const [selected, setSelected] = useState<string>(p.identities[0]?.pubkey ?? '');
  const dragged = p.left != null && p.top != null;
  const placement: CSSProperties = dragged
    ? { top: p.top ?? 0, left: p.left ?? 0 }
    : { top: '46%', left: '50%', transform: 'translate(-50%,-50%)' };

  // Keep the selection valid as identities are added/removed.
  const active = p.identities.some((i) => i.pubkey === selected) ? selected : (p.identities[0]?.pubkey ?? '');
  const current = p.identities.find((i) => i.pubkey === active);
  const hasIdentities = p.identities.length > 0;

  return (
    <div
      data-win="signin"
      style={{ position: 'absolute', ...placement, width: 296, boxShadow: '0 10px 34px rgba(0,0,0,.45)', zIndex: 10 }}
    >
      <div onMouseDown={p.onDrag} style={{ ...TITLE_BAR, height: 25, borderRadius: '7px 7px 0 0', cursor: 'move' }}>
        <span style={TITLE_TEXT}>.NET Messenger Service</span>
        <div style={{ ...CLOSE_BTN, width: 21, height: 18 }}>✕</div>
      </div>
      <div style={{ background: 'linear-gradient(180deg,#cfe2fb 0%,#ffffff 34%,#ffffff 100%)', border: '1px solid #06387c', borderTop: 'none', paddingBottom: 16 }}>
        <div style={{ background: 'linear-gradient(180deg,#aacef5,#dcecfb)', padding: 16, display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid #b0c6e6' }}>
          <span style={{ display: 'flex', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,.25))' }}><Butterfly size={42} /></span>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 9, color: '#5a7aa8', fontWeight: 'bold' }}>Windows</div>
            <div style={{ fontSize: 19, fontWeight: 'bold', color: '#1a4a9c', letterSpacing: '.3px' }}>Messenger</div>
          </div>
        </div>

        <div style={{ padding: '18px 28px 0', textAlign: 'center' }}>
          <div style={{ width: 52, margin: '0 auto 12px', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}>
            <Avatar pic={current ? avatarFor(current.pubkey) : DEFAULT_AVATAR} size={52} status="online" />
          </div>

          {hasIdentities ? (
            <>
              <div style={LABEL}>Sign in as:</div>
              <div style={{ border: '1px solid #9bb0d0', background: '#fff', maxHeight: 132, overflowY: 'auto', marginBottom: 9 }} className="msn-scroll">
                {p.identities.map((i) => (
                  <div
                    key={i.pubkey}
                    onClick={() => setSelected(i.pubkey)}
                    onDoubleClick={() => p.onSignIn(i.pubkey)}
                    className="msn-statusopt"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: i.pubkey === active ? '#cfe0f8' : 'transparent',
                    }}
                  >
                    <Avatar pic={avatarFor(i.pubkey)} size={28} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelFor(i)}</div>
                      <div style={{ color: '#8a93a0', fontSize: 9 }}>{shortNpub(i.pubkey)}</div>
                    </div>
                    <span
                      title="Remove this account"
                      onClick={(e) => { e.stopPropagation(); p.onRemove(i.pubkey); }}
                      style={{ color: '#b04030', fontSize: 11, padding: '0 3px', cursor: 'pointer' }}
                    >
                      ✕
                    </span>
                  </div>
                ))}
              </div>

              <div style={LABEL}>Status:</div>
              <select
                value={p.status}
                onChange={(e) => p.onStatus(e.target.value as SelectableStatus)}
                style={{ ...FIELD, padding: '3px 4px', marginBottom: 14 }}
              >
                <option value="online">Online</option>
                <option value="busy">Busy</option>
                <option value="away">Away</option>
                <option value="invisible">Appear Offline</option>
              </select>

              <button
                onClick={() => active && p.onSignIn(active)}
                style={{ ...GREEN_BTN, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto', padding: '6px 26px' }}
              >
                <StatusIcon status={p.status} size={13} /> Sign In
              </button>
            </>
          ) : (
            <div style={{ color: '#444', fontSize: 11, lineHeight: 1.5, marginBottom: 14 }}>
              No accounts yet. Create a new one, or import an existing account to get started.
            </div>
          )}

          <div style={{ marginTop: 16, color: '#2a5db0', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
            <span className="msn-link" onClick={p.onCreate}>Create a new account</span>
            <span className="msn-link" onClick={p.onImport}>Import an existing account</span>
          </div>
        </div>
      </div>
    </div>
  );
};
