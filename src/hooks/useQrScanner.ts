// Camera-based QR scanning for the "move my account to this phone" flow.
// `@paulmillr/qr/dom` owns the hard parts — getUserMedia, the rear-camera
// pick, the per-frame decode — so this hook is just a React lifecycle wrapper:
// start on mount, hand decoded text to `onResult`, stop the camera on unmount.

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { frontalCamera, QRCanvas, frameLoop } from '@paulmillr/qr/dom.js';

/** Turn a getUserMedia failure into something a non-technical user can act on. */
const cameraError = (err: unknown): string => {
  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera access was blocked. Allow the camera and try again, or paste your key below instead.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return "We couldn't find a camera on this device. Paste your key or recovery phrase below instead.";
  if (typeof navigator === 'undefined' || !navigator.mediaDevices)
    return 'This browser can’t open the camera here. Paste your key or recovery phrase below instead.';
  return "We couldn't start the camera. Paste your key or recovery phrase below instead.";
};

export interface QrScanner {
  /** Attach to a `<video autoPlay playsInline muted>` element. */
  readonly videoRef: RefObject<HTMLVideoElement>;
  /** A friendly, actionable message when the camera can't be used. */
  readonly error: string | null;
}

/**
 * Stream the rear camera into `videoRef` and call `onResult` with the first
 * QR payload decoded. `active` gates the camera so it only runs while the
 * scanner view is visible (and releases the device the moment it isn't).
 */
export const useQrScanner = (active: boolean, onResult: (text: string) => void): QrScanner => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Keep the latest callback without re-running the camera effect.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;
    setError(null);

    let stopped = false;
    let stopCamera: (() => void) | null = null;
    let cancelLoop: (() => void) | null = null;
    const canvas = new QRCanvas();

    void (async () => {
      try {
        const camera = await frontalCamera(video);
        if (stopped) { camera.stop(); return; }
        stopCamera = () => camera.stop();
        cancelLoop = frameLoop(() => {
          let result: string | undefined;
          try {
            result = camera.readFrame(canvas);
          } catch {
            return; // a frame the decoder couldn't read — try the next one
          }
          if (result) onResultRef.current(result);
        });
      } catch (err) {
        if (!stopped) setError(cameraError(err));
      }
    })();

    return () => {
      stopped = true;
      cancelLoop?.();
      stopCamera?.();
    };
  }, [active]);

  return { videoRef, error };
};
