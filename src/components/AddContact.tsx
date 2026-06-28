import { useState } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { Modal } from './Modal';

export interface AddContactProps {
  /** App resolves npub / NIP-05 / hex asynchronously; returns an error string or null. */
  readonly onAdd: (input: string, petname: string) => Promise<string | null>;
  readonly onClose: () => void;
}

export const AddContact = (p: AddContactProps) => {
  const [input, setInput] = useState('');
  const [petname, setPetname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    const id = input.trim();
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    const err = await p.onAdd(id, petname.trim());
    setBusy(false);
    if (err) setError(err); // on success the dialog is closed by the reducer
  };

  return (
    <Modal title="Add a Contact" testId="add-contact-dialog" onClose={p.onClose} footer={
      <>
        <button data-testid="add-contact-cancel-button" onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 16px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>Cancel</button>
        <button data-testid="add-contact-submit-button" onClick={() => void submit()} style={{ ...GREEN_BTN, padding: '5px 20px', opacity: busy ? 0.6 : 1 }}>{busy ? 'Adding…' : 'Add'}</button>
      </>
    }>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ color: '#33476a', fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
          Enter your friend's <b>contact address</b> (the one they shared with you).
        </div>

        <div style={{ color: '#333', marginBottom: 3 }}>Contact address:</div>
        <input
          data-testid="add-contact-address-input"
          value={input}
          autoFocus
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          placeholder="paste a contact address"
          style={{ width: '100%', padding: '4px 6px', border: '1px solid #7a93b8', fontFamily: 'Tahoma, sans-serif', fontSize: 11, marginBottom: 10 }}
        />

        <div style={{ color: '#333', marginBottom: 3 }}>Nickname (optional):</div>
        <input
          data-testid="add-contact-nickname-input"
          value={petname}
          onChange={(e) => setPetname(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          placeholder="how it shows in your buddy list"
          style={{ width: '100%', padding: '4px 6px', border: '1px solid #7a93b8', fontFamily: 'Tahoma, sans-serif', fontSize: 11 }}
        />

        {error && <div style={{ color: '#c83020', fontSize: 11, marginTop: 10 }}>{error}</div>}
      </div>
    </Modal>
  );
};
