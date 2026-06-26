// Bottom-right corner resizing, clamped to the desktop. Mirrors useDrag: grab
// the grip, grow the closest `[data-win]` host from its fixed top-left corner.

import { useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { clamp } from '../state/helpers';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export type StartResize = (e: ReactMouseEvent, min: Size, onResize: (size: Size) => void) => void;

export const useResize = (): StartResize =>
  useCallback((e, min, onResize) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const win = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-win]');
    const container = win?.offsetParent ?? win?.parentElement;
    if (!win || !container) return;

    const cRect = container.getBoundingClientRect();
    const wRect = win.getBoundingClientRect();
    // Cap so the window can't grow past the desktop's right/bottom edges.
    const maxWidth = Math.max(min.width, cRect.right - wRect.left);
    const maxHeight = Math.max(min.height, cRect.bottom - wRect.top);

    const move = (ev: MouseEvent): void => {
      onResize({
        width: clamp(ev.clientX - wRect.left, min.width, maxWidth),
        height: clamp(ev.clientY - wRect.top, min.height, maxHeight),
      });
    };
    const up = (): void => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, []);
