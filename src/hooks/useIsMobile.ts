// One source of truth for "are we on a phone-sized screen?". Everything mobile
// branches on this. It's reactive (re-renders on resize / orientation change)
// and safe to call where `window` is absent (tests, SSR) — it just reports
// desktop there, so the desktop render path is the default and stays untouched.

import { useSyncExternalStore } from 'react';

/** Phones and small tablets in portrait. Above this we keep the desktop UI. */
export const MOBILE_QUERY = '(max-width: 760px)';

/** Height of the touch bottom-nav (the mobile reincarnation of the taskbar). */
export const MOBILE_NAV_H = 50;

const subscribe = (cb: () => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};

const getSnapshot = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;

/** `true` on phone-sized viewports; drives the touch-first layout. */
export const useIsMobile = (): boolean => useSyncExternalStore(subscribe, getSnapshot, () => false);
