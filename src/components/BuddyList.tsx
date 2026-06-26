import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { AppState, SelectableStatus } from '../state/types';
import type { ResolvedContact } from '../state/view';
import { statusOf } from '../state/data';
import { CLOSE_BTN, MENU_BAR, SIDE_BORDERS, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly, StatusIcon } from '../assets/icons';
import { Avatar } from '../assets/avatars';
import { RichText } from '../assets/emoticons';

const PICKER_STATUSES: readonly SelectableStatus[] = ['online', 'busy', 'away', 'invisible'];

export interface BuddyListProps {
  readonly state: AppState;
  readonly contacts: readonly ResolvedContact[];
  readonly relaySummary: { readonly connected: number; readonly total: number };
  readonly onDrag: (e: ReactMouseEvent) => void;
  readonly onSignOut: () => void;
  readonly onToggleStatusPicker: () => void;
  readonly onPickStatus: (s: SelectableStatus) => void;
  readonly onEditPsm: () => void;
  readonly onEditName: () => void;
  readonly onToggleGroup: (g: 'online' | 'offline') => void;
  readonly onOpenChat: (pubkey: string) => void;
  readonly onRemoveContact: (pubkey: string) => void;
  readonly onAddContact: () => void;
  readonly onOpenRelays: () => void;
}

const GROUP_HEADER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 8px',
  cursor: 'pointer',
  background: 'linear-gradient(180deg,#fbfdff,#e7effa)',
  fontWeight: 'bold',
  color: '#0a3a8c',
};

const ContactRow = ({ contact, onOpen, onRemove }: { contact: ResolvedContact; onOpen: () => void; onRemove: () => void }) => {
  const offline = contact.status === 'offline';
  return (
    <div
      onClick={onOpen}
      className="msn-row"
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px 3px 16px', cursor: 'pointer', opacity: offline ? 0.55 : 1 }}
    >
      <div style={{ position: 'relative', flexShrink: 0, width: 24, height: 24 }}>
        <Avatar pic={contact.avatar} size={24} style={{ filter: offline ? 'grayscale(1)' : undefined }} />
        <span style={{ position: 'absolute', bottom: -3, right: -3 }}>
          <StatusIcon status={contact.status} size={12} />
        </span>
      </div>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ color: offline ? '#666' : '#222' }}><RichText text={contact.name} size={15} /></span>
        {contact.psm && !offline && (
          <span style={{ color: '#8a93a0', fontStyle: 'italic' }}> - <RichText text={contact.psm} size={13} /></span>
        )}
      </span>
      <span
        title="Remove contact"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="msn-rowx"
        style={{ color: '#9aa6b6', fontSize: 11, padding: '0 2px' }}
      >
        ✕
      </span>
    </div>
  );
};

