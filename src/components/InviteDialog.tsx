import type { ResolvedContact } from '../state/view';
import { GREEN_BTN } from '../ui/chrome';
import { StatusIcon } from '../assets/icons';
import { Avatar } from '../assets/avatars';
import { Modal } from './Modal';

export interface InviteDialogProps {
  readonly contact: ResolvedContact;
  /** True when this pubkey is already in the buddy list. */
  readonly alreadyAdded: boolean;
  readonly onAdd: () => void;
  readonly onCancel: () => void;
}

export const InviteDialog = (p: InviteDialogProps) => (
  <Modal title="Contact invitation" width={332} onClose={p.onCancel} footer={
    p.alreadyAdded ? (
      <button onClick={p.onCancel} style={{ ...GREEN_BTN, padding: '5px 20px' }}>OK</button>
    ) : (
      <>
        <button onClick={p.onCancel} style={{ ...GREEN_BTN, padding: '5px 16px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>Not now</button>
        <button onClick={p.onAdd} style={{ ...GREEN_BTN, padding: '5px 22px' }}>Add</button>
      </>
    )
  }>
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar pic={p.contact.avatar} size={44} status={p.contact.status} />
          <span style={{ position: 'absolute', bottom: -3, right: -3 }}><StatusIcon status={p.contact.status} size={13} /></span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#0a3a8c', fontWeight: 'bold', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.contact.name}</div>
          <div style={{ color: '#8a93a0', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.contact.handle}</div>
        </div>
      </div>
      <div style={{ color: '#333', fontSize: 11, marginTop: 13, lineHeight: 1.5 }}>
        {p.alreadyAdded
          ? 'This person is already in your buddy list.'
          : 'Would you like to add this person to your buddy list?'}
      </div>
    </div>
  </Modal>
);
