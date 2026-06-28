import type { StatusKey } from '../state/types';
import { Butterfly, StatusIcon } from '../assets/icons';
import { Avatar } from '../assets/avatars';
import { RichText } from '../assets/emoticons';
import { useIsMobile, MOBILE_NAV_H } from '../hooks/useIsMobile';

export type ToastSeverity = 'info' | 'warning' | 'error';

interface ToastBase {
  readonly id: number;
  /**
   * Optional stable key. Pushing another toast with the same key replaces the
   * existing one rather than stacking — used for the single, sticky connection
   * banner so it updates in place ("reconnecting…" -> "back online") instead of
   * piling up a new toast every time the relay state flips.
   */
  readonly key?: string;
}

/**
 * A toast is one of two shapes. A `contact` toast is the classic MSN buddy alert
 * (display picture + presence dot + "sent you a message"); an `alert` toast is a
 * reusable, severity-tinted system notice (connection problems, copy confirmed,
 * anything else the app needs to surface). Both wear the same blue MSN chrome.
 */
export type Toast =
  | (ToastBase & {
      readonly kind?: 'contact';
      readonly title: string;
      readonly body: string;
      readonly status: StatusKey;
      readonly avatar: string;
    })
  | (ToastBase & {
      readonly kind: 'alert';
      readonly severity: ToastSeverity;
      readonly title: string;
      readonly body: string;
    });

/**
 * A toast minus its assigned id, for callers that push one. A plain
 * `Omit<Toast, 'id'>` would collapse the union to its shared keys (dropping
 * `status`/`severity`); distributing the omit keeps each variant intact.
 */
export type ToastInput = Toast extends infer T ? (T extends Toast ? Omit<T, 'id'> : never) : never;

export interface AlertVisual {
  readonly icon: string;
  readonly bg: string;
  readonly accent: string;
}

/** The icon + colours for an alert toast's body, keyed by severity. */
export const alertVisual = (severity: ToastSeverity): AlertVisual => {
  switch (severity) {
    case 'error':
      return { icon: '⛔', bg: 'linear-gradient(180deg,#fff1ef,#ffd9d3)', accent: '#9c2a14' };
    case 'warning':
      return { icon: '⚠️', bg: 'linear-gradient(180deg,#fffbe0,#ffe9a8)', accent: '#7a5a14' };
    case 'info':
      return { icon: 'ℹ️', bg: 'linear-gradient(180deg,#fbfdff,#dfeaf8)', accent: '#0a3a8c' };
  }
};

export interface ToastStackProps {
  readonly toasts: readonly Toast[];
  readonly onDismiss: (id: number) => void;
}

/** The MSN alert that slides up from the bottom-right corner of the screen. */
export const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => {
  const mobile = useIsMobile();
  return (
    <div
      style={{
        position: 'fixed',
        right: 8,
        // Sit clear of the bottom nav on phones, the taskbar on desktop.
        bottom: mobile ? `calc(${MOBILE_NAV_H}px + var(--safe-bottom) + 8px)` : 42,
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
          {t.kind === 'alert' ? <AlertBody toast={t} /> : <ContactBody toast={t} />}
        </div>
      ))}
    </div>
  );
};

const ContactBody = ({ toast: t }: { toast: Extract<Toast, { kind?: 'contact' }> }) => (
  <div style={{ background: 'linear-gradient(180deg,#fbfdff,#dfeaf8)', padding: '8px 9px', display: 'flex', alignItems: 'center', gap: 9 }}>
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
);

const AlertBody = ({ toast: t }: { toast: Extract<Toast, { kind: 'alert' }> }) => {
  const v = alertVisual(t.severity);
  return (
    <div style={{ background: v.bg, padding: '8px 9px', display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ flexShrink: 0, fontSize: 20, lineHeight: 1 }}>{v.icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: v.accent, fontWeight: 'bold', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.title}
        </div>
        <div style={{ color: '#444', fontSize: 11 }}>{t.body}</div>
      </div>
    </div>
  );
};
