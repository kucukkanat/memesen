import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { MENU_BAR } from '../ui/chrome';

// A faithful early-2000s Windows menu bar: click a top-level title to drop its
// menu, then slide across the bar to switch menus without re-clicking (classic
// Win32 behaviour). Items run their action and close; submenus fly out to the
// side on hover. Outside-click and Escape close everything. This replaces the
// old no-op <span> menu titles with something that actually does things.

/** A single row inside a dropdown. */
export type MenuNode =
  | {
      readonly kind: 'item';
      readonly label: string;
      readonly onClick: () => void;
      /** Greyed and unclickable when true (e.g. an action with no valid target). */
      readonly disabled?: boolean;
      /** Right-aligned hint, e.g. a shortcut or a value preview. */
      readonly hint?: string;
    }
  | { readonly kind: 'separator' }
  | { readonly kind: 'submenu'; readonly label: string; readonly items: readonly MenuNode[] };

/** A top-level menu, e.g. File / Edit / Help. */
export interface MenuDef {
  readonly label: string;
  /** The access character to underline (first matching letter in the label). */
  readonly access?: string;
  readonly items: readonly MenuNode[];
}

export interface MenuBarProps {
  readonly menus: readonly MenuDef[];
  /** Extra styles merged onto the MENU_BAR container (alignment, etc.). */
  readonly style?: CSSProperties;
  /** Rendered flush-right on the bar — e.g. the msn wordmark in the chat window. */
  readonly trailing?: ReactNode;
}

const DROPDOWN: CSSProperties = {
  position: 'fixed',
  minWidth: 168,
  background: '#fff',
  border: '1px solid #8a9bb5',
  boxShadow: '2px 2px 6px rgba(0,0,0,.35)',
  padding: '2px',
  zIndex: 50,
  color: '#000',
  fontSize: 11,
  cursor: 'default',
};

/** Keep menus this far inside the window edges. */
const EDGE_MARGIN = 4;

/** The screen rectangle a menu is anchored to (a trigger or a submenu row). */
interface Anchor {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const anchorOf = (el: HTMLElement): Anchor => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};

/**
 * Place a `fixed` dropdown so it never spills past the application window:
 * it drops below (or flies right of) its anchor, then flips to the opposite
 * side or clamps to the edge when there isn't room. Measured after layout but
 * before paint, so the menu only ever appears in its final, on-screen spot.
 */
const useFitInWindow = (anchor: Anchor, side: 'below' | 'right') => {
  const ref = useRef<HTMLDivElement>(null);
  const initial = side === 'below' ? { left: anchor.left, top: anchor.bottom } : { left: anchor.right, top: anchor.top - 3 };
  const [pos, setPos] = useState(initial);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = side === 'below' ? anchor.left : anchor.right;
    let top = side === 'below' ? anchor.bottom : anchor.top - 3;

    // Horizontal: a submenu with no room on the right flips to the left of its
    // parent; a top-level menu that runs off the right slides back in.
    if (side === 'right' && left + width > vw - EDGE_MARGIN) left = anchor.left - width;
    if (left + width > vw - EDGE_MARGIN) left = vw - EDGE_MARGIN - width;
    if (left < EDGE_MARGIN) left = EDGE_MARGIN;

    // Vertical: a top-level menu with no room below pops above its trigger;
    // otherwise (and for submenus) clamp within the window.
    if (side === 'below' && top + height > vh - EDGE_MARGIN && anchor.top - height >= EDGE_MARGIN) top = anchor.top - height;
    if (top + height > vh - EDGE_MARGIN) top = vh - EDGE_MARGIN - height;
    if (top < EDGE_MARGIN) top = EDGE_MARGIN;

    setPos((cur) => (cur.left === left && cur.top === top ? cur : { left, top }));
  }, [anchor.left, anchor.top, anchor.right, anchor.bottom, side]);

  return { ref, pos };
};

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '3px 22px 3px 22px',
  whiteSpace: 'nowrap',
  borderRadius: 2,
};

const SEPARATOR: CSSProperties = { height: 1, background: '#d6dbe5', margin: '3px 2px' };

