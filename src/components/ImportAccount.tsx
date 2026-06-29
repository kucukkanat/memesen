import { useState } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { Modal } from './Modal';

export interface ImportAccountProps {
  /**
   * Try to import the pasted secret. Returns a friendly error string to show,
   * or null on success (the parent then signs in and closes this dialog).
   */
  readonly onImport: (secret: string) => string | null;
  readonly onClose: () => void;
}

/**
 * "Move or import an account": the receiving end of the handoff. The headline
 * path is the QR shown on the other device — it's a link, so the phone's own
 * camera opens it and this app signs in with no scanner of its own. Pasting an
 * `nsec…` or recovery phrase is the always-available fallback handled here.
 */
export const ImportAccount = (p: ImportAccountProps) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    const err = p.onImport(text.trim());
    if (err) setError(err); // success unmounts this dialog, so no else-branch needed
  };

  return (
    <Modal testId="import-account-dialog" title="Move or import an account" width={360} onClose={p.onClose} footer={
      <button data-testid="import-account-cancel-button" onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 18px' }}>Cancel</button>
    }>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: '#444', lineHeight: 1.5, marginBottom: 12 }}>
          Already signed in on another device? On that device open <b>Move or back up this account</b>,
          then point this phone's <b>camera</b> at the QR code — it opens Memesen and signs you in here.
          No code to scan? Paste your secret key or recovery phrase below.
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
            onClick={submit}
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
