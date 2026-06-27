import { useMemo } from 'react';
import encodeQR from '@paulmillr/qr';

export interface QrCodeProps {
  /** The text the QR encodes — here, an `nsec…` for the account handoff. */
  readonly text: string;
  /** Rendered side length in px (the SVG scales to fill). */
  readonly size: number;
}

/**
 * A crisp, dependency-light QR code. `@paulmillr/qr` returns an SVG string we
 * drop in directly (it's our own generated, trusted markup) and a CSS rule
 * stretches it to `size`. Medium error-correction keeps it scannable from a
 * phone screen even with a little glare.
 */
export const QrCode = ({ text, size }: QrCodeProps) => {
  const svg = useMemo(() => encodeQR(text, 'svg', { ecc: 'medium', border: 1 }), [text]);
  return (
    <div
      className="msn-qr"
      style={{ width: size, height: size, background: '#fff', padding: 8, border: '1px solid #9bb0d0', borderRadius: 3 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
