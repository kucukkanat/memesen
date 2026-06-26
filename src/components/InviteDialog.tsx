import type { ResolvedContact } from '../state/view';
import { CLOSE_BTN, GREEN_BTN, SIDE_BORDERS, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly, StatusIcon } from '../assets/icons';
import { Avatar } from '../assets/avatars';

export interface InviteDialogProps {
  readonly contact: ResolvedContact;
  /** True when this pubkey is already in the buddy list. */
  readonly alreadyAdded: boolean;
  readonly onAdd: () => void;
  readonly onCancel: () => void;
}

export const InviteDialog = (p: InviteDialogProps) => (
  <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%,-50%)', width: 332, zIndex: 27, boxShadow: '0 12px 38px rgba(0,0,0,.5)' }}>
    <div style={{ ...TITLE_BAR }}>
      <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
      <span style={TITLE_TEXT}>Contact invitation</span>
      <div onClick={p.onCancel} style={{ ...CLOSE_BTN, width: 19, height: 17, fontSize: 10 }}>✕</div>
    </div>

    <div style={{ ...SIDE_BORDERS, background: '#fff', borderBottom: '1px solid #06387c', padding: '16px' }}>
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

    <div style={{ background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)', border: '1px solid #06387c', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '8px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      {p.alreadyAdded ? (
        <button onClick={p.onCancel} style={{ ...GREEN_BTN, padding: '5px 20px' }}>OK</button>
      ) : (
        <>
          <button onClick={p.onCancel} style={{ ...GREEN_BTN, padding: '5px 16px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>Not now</button>
          <button onClick={p.onAdd} style={{ ...GREEN_BTN, padding: '5px 22px' }}>Add</button>
        </>
      )}
    </div>
  </div>
);
