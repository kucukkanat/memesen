import { CLOSE_BTN, GREEN_BTN, SIDE_BORDERS, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly } from '../assets/icons';
import { Avatar } from '../assets/avatars';

export interface ShareContactProps {
  readonly name: string;
  readonly avatar: string;
  readonly npub: string;
  readonly link: string;
  readonly onCopyNpub: () => void;
  readonly onCopyLink: () => void;
  readonly onClose: () => void;
}

const Field = ({ value, onCopy }: { value: string; onCopy: () => void }) => (
  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
    <input
      readOnly
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      style={{ flex: 1, minWidth: 0, padding: '4px 6px', border: '1px solid #9bb0d0', background: '#f6f9fd', fontFamily: 'Consolas, monospace', fontSize: 11, color: '#222' }}
    />
    <button onClick={onCopy} style={{ ...GREEN_BTN, padding: '4px 12px', flexShrink: 0 }}>Copy</button>
  </div>
);

export const ShareContact = (p: ShareContactProps) => (
  <div style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%,-50%)', width: 380, zIndex: 26, boxShadow: '0 12px 38px rgba(0,0,0,.5)' }}>
    <div style={{ ...TITLE_BAR }}>
      <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
      <span style={TITLE_TEXT}>Share my contact</span>
      <div onClick={p.onClose} style={{ ...CLOSE_BTN, width: 19, height: 17, fontSize: 10 }}>✕</div>
    </div>

    <div style={{ ...SIDE_BORDERS, background: '#fff', borderBottom: '1px solid #06387c', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Avatar pic={p.avatar} size={42} status="online" />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#0a3a8c', fontWeight: 'bold', fontSize: 13 }}>{p.name}</div>
          <div style={{ color: '#8a93a0', fontSize: 10 }}>Give either of these to a friend so they can add you.</div>
        </div>
      </div>

      <div style={{ color: '#333', marginBottom: 3 }}>Your public key (npub):</div>
      <Field value={p.npub} onCopy={p.onCopyNpub} />

      <div style={{ color: '#333', marginBottom: 3 }}>Invite link (one-click add):</div>
      <Field value={p.link} onCopy={p.onCopyLink} />
    </div>

    <div style={{ background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)', border: '1px solid #06387c', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '8px 12px', display: 'flex', justifyContent: 'flex-end' }}>
      <button onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 18px' }}>Done</button>
    </div>
  </div>
);
