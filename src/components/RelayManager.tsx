import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { RelayInfo, RelayStatus } from '../state/types';
import { GREEN_BTN } from '../ui/chrome';
import { Modal } from './Modal';

export interface RelayManagerProps {
  readonly relays: readonly RelayInfo[];
  readonly onAdd: (url: string) => void;
  readonly onRemove: (url: string) => void;
  readonly onToggle: (url: string) => void;
  readonly onClose: () => void;
}

const DOT: Readonly<Record<RelayStatus, string>> = {
  connected: '#3fb53f',
  connecting: '#e8a13a',
  error: '#c83020',
};
const STATUS_LABEL: Readonly<Record<RelayStatus, string>> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  error: 'Unreachable',
};

export const RelayManager = (p: RelayManagerProps) => {
  const [draft, setDraft] = useState('');

  const add = (): void => {
    const url = draft.trim();
    if (!url) return;
    p.onAdd(url);
    setDraft('');
  };

  const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderBottom: '1px solid #eef2f8' };

  return (
    <Modal testId="relay-manager-dialog" title="Connection" width={388} onClose={p.onClose} footer={
      <button data-testid="relay-close-button" onClick={p.onClose} style={{ ...GREEN_BTN, padding: '4px 18px' }}>Close</button>
    }>
      <div>
        <div style={{ padding: '8px 10px', color: '#33476a', fontSize: 11, background: 'linear-gradient(180deg,#eaf3ff,#d7e6fa)', borderBottom: '1px solid #b9c8de' }}>
          Messenger sends and receives through these <b>servers</b>. A few popular ones are set up for you — add your own any time.
        </div>

        <div className="msn-scroll" style={{ maxHeight: 220, overflowY: 'auto' }}>
          {p.relays.map((r) => (
            <div key={r.url} data-testid="relay-item" data-relay-url={r.url} style={row}>
              <input data-testid="relay-enable-toggle" type="checkbox" checked={r.enabled} onChange={() => p.onToggle(r.url)} title="Enable / disable" />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: DOT[r.status], flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: r.enabled ? '#222' : '#9aa6b6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</div>
                <div style={{ fontSize: 9, color: '#8a93a0' }}>{STATUS_LABEL[r.status]}</div>
              </div>
              <span data-testid="relay-remove-button" onClick={() => p.onRemove(r.url)} title="Remove server" style={{ color: '#b04030', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>✕</span>
            </div>
          ))}
          {p.relays.length === 0 && <div style={{ padding: 14, textAlign: 'center', color: '#8a93a0', fontSize: 11 }}>No servers. Add one below to connect.</div>}
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid #dce6f3', background: '#f6f9fd' }}>
          <input
            data-testid="relay-add-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="wss://server.example.com"
            style={{ flex: 1, padding: '4px 6px', border: '1px solid #9bb0d0', fontFamily: 'Tahoma, sans-serif', fontSize: 11 }}
          />
          <button data-testid="relay-add-button" onClick={add} style={{ ...GREEN_BTN, padding: '4px 14px' }}>Add</button>
        </div>
      </div>
    </Modal>
  );
};
