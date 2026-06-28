// Alt+Tab-style window switcher for the desktop layout. Hold the switch
// modifier and tap the cycle key to fan the open windows out into a carousel;
// release the modifier to jump to the highlighted one (classic MRU behaviour —
// the first tap lands on the *previous* window, so a quick tap-and-release
// toggles between the two you use most).
//
// Platform combos (chosen so neither fights the OS or the browser):
//   • macOS — Option(⌥) + Tab. macOS leaves Alt+Tab unbound, so it's free.
//   • Windows / Linux — Alt + ` (backtick, the key right above Tab). Their
//     Alt+Tab belongs to the OS window switcher and Ctrl+Tab to the browser's
//     tab strip, so we shift one key up to the unclaimed backtick while keeping
//     the same "hold Alt, tap the key above Tab" muscle memory.

import { useEffect, useRef, useState } from 'react';
import type { StatusKey } from '../state/types';

/** One switchable desktop window (the buddy list or an open conversation). */
export interface SwitcherWindow {
  readonly id: string; // BUDDY_ID sentinel, or a contact pubkey
  readonly kind: 'buddy' | 'chat';
  readonly label: string;
  readonly status: StatusKey;
  readonly avatar: string;
  /** Last line of the transcript, shown as a preview ('' for none). */
  readonly snippet: string;
  readonly unread: boolean;
  /** Current stacking order; the highest is the focused window. */
  readonly z: number;
}

export interface SwitcherState {
  readonly active: boolean;
  /** Windows frozen in most-recently-used order when the overlay opened. */
  readonly items: readonly SwitcherWindow[];
  readonly index: number;
}

export interface WindowSwitcher extends SwitcherState {
  /** macOS uses Tab; everyone else uses backtick. Drives the on-screen hint. */
  readonly isMac: boolean;
  /** Highlight a card without committing (hover / arrow keys). */
  readonly select: (index: number) => void;
  /** Jump straight to the card at `index` and close (click to choose). */
  readonly pick: (index: number) => void;
  /** Jump to the highlighted window and close the overlay. */
  readonly commit: () => void;
  /** Close the overlay, leaving focus untouched. */
  readonly cancel: () => void;
}

const CLOSED: SwitcherState = { active: false, items: [], index: 0 };

const detectMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
};

/** MRU order: focused window first (highest z), so tap-one lands on previous. */
const byRecency = (windows: readonly SwitcherWindow[]): SwitcherWindow[] =>
  [...windows].sort((a, b) => b.z - a.z);

const wrap = (index: number, length: number): number => ((index % length) + length) % length;

export interface SwitcherOptions {
  /** Off when not on the desktop screen (sign-in, mobile) — listeners detach. */
  readonly enabled: boolean;
  readonly windows: readonly SwitcherWindow[];
  readonly onSelect: (id: string) => void;
}

export const useWindowSwitcher = ({ enabled, windows, onSelect }: SwitcherOptions): WindowSwitcher => {
  const [snap, setSnap] = useState<SwitcherState>(CLOSED);

  // Latest values for the imperative key handlers, which are bound once.
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const isMac = useRef(detectMac());

  useEffect(() => {
    if (!enabled) {
      setSnap(CLOSED);
      return;
    }

    const close = (): void => setSnap(CLOSED);
    const commit = (): void => {
      const { active, items, index } = snapRef.current;
      if (active && items[index]) onSelectRef.current(items[index].id);
      close();
    };
    const step = (delta: number): void =>
      setSnap((s) => (s.active && s.items.length ? { ...s, index: wrap(s.index + delta, s.items.length) } : s));

    const onKeyDown = (e: KeyboardEvent): void => {
      const cycle = isMac.current ? e.key === 'Tab' : e.code === 'Backquote';
      if (cycle && e.altKey) {
        const ordered = byRecency(windowsRef.current);
        if (ordered.length < 2) return; // nothing to switch between
        e.preventDefault();
        const back = e.shiftKey;
        setSnap((s) =>
          s.active
            ? { ...s, index: wrap(s.index + (back ? -1 : 1), s.items.length) }
            : { active: true, items: ordered, index: wrap(back ? -1 : 1, ordered.length) },
        );
        return;
      }
      if (!snapRef.current.active) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          step(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          step(-1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          commit();
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    };

    // Releasing the held modifier is the "select" gesture, mirroring the OS.
    const onKeyUp = (e: KeyboardEvent): void => {
      if (snapRef.current.active && e.key === 'Alt') {
        e.preventDefault();
        commit();
      }
    };
    // Lose the modifier-up event (tab-away, OS switcher) — bail without jumping.
    const onBlur = (): void => {
      if (snapRef.current.active) close();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);

  return {
    ...snap,
    isMac: isMac.current,
    select: (index) => setSnap((s) => (s.active ? { ...s, index } : s)),
    pick: (index) => {
      const { items } = snapRef.current;
      if (items[index]) onSelect(items[index].id);
      setSnap(CLOSED);
    },
    commit: () => {
      const { active, items, index } = snapRef.current;
      if (active && items[index]) onSelect(items[index].id);
      setSnap(CLOSED);
    },
    cancel: () => setSnap(CLOSED),
  };
};

export { byRecency as orderByRecency };
