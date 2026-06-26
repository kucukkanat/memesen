// Real MSN default display pictures + the status-coloured avatar frames.
import type { CSSProperties } from 'react';
import type { StatusKey } from '../state/types';
import beach from './msn/avatars/beach.png';
import chess from './msn/avatars/chess.png';
import dog from './msn/avatars/dog.png';
import duck from './msn/avatars/duck.png';
import flower from './msn/avatars/flower.png';
import horses from './msn/avatars/horses.png';
import moto from './msn/avatars/moto.png';
import msn from './msn/avatars/msn.png';
import palm from './msn/avatars/palm.png';
import rocket from './msn/avatars/rocket.png';
import skate from './msn/avatars/skate.png';
import soccer from './msn/avatars/soccer.png';

import frameOnlineS from './msn/status/status_frame_online_small.png';
import frameOnlineL from './msn/status/status_frame_online_large.png';
import frameBusyS from './msn/status/status_frame_busy_small.png';
import frameBusyL from './msn/status/status_frame_busy_large.png';
import frameAwayS from './msn/status/status_frame_away_small.png';
import frameAwayL from './msn/status/status_frame_away_large.png';
import frameOfflineS from './msn/status/status_frame_offline_small.png';
import frameOfflineL from './msn/status/status_frame_offline_large.png';

const PICTURES: Readonly<Record<string, string>> = {
  beach, chess, dog, duck, flower, horses, moto, msn, palm, rocket, skate, soccer,
};

/** The default display picture used when a contact has no avatar key set. */
export const DEFAULT_PICTURE = 'msn';

const FRAME: Readonly<Record<StatusKey, readonly [string, string]>> = {
  online: [frameOnlineS, frameOnlineL],
  busy: [frameBusyS, frameBusyL],
  away: [frameAwayS, frameAwayL],
  invisible: [frameOfflineS, frameOfflineL],
  offline: [frameOfflineS, frameOfflineL],
};

export interface AvatarProps {
  readonly pic: string;
  readonly size?: number;
  /** When set, draws the matching status-coloured MSN frame around the picture. */
  readonly status?: StatusKey;
  readonly style?: CSSProperties;
}

export const Avatar = ({ pic, size = 24, status, style }: AvatarProps): JSX.Element => {
  const src = PICTURES[pic] ?? PICTURES[DEFAULT_PICTURE] ?? msn;
  const framed = status !== undefined;
  const frame = framed ? (size >= 44 ? FRAME[status][1] : FRAME[status][0]) : undefined;
  // The frame bitmap is a border with a transparent centre; inset the picture
  // so the coloured edge sits cleanly around it.
  const pad = framed ? Math.round(size * 0.1) : 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
      <img
        src={src}
        alt={pic}
        draggable={false}
        style={{
          position: 'absolute',
          inset: pad,
          width: size - pad * 2,
          height: size - pad * 2,
          objectFit: 'cover',
          borderRadius: framed ? 2 : 3,
          background: '#fff',
        }}
      />
      {frame && (
        <img
          src={frame}
          alt=""
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: size, height: size, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
};