export const BuddyList = (p: BuddyListProps) => {
  const { state: s } = p;
  const me = statusOf(s.myStatus);
  const online = p.contacts.filter((c) => c.status !== 'offline');
  const offline = p.contacts.filter((c) => c.status === 'offline');

  return (
    <div
      data-win="buddy"
      style={{
        position: 'absolute',
        top: s.buddyTop,
        left: s.buddyLeft != null ? s.buddyLeft : 'auto',
        right: s.buddyLeft != null ? 'auto' : 22,
        width: 272,
        boxShadow: '0 6px 26px rgba(0,0,0,.4)',
        zIndex: 8,
      }}
    >
      {/* title bar */}
      <div onMouseDown={p.onDrag} style={{ ...TITLE_BAR, cursor: 'move' }}>
        <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
        <span style={TITLE_TEXT}>{s.myName || 'Messenger'} - Messenger</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ width: 19, height: 17, background: 'linear-gradient(180deg,#5a9bf0,#1a5fc8)', border: '1px solid #fff', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, cursor: 'pointer' }}>▢</div>
          <div onClick={p.onSignOut} title="Sign out" style={{ ...CLOSE_BTN, width: 19, height: 17, fontSize: 10 }}>✕</div>
        </div>
      </div>

      {/* menu */}
      <div style={MENU_BAR}>
        <span className="msn-link"><u>F</u>ile</span>
        <span className="msn-link" onClick={p.onAddContact}><u>C</u>ontacts</span>
        <span className="msn-link"><u>A</u>ctions</span>
        <span className="msn-link" onClick={p.onOpenRelays}><u>T</u>ools</span>
        <span className="msn-link"><u>H</u>elp</span>
      </div>

      {/* my profile header */}
      <div style={{ ...SIDE_BORDERS, background: 'linear-gradient(180deg,#1f74da,#0c47a4)', padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 9, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Avatar pic={s.myAvatar} size={48} status={s.myStatus} />
          <div style={{ position: 'absolute', bottom: -3, right: -3 }}><StatusIcon status={s.myStatus} size={15} /></div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={p.onToggleStatusPicker}
            onDoubleClick={p.onEditName}
            title="Click to change status, double-click to rename"
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: 13, textShadow: '1px 1px 1px rgba(0,0,0,.3)' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
              <RichText text={s.myName || 'You'} size={16} />
            </span>
            <span style={{ fontSize: 9, fontWeight: 'normal', color: '#cfe0f8' }}>({me.label})</span>
            <span style={{ fontSize: 8 }}>▼</span>
          </div>
          <div
            onClick={p.onEditPsm}
            style={{ color: '#aecaf0', fontSize: 10, fontStyle: 'italic', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {s.myPsm ? <RichText text={s.myPsm} size={13} /> : '<Type a personal message>'}
          </div>
        </div>
      </div>

      {/* status picker */}
      {s.statusPickerOpen && (
        <div style={{ position: 'absolute', left: 9, top: 99, width: 158, background: '#fff', border: '1px solid #7a93b8', boxShadow: '2px 3px 9px rgba(0,0,0,.3)', zIndex: 20, padding: '2px 0' }}>
          {PICKER_STATUSES.map((key) => (
            <div key={key} onClick={() => p.onPickStatus(key)} className="msn-statusopt" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', cursor: 'pointer', color: '#222' }}>
              <StatusIcon status={key} size={13} /> {statusOf(key).label}
            </div>
          ))}
        </div>
      )}

      {/* add-contact action */}
      <div style={{ ...SIDE_BORDERS, background: '#eef3fb', padding: '5px 9px', borderBottom: '1px solid #c0d0e8', display: 'flex', gap: 12 }}>
        <span className="msn-link" onClick={p.onAddContact} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13 }}>＋</span> Add a Contact
        </span>
      </div>

      {/* contact list */}
      <div className="msn-scroll" style={{ ...SIDE_BORDERS, background: '#fff', borderBottom: '1px solid #06387c', height: 300, overflowY: 'auto' }}>
        <div onClick={() => p.onToggleGroup('online')} style={{ ...GROUP_HEADER, borderBottom: '1px solid #dce6f3' }}>
          <span style={{ fontSize: 8, width: 8 }}>{s.onlineGroupOpen ? '▼' : '▶'}</span> Online ({online.length})
        </div>
        {s.onlineGroupOpen && online.map((c) => <ContactRow key={c.pubkey} contact={c} onOpen={() => p.onOpenChat(c.pubkey)} onRemove={() => p.onRemoveContact(c.pubkey)} />)}

        <div onClick={() => p.onToggleGroup('offline')} style={{ ...GROUP_HEADER, borderTop: '1px solid #dce6f3', borderBottom: '1px solid #dce6f3' }}>
          <span style={{ fontSize: 8, width: 8 }}>{s.offlineGroupOpen ? '▼' : '▶'}</span> Offline ({offline.length})
        </div>
        {s.offlineGroupOpen && offline.map((c) => <ContactRow key={c.pubkey} contact={c} onOpen={() => p.onOpenChat(c.pubkey)} onRemove={() => p.onRemoveContact(c.pubkey)} />)}

        {p.contacts.length === 0 && (
          <div style={{ padding: '14px 10px', color: '#8a93a0', fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
            Your buddy list is empty.<br />Click <b>Add a Contact</b> to follow someone by npub or NIP-05.
          </div>
        )}
      </div>

      {/* advertisement banner — the ever-present MSN promo strip */}
      <div style={{ ...SIDE_BORDERS, height: 56, background: 'linear-gradient(120deg,#ffd84d 0%,#ff9a2e 45%,#ff6a3d 100%)', borderTop: '1px solid #06387c', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', color: '#7a2a00', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
        <span style={{ fontSize: 24 }}>🦋</span>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: '#5a1e00', textShadow: '0 1px 0 rgba(255,255,255,.4)' }}>
            You're on <span style={{ color: '#c4002a' }}>Nostr</span>!
          </div>
          <div style={{ fontSize: 10 }}>Censorship-resistant · your keys, your contacts</div>
        </div>
        <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 8, color: '#8a3a00' }}>Ad</span>
      </div>

      {/* relay status footer — click to manage connections */}
      <div
        onClick={p.onOpenRelays}
        className="msn-link"
        title="Manage relays"
        style={{ background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)', border: '1px solid #06387c', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '5px 9px', display: 'flex', alignItems: 'center', gap: 6, color: '#1a4a9c', cursor: 'pointer' }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.relaySummary.connected > 0 ? '#3fb53f' : '#c83020', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }} />
        <span>{p.relaySummary.connected}/{p.relaySummary.total} relays connected</span>
      </div>
    </div>
  );
};
