import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { Avatar } from '../assets/avatars';
import { QrCode } from '../ui/qr';
import { phraseFromNsec } from '../nostr/keys';
import { Modal } from './Modal';

export interface ExportAccountProps {
  readonly name: string;
  readonly avatar: string;
  readonly nsec: string;
  readonly npub: string;
  readonly onCopy: (text: string, label: string) => void;
  readonly onClose: () => void;
}

type Tab = 'phone' | 'key' | 'words';

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'phone', label: '📱 To my phone' },
  { id: 'key', label: '🔑 Secret key' },
  { id: 'words', label: '✍️ Recovery words' },
];

const tabStyle = (active: boolean): CSSProperties => ({
  flex: 1,
  padding: '6px 4px',
  fontSize: 11,
  fontWeight: active ? 'bold' : 'normal',
  textAlign: 'center',
  cursor: 'pointer',
  color: active ? '#0a3a8c' : '#5a6675',
  background: active ? '#fff' : 'linear-gradient(180deg,#eef3fb,#dde8f5)',
  borderBottom: active ? '2px solid #2d8bf5' : '1px solid #c0d0e8',
});

const Numbered = ({ words }: { words: readonly string[] }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
    {words.map((w, i) => (
      <div key={`${i}-${w}`} style={{ display: 'flex', alignItems: 'baseline', gap: 5, background: '#f6f9fd', border: '1px solid #cdddf0', borderRadius: 3, padding: '4px 6px' }}>
        <span style={{ color: '#8a93a0', fontSize: 9, width: 14, textAlign: 'right' }}>{i + 1}</span>
        <span style={{ fontFamily: 'Consolas, monospace', fontSize: 12, color: '#1a2a3a' }}>{w}</span>
      </div>
    ))}
  </div>
);

/**
 * "Move or back up this account": the same secret key, offered three ways a
 * normal person can act on — a QR to scan from their phone, the raw key to copy
 * or save, and a written recovery phrase. All of it is gated behind one explicit
 * "show" so a shoulder-surfer can't grab it from a glance.
 */
export const ExportAccount = (p: ExportAccountProps) => {
  const [tab, setTab] = useState<Tab>('phone');
  const [revealed, setRevealed] = useState(false);
  const phrase = useMemo(() => phraseFromNsec(p.nsec), [p.nsec]);
  const words = useMemo(() => phrase.split(' '), [phrase]);

  const saveToFile = (): void => {
    const body = [
      'Memesen account backup — KEEP THIS PRIVATE.',
      'Anyone with the secret key or recovery words below can use this account.',
      '',
      `Name: ${p.name}`,
      `Public address (safe to share): ${p.npub}`,
      '',
      `Secret key: ${p.nsec}`,
      '',
      'Recovery words:',
      words.map((w, i) => `${i + 1}. ${w}`).join('\n'),
      '',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memesen-account-backup.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal title="Move or back up this account" width={380} onClose={p.onClose} footer={
      <button onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 18px' }}>Done</button>
    }>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Avatar pic={p.avatar} size={42} status="online" />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#0a3a8c', fontWeight: 'bold', fontSize: 13 }}>{p.name}</div>
            <div style={{ color: '#8a93a0', fontSize: 10 }}>Use any one of these to sign in on another device.</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, background: '#fff7e6', border: '1px solid #f0c060', borderRadius: 4, padding: '7px 9px', marginBottom: 12, fontSize: 10.5, color: '#7a5000', lineHeight: 1.4 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span>This is the <b>only</b> way into your account — there's no password reset. Anyone who sees it can read your chats and message people as you. Keep it secret.</span>
        </div>

        <div style={{ display: 'flex', border: '1px solid #c0d0e8', borderBottom: 'none', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
          {TABS.map((t) => (
            <div key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</div>
          ))}
        </div>

        <div style={{ border: '1px solid #c0d0e8', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: 14, minHeight: 168 }}>
          {!revealed ? (
            <div style={{ textAlign: 'center', padding: '22px 6px' }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 12, lineHeight: 1.5 }}>
                Your secret is hidden. Make sure no one is watching your screen, then reveal it.
              </div>
              <button onClick={() => setRevealed(true)} style={{ ...GREEN_BTN, padding: '7px 20px' }}>🔓 Show secret</button>
            </div>
          ) : tab === 'phone' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <QrCode text={p.nsec} size={184} />
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#333', lineHeight: 1.55, alignSelf: 'stretch' }}>
                <li>On your phone, open <b>Memesen</b> and tap <b>Move or import an account</b>.</li>
                <li>Tap <b>Scan a QR code</b>.</li>
                <li>Point the camera at this square.</li>
              </ol>
            </div>
          ) : tab === 'key' ? (
            <div>
              <div style={{ fontSize: 11, color: '#333', marginBottom: 4 }}>Your secret key:</div>
              <textarea
                readOnly
                value={p.nsec}
                onFocus={(e) => e.currentTarget.select()}
                rows={2}
                style={{ width: '100%', resize: 'none', padding: '5px 6px', border: '1px solid #9bb0d0', background: '#f6f9fd', fontFamily: 'Consolas, monospace', fontSize: 11, color: '#222', wordBreak: 'break-all' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => p.onCopy(p.nsec, 'secret key')} style={{ ...GREEN_BTN, padding: '5px 14px' }}>Copy key</button>
                <button onClick={saveToFile} style={{ ...GREEN_BTN, padding: '5px 14px' }}>Save as file…</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: '#333', marginBottom: 8 }}>Write these 24 words down in order and keep them somewhere safe:</div>
              <Numbered words={words} />
              <button onClick={() => p.onCopy(phrase, 'recovery phrase')} style={{ ...GREEN_BTN, padding: '5px 14px', marginTop: 10 }}>Copy words</button>
            </div>
          )}
        </div>

        {revealed && (
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <span className="msn-link" onClick={() => setRevealed(false)} style={{ color: '#2a5db0', fontSize: 10.5 }}>Hide secret</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
