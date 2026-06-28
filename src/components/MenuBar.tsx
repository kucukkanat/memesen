import { useEffect, useRef, useState } from 'react';
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
  position: 'absolute',
  top: '100%',
  left: 0,
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

const Dropdown = ({ items, onClose }: { items: readonly MenuNode[]; onClose: () => void }) => {
  // Which submenu (by index) is currently flown out.
  const [openSub, setOpenSub] = useState<number | null>(null);
  return (
    <div style={DROPDOWN} onMouseDown={(e) => e.stopPropagation()}>
      {items.map((node, i) => {
        if (node.kind === 'separator') return <div key={i} style={SEPARATOR} />;
        if (node.kind === 'submenu') {
          return (
            <div
              key={i}
              style={{ position: 'relative' }}
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub((cur) => (cur === i ? null : cur))}
            >
              <div className="msn-menuitem" style={{ ...ROW, justifyContent: 'space-between' }}>
                <span>{node.label}</span>
                <span style={{ fontSize: 9 }}>▶</span>
              </div>
              {openSub === i && (
                <div style={{ position: 'absolute', top: -3, left: '100%' }}>
                  <Dropdown items={node.items} onClose={onClose} />
                </div>
              )}
            </div>
          );
        }
        const disabled = node.disabled === true;
        return (
          <div
            key={i}
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
  const [open, setOpen] = useState<number | null>(null);
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
    <div ref={barRef} style={{ ...MENU_BAR, position: 'relative', ...style }}>
      {menus.map((menu, i) => (
        <div key={menu.label} style={{ position: 'relative' }}>
          <span
            className="msn-link"
            // Once a menu is open, sliding across the bar switches menus — the
            // hallmark of a real Win32 menu bar.
            onMouseDown={(e) => {
              e.stopPropagation();
              setOpen((cur) => (cur === i ? null : i));
            }}
            onMouseEnter={() => setOpen((cur) => (cur === null ? cur : i))}
            style={{ background: open === i ? '#316ac5' : undefined, color: open === i ? '#fff' : undefined, padding: '0 4px', borderRadius: 2 }}
          >
            <Label text={menu.label} access={menu.access} />
          </span>
          {open === i && <Dropdown items={menu.items} onClose={() => setOpen(null)} />}
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
