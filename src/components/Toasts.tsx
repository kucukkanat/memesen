import type { StatusKey } from '../state/types';
import { Butterfly, StatusIcon } from '../assets/icons';
import { Avatar } from '../assets/avatars';
import { RichText } from '../assets/emoticons';

export interface Toast {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly status: StatusKey;
  readonly avatar: string;
}

export interface ToastStackProps {
  readonly toasts: readonly Toast[];
  readonly onDismiss: (id: number) => void;
}

/** The MSN alert that slides up from the bottom-right corner of the screen. */
export const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => (
  <div
    style={{
      position: 'fixed',
      right: 8,
      bottom: 42,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 6,
      zIndex: 40,
      pointerEvents: 'none',
    }}
  >
    {toasts.map((t) => (
      <div
        key={t.id}
        onClick={() => onDismiss(t.id)}
        style={{
          width: 218,
          pointerEvents: 'auto',
          cursor: 'pointer',
          borderRadius: '7px 7px 4px 4px',
          boxShadow: '0 6px 22px rgba(0,0,0,.45)',
          animation: 'msn-toast 0.32s cubic-bezier(.2,.9,.3,1.2)',
          overflow: 'hidden',
          border: '1px solid #06387c',
        }}
      >
        <div
          style={{
            height: 20,
            background: 'linear-gradient(180deg,#2d8bf5,#0a5fd6 55%,#0a52c4)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 5px',
          }}
        >
          <Butterfly size={13} />
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 11, flex: 1, textShadow: '1px 1px 1px rgba(0,0,0,.4)' }}>
            MSN Messenger
          </span>
          <span style={{ color: '#fff', fontSize: 10, opacity: 0.85 }}>✕</span>
        </div>
        <div
          style={{
            background: 'linear-gradient(180deg,#fbfdff,#dfeaf8)',
            padding: '8px 9px',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0, width: 30, height: 30 }}>
            <Avatar pic={t.avatar} size={30} />
            <span style={{ position: 'absolute', bottom: -3, right: -3 }}>
              <StatusIcon status={t.status} size={12} />
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#0a3a8c', fontWeight: 'bold', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <RichText text={t.title} size={13} />
            </div>
            <div style={{ color: '#444', fontSize: 11 }}>{t.body}</div>
          </div>
        </div>
      </div>
    ))}
  </div>
);
