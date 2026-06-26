// Shared inline-style fragments for the Luna/XP "Blue" window chrome, so the
// recurring gradients are defined once and read the same everywhere.

import type { CSSProperties } from 'react';

export const TITLE_BAR: CSSProperties = {
  height: 24,
  background: 'linear-gradient(180deg,#2d8bf5,#0a5fd6 50%,#0a52c4)',
  borderRadius: '7px 7px 0 0',
  display: 'flex',
  alignItems: 'center',
  padding: '0 4px 0 8px',
  border: '1px solid #06387c',
  borderBottom: 'none',
};

export const TITLE_TEXT: CSSProperties = {
  color: '#fff',
  fontWeight: 'bold',
  flex: 1,
  textShadow: '1px 1px 1px rgba(0,0,0,.4)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const CLOSE_BTN: CSSProperties = {
  width: 21,
  height: 18,
  background: 'linear-gradient(180deg,#e8806a,#c83020)',
  border: '1px solid #fff',
  borderRadius: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: 11,
  cursor: 'pointer',
};

export const SIDE_BORDERS: CSSProperties = {
  borderLeft: '1px solid #06387c',
  borderRight: '1px solid #06387c',
};

export const MENU_BAR: CSSProperties = {
  ...SIDE_BORDERS,
  background: '#ece9d8',
  display: 'flex',
  gap: 13,
  padding: '3px 9px',
  color: '#222',
};

export const GREEN_BTN: CSSProperties = {
  fontFamily: 'Tahoma, sans-serif',
  fontSize: 11,
  fontWeight: 'bold',
  color: '#1a4a1a',
  background: 'linear-gradient(180deg,#e4f6cf,#a9d97c 48%,#84c450)',
  border: '1px solid #5a8a30',
  borderRadius: 3,
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 #fff',
};

export const FOOTER: CSSProperties = {
  background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)',
  border: '1px solid #06387c',
  borderTop: 'none',
  borderRadius: '0 0 4px 4px',
  padding: '4px 9px',
};
