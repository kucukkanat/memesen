import type { CSSProperties, ReactNode } from 'react';
import { CLOSE_BTN, SIDE_BORDERS, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly } from '../assets/icons';

// The dimmed backdrop sits above *every* window. Chat windows use an
// incrementing z (starting ~30) that would otherwise cover a fixed-z dialog,
// and the taskbar (30) / toasts (40) live below this too — so a modal always
// wins and blocks interaction with whatever is behind it.
const BACKDROP: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(11,30,60,.34)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const FOOTER_BAR: CSSProperties = {
  background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)',
  border: '1px solid #06387c',
  borderTop: 'none',
  borderRadius: '0 0 4px 4px',
  padding: '8px 12px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

export interface ModalProps {
  readonly title: string;
  /** Body content. Supply its own padding — RelayManager wants none, forms want 14/16. */
  readonly children: ReactNode;
  /** Footer buttons. Omit for a body-only modal. */
  readonly footer?: ReactNode;
  readonly onClose: () => void;
  readonly width?: number;
  /** Dismiss by clicking the dimmed backdrop (default false — XP dialogs are modal). */
  readonly dismissOnBackdrop?: boolean;
}

/**
 * Reusable Luna/XP "Blue" modal: a butterfly title bar, white body and an
 * optional footer, floated over a dimming backdrop that guarantees it renders
 * on top of every other window. All app dialogs are built on this.
 */
export const Modal = (p: ModalProps) => (
  <div
    style={BACKDROP}
    onMouseDown={(e) => {
      if (p.dismissOnBackdrop && e.target === e.currentTarget) p.onClose();
    }}
  >
    <div style={{ width: p.width ?? 340, boxShadow: '0 12px 38px rgba(0,0,0,.5)' }}>
      <div style={TITLE_BAR}>
        <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
        <span style={TITLE_TEXT}>{p.title}</span>
        <div onClick={p.onClose} style={{ ...CLOSE_BTN, width: 19, height: 17, fontSize: 10 }}>✕</div>
      </div>

      <div style={{ ...SIDE_BORDERS, background: '#fff', borderBottom: '1px solid #06387c' }}>{p.children}</div>

      {p.footer !== undefined && <div style={FOOTER_BAR}>{p.footer}</div>}
    </div>
  </div>
);
