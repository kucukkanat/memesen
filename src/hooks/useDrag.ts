// Window dragging that stays clamped inside the desktop. Mirrors the original
// behaviour: grab anywhere on a title bar, move the closest `[data-win]` host.

import { useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { clamp } from '../state/helpers';

export interface Position {
  readonly top: number;
  readonly left: number;
}

export type StartDrag = (e: ReactMouseEvent, onMove: (pos: Position) => void) => void;

export const useDrag = (): StartDrag =>
  useCallback((e, onMove) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const win = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-win]');
    const container = win?.offsetParent ?? win?.parentElement;
    if (!win || !container) return;

    const cRect = container.getBoundingClientRect();
    const wRect = win.getBoundingClientRect();
    const offsetX = e.clientX - wRect.left;
    const offsetY = e.clientY - wRect.top;
    const maxLeft = Math.max(0, cRect.width - wRect.width);
    const maxTop = Math.max(0, cRect.height - wRect.height);

    const move = (ev: MouseEvent): void => {
      onMove({
        left: clamp(ev.clientX - cRect.left - offsetX, 0, maxLeft),
        top: clamp(ev.clientY - cRect.top - offsetY, 0, maxTop),
      });
    };
    const up = (): void => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, []);
