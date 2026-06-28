import { useCallback, useRef, useState } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { useQrScanner } from '../hooks/useQrScanner';
import { Modal } from './Modal';

export interface ImportAccountProps {
  /**
   * Try to import the pasted/scanned secret. Returns a friendly error string to
   * show, or null on success (the parent then signs in and closes this dialog).
   */
  readonly onImport: (secret: string) => string | null;
  readonly onClose: () => void;
}

/**
 * "Move or import an account": the receiving end of the handoff. Scanning a QR
 * from another signed-in device is the headline path on a phone; pasting an
 * `nsec…` or recovery phrase is always available as the fallback.
 */
export const ImportAccount = (p: ImportAccountProps) => {
  const [scanning, setScanning] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Dedupe the per-frame scan callback so one QR in view isn't handled repeatedly.
  const handled = useRef('');

  const submit = useCallback((secret: string): void => {
    const err = p.onImport(secret.trim());
    if (err) setError(err); // success unmounts this dialog, so no else-branch needed
  }, [p]);

  const onScan = useCallback((raw: string): void => {
    if (raw === handled.current) return;
    handled.current = raw;
    setError(null);
    submit(raw);
  }, [submit]);

  const { videoRef, error: cameraError } = useQrScanner(scanning, onScan);

  return (
    <Modal testId="import-account-dialog" title="Move or import an account" width={360} onClose={p.onClose} footer={
      <button data-testid="import-account-cancel-button" onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 18px' }}>Cancel</button>
    }>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: '#444', lineHeight: 1.5, marginBottom: 12 }}>
          Already signed in on another device? On that device open <b>Move or back up this account</b> to show a QR code, then scan it here.
        </div>

        {scanning ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#000', border: '1px solid #06387c', borderRadius: 4, overflow: 'hidden' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Framing reticle to tell the user where to aim. */}
              <div style={{ position: 'absolute', inset: '18%', border: '2px solid rgba(255,255,255,.85)', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,.18)' }} />
            </div>
            {cameraError && <div style={{ color: '#b04030', fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>{cameraError}</div>}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span data-testid="import-account-stop-scan-button" className="msn-link" onClick={() => setScanning(false)} style={{ color: '#2a5db0', fontSize: 11 }}>Stop scanning</span>
            </div>
          </div>
        ) : (
          <button
            data-testid="import-account-scan-qr-button"
            onClick={() => { setError(null); handled.current = ''; setScanning(true); }}
            style={{ ...GREEN_BTN, width: '100%', padding: '9px 0', fontSize: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <span style={{ fontSize: 15 }}>📷</span> Scan a QR code
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9aa6b6', fontSize: 10, margin: '4px 0 10px' }}>
          <span style={{ flex: 1, height: 1, background: '#d0dbe8' }} /> or paste it <span style={{ flex: 1, height: 1, background: '#d0dbe8' }} />
        </div>

        <textarea
          data-testid="import-account-secret-input"
          value={text}
          onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
          placeholder="Paste your secret key (nsec…) or 24-word recovery phrase"
          rows={3}
          style={{ width: '100%', resize: 'none', padding: '6px 7px', border: '1px solid #7a93b8', borderTopColor: '#5a73a0', fontFamily: 'Tahoma, sans-serif', fontSize: 11 }}
        />

        {error && <div style={{ color: '#b04030', fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>{error}</div>}

        <div style={{ textAlign: 'right', marginTop: 10 }}>
          <button
            data-testid="import-account-submit-button"
            onClick={() => submit(text)}
            disabled={text.trim().length === 0}
            style={{ ...GREEN_BTN, padding: '6px 18px', opacity: text.trim().length === 0 ? 0.5 : 1, cursor: text.trim().length === 0 ? 'default' : 'pointer' }}
          >
            Sign in
          </button>
        </div>
      </div>
    </Modal>
  );
};
