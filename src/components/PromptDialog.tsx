import { useState } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { Modal } from './Modal';

export interface PromptDialogProps {
  readonly title: string;
  readonly label: string;
  readonly initial: string;
  readonly placeholder?: string;
  readonly confirmLabel?: string;
  /** Allow submitting a blank value (e.g. clearing a personal message). Default false. */
  readonly allowEmpty?: boolean;
  /** Receives the raw input value; the caller trims/validates as needed. */
  readonly onSubmit: (value: string) => void;
  readonly onCancel: () => void;
}

/**
 * A single-field XP text prompt (built on {@link Modal}) — the in-app
 * replacement for `window.prompt`. Used for the display name, personal message
 * and contact nicknames.
 */
export const PromptDialog = (p: PromptDialogProps) => {
  const [value, setValue] = useState(p.initial);
  const valid = p.allowEmpty || value.trim().length > 0;

  const submit = (): void => {
    if (valid) p.onSubmit(value);
  };

  return (
    <Modal testId="prompt-dialog" title={p.title} width={332} onClose={p.onCancel} footer={
      <>
        <button data-testid="prompt-dialog-cancel-button" onClick={p.onCancel} style={{ ...GREEN_BTN, padding: '5px 16px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>Cancel</button>
        <button data-testid="prompt-dialog-confirm-button" onClick={submit} style={{ ...GREEN_BTN, padding: '5px 20px', opacity: valid ? 1 : 0.6 }}>{p.confirmLabel ?? 'OK'}</button>
      </>
    }>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ color: '#333', fontSize: 11, marginBottom: 6, lineHeight: 1.5 }}>{p.label}</div>
        <input
          data-testid="prompt-dialog-input"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder={p.placeholder}
          style={{ width: '100%', padding: '4px 6px', border: '1px solid #7a93b8', fontFamily: 'Tahoma, sans-serif', fontSize: 11 }}
        />
      </div>
    </Modal>
  );
};
