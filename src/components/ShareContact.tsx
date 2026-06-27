import { GREEN_BTN } from '../ui/chrome';
import { Avatar } from '../assets/avatars';
import { Modal } from './Modal';

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
  <Modal title="Share my contact" width={380} onClose={p.onClose} footer={
    <button onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 18px' }}>Done</button>
  }>
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Avatar pic={p.avatar} size={42} status="online" />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#0a3a8c', fontWeight: 'bold', fontSize: 13 }}>{p.name}</div>
          <div style={{ color: '#8a93a0', fontSize: 10 }}>Give either of these to a friend so they can add you.</div>
        </div>
      </div>

      <div style={{ color: '#333', marginBottom: 3 }}>Your contact address:</div>
      <Field value={p.npub} onCopy={p.onCopyNpub} />

      <div style={{ color: '#333', marginBottom: 3 }}>Invite link (one-click add):</div>
      <Field value={p.link} onCopy={p.onCopyLink} />
    </div>
  </Modal>
);
