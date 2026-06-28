import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CLOSE_BTN, SIDE_BORDERS, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly } from '../assets/icons';
import { useIsMobile } from '../hooks/useIsMobile';

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

// Mount order of open modals. ESC only dismisses the last-opened one, so stacked
// dialogs peel off one at a time instead of all closing at once.
const escStack: symbol[] = [];

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
  /** Test id applied to the modal card for targeting in tests. */
  readonly testId?: string;
}

/**
 * Reusable Luna/XP "Blue" modal: a butterfly title bar, white body and an
 * optional footer, floated over a dimming backdrop that guarantees it renders
 * on top of every other window. All app dialogs are built on this.
 */
export const Modal = (p: ModalProps) => {
  const mobile = useIsMobile();

  // ESC closes the modal — the XP-standard "Cancel" gesture. A ref keeps the
  // latest onClose so the listener can register once for the modal's lifetime
  // (onClose is often an inline arrow, recreated each render). Guarding on the
  // top of the stack means a keypress only dismisses the frontmost dialog.
  const onCloseRef = useRef(p.onClose);
  onCloseRef.current = p.onClose;
  useEffect(() => {
    const token = Symbol();
    escStack.push(token);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || escStack[escStack.length - 1] !== token) return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = escStack.indexOf(token);
      if (i !== -1) escStack.splice(i, 1);
    };
  }, []);

  // On phones the dialog can't float at a fixed pixel width: it grows to (nearly)
  // the full width, caps its height to the visible viewport and lets the body
  // scroll, so even a tall form (Display Picture, Connection) stays reachable
  // with the footer buttons pinned. The desktop dialog is unchanged.
  const backdrop: CSSProperties = mobile
    ? { ...BACKDROP, padding: 'max(10px, var(--safe-top)) 10px max(10px, var(--safe-bottom))' }
    : BACKDROP;
  const card: CSSProperties = mobile
    ? { width: '100%', maxWidth: 440, maxHeight: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 38px rgba(0,0,0,.5)' }
    : { width: p.width ?? 340, boxShadow: '0 12px 38px rgba(0,0,0,.5)' };
  const body: CSSProperties = mobile
    ? { ...SIDE_BORDERS, background: '#fff', borderBottom: '1px solid #06387c', overflowY: 'auto', flex: 1, minHeight: 0 }
    : { ...SIDE_BORDERS, background: '#fff', borderBottom: '1px solid #06387c' };

  return (
    <div
      style={backdrop}
      onMouseDown={(e) => {
        if (p.dismissOnBackdrop && e.target === e.currentTarget) p.onClose();
      }}
    >
      <div style={card} data-testid={p.testId}>
        <div style={{ ...TITLE_BAR, flexShrink: 0 }}>
          <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
          <span style={TITLE_TEXT}>{p.title}</span>
          <div data-testid="modal-close-button" onClick={p.onClose} style={{ ...CLOSE_BTN, width: mobile ? 26 : 19, height: mobile ? 22 : 17, fontSize: mobile ? 12 : 10 }}>✕</div>
        </div>

        <div style={body}>{p.children}</div>

        {p.footer !== undefined && <div style={{ ...FOOTER_BAR, flexShrink: 0 }}>{p.footer}</div>}
      </div>
    </div>
  );
};
