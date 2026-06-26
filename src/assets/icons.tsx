// Real MSN brand + presence bitmaps, bundled by Bun.
import type { StatusKey } from '../state/types';
import butterfly from './msn/emoticons/messenger.png';
import onlineDot from './msn/status/online-dot.png';
import busyDot from './msn/status/busy-dot.png';
import awayDot from './msn/status/away-dot.png';
import offlineDot from './msn/status/offline-dot.png';

export interface ButterflyProps {
  readonly size?: number;
  /** Kept for API compatibility; the real bitmap is the four-colour butterfly. */
  readonly variant?: 'blue' | 'color';
}

/** The MSN Messenger butterfly. */
export const Butterfly = ({ size = 16 }: ButterflyProps): JSX.Element => (
  <img src={butterfly} alt="MSN" width={size} height={size} draggable={false} style={{ verticalAlign: 'middle' }} />
);

const DOT: Readonly<Record<StatusKey, string>> = {
  online: onlineDot,
  busy: busyDot,
  away: awayDot,
  invisible: offlineDot,
  offline: offlineDot,
};

export interface StatusIconProps {
  readonly status: StatusKey;
  readonly size?: number;
}

/** The little glossy presence dot (green online, red busy, amber away, grey offline). */
export const StatusIcon = ({ status, size = 12 }: StatusIconProps): JSX.Element => (
  <img src={DOT[status]} alt={status} width={size} height={size} draggable={false} style={{ verticalAlign: 'middle' }} />
);
