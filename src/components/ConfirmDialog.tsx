import type { ReactNode } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly message: ReactNode;
  readonly confirmLabel?: string;
  /** Cancel button label, or `null` to hide it (turns this into an alert/OK box). */
  readonly cancelLabel?: string | null;
  readonly icon?: 'warning' | 'info';
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** The classic XP warning triangle — yellow shield, black exclamation. */
const WarningIcon = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ flexShrink: 0 }}>
    <path d="M16 2 L31 29 H1 Z" fill="#ffd33a" stroke="#caa400" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="14.5" y="11" width="3" height="9" rx="1.5" fill="#3a2e00" />
    <circle cx="16" cy="24.5" r="1.8" fill="#3a2e00" />
  </svg>
);

/** The XP information icon — blue disc, white "i". */
const InfoIcon = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ flexShrink: 0 }}>
    <circle cx="16" cy="16" r="14" fill="#2d8bf5" stroke="#0a52c4" strokeWidth="1.5" />
    <circle cx="16" cy="9.5" r="2" fill="#fff" />
    <rect x="14.3" y="13.5" width="3.4" height="10" rx="1.7" fill="#fff" />
  </svg>
);

/**
 * A Windows XP-style message box for gating destructive actions (warning icon +
 * Yes/No) or surfacing notices (info icon + OK, via `cancelLabel: null`). Built
 * on {@link Modal}, so it always renders above every window.
 */
export const ConfirmDialog = (p: ConfirmDialogProps) => {
  const Icon = p.icon === 'info' ? InfoIcon : WarningIcon;
  return (
    <Modal title={p.title} width={332} onClose={p.onCancel} footer={
      <>
        {p.cancelLabel !== null && (
          <button onClick={p.onCancel} style={{ ...GREEN_BTN, padding: '5px 18px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>
            {p.cancelLabel ?? 'No'}
          </button>
        )}
        <button onClick={p.onConfirm} style={{ ...GREEN_BTN, padding: '5px 20px' }}>{p.confirmLabel ?? 'Yes'}</button>
      </>
    }>
      <div style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <Icon />
        <div style={{ color: '#333', fontSize: 11, lineHeight: 1.5, paddingTop: 2 }}>{p.message}</div>
      </div>
    </Modal>
  );
};