/** Underline the access character (first case-insensitive match), Win32-style. */
const Label = ({ text, access }: { text: string; access: string | undefined }): ReactNode => {
  if (!access) return text;
  const i = text.toLowerCase().indexOf(access.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <u>{text[i]}</u>
      {text.slice(i + 1)}
    </>
  );
};

const Dropdown = ({ items, onClose, anchor, side }: { items: readonly MenuNode[]; onClose: () => void; anchor: Anchor; side: 'below' | 'right' }) => {
  // Which submenu (by index) is currently flown out, and the row it anchors to.
  const [openSub, setOpenSub] = useState<{ index: number; anchor: Anchor } | null>(null);
  const { ref, pos } = useFitInWindow(anchor, side);
  return (
    <div ref={ref} data-testid="menubar-menu" style={{ ...DROPDOWN, left: pos.left, top: pos.top }} onMouseDown={(e) => e.stopPropagation()}>
      {items.map((node, i) => {
        if (node.kind === 'separator') return <div key={i} data-testid="menubar-menu-separator" style={SEPARATOR} />;
        if (node.kind === 'submenu') {
          return (
            <div
              key={i}
              style={{ position: 'relative' }}
              onMouseEnter={(e) => setOpenSub({ index: i, anchor: anchorOf(e.currentTarget) })}
              onMouseLeave={() => setOpenSub((cur) => (cur?.index === i ? null : cur))}
            >
              <div data-testid="menubar-menu-item" className="msn-menuitem" style={{ ...ROW, justifyContent: 'space-between' }}>
                <span>{node.label}</span>
                <span style={{ fontSize: 9 }}>▶</span>
              </div>
              {openSub?.index === i && (
                // Fixed-positioned, so it stays a DOM child (hover stays open)
                // while being laid out against the window, not this menu.
                <Dropdown items={node.items} onClose={onClose} anchor={openSub.anchor} side="right" />
              )}
            </div>
          );
        }
        const disabled = node.disabled === true;
        return (
          <div
            key={i}
            data-testid="menubar-menu-item"
            className={disabled ? undefined : 'msn-menuitem'}
            style={{ ...ROW, justifyContent: 'space-between', color: disabled ? '#9aa0ab' : '#000', cursor: disabled ? 'default' : 'pointer' }}
            onClick={
              disabled
                ? undefined
                : () => {
                    node.onClick();
                    onClose();
                  }
            }
          >
            <span>{node.label}</span>
            {node.hint && <span style={{ color: disabled ? '#b3b8c2' : '#6a7180', fontSize: 10 }}>{node.hint}</span>}
          </div>
        );
      })}
    </div>
  );
};

export const MenuBar = ({ menus, style, trailing }: MenuBarProps) => {
  // The open top-level menu, with the screen rect of its trigger to anchor to.
  const [open, setOpen] = useState<{ index: number; anchor: Anchor } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close on click anywhere outside the bar, and on Escape.
  useEffect(() => {
    if (open === null) return;
    const onDown = (e: MouseEvent): void => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={barRef} data-testid="menubar-root" style={{ ...MENU_BAR, position: 'relative', ...style }}>
      {menus.map((menu, i) => (
        <div key={menu.label} style={{ position: 'relative' }}>
          <span
            data-testid="menubar-menu-trigger"
            className="msn-link"
            // Once a menu is open, sliding across the bar switches menus — the
            // hallmark of a real Win32 menu bar.
            onMouseDown={(e) => {
              e.stopPropagation();
              const anchor = anchorOf(e.currentTarget);
              setOpen((cur) => (cur?.index === i ? null : { index: i, anchor }));
            }}
            onMouseEnter={(e) => {
              const anchor = anchorOf(e.currentTarget);
              setOpen((cur) => (cur === null ? cur : { index: i, anchor }));
            }}
            style={{ background: open?.index === i ? '#316ac5' : undefined, color: open?.index === i ? '#fff' : undefined, padding: '0 4px', borderRadius: 2 }}
          >
            <Label text={menu.label} access={menu.access} />
          </span>
          {open?.index === i && <Dropdown items={menu.items} onClose={() => setOpen(null)} anchor={open.anchor} side="below" />}
        </div>
      ))}
      {trailing && (
        <>
          <span style={{ flex: 1 }} />
          {trailing}
        </>
      )}
    </div>
  );
};
