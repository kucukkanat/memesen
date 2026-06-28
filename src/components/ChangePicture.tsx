import { useState } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { Avatar } from '../assets/avatars';
import { AVATAR_KEYS } from '../nostr/keys';
import { Modal } from './Modal';

export interface ChangePictureProps {
  readonly current: string;
  readonly name: string;
  readonly onChoose: (picture: string) => void;
  readonly onClose: () => void;
}

const isUrl = (s: string): boolean => /^https?:\/\//.test(s);

export const ChangePicture = (p: ChangePictureProps) => {
  const [selected, setSelected] = useState(p.current);
  const [url, setUrl] = useState(isUrl(p.current) ? p.current : '');

  const pickBundled = (key: string): void => {
    setSelected(`memesen:${key}`);
    setUrl('');
  };
  const changeUrl = (v: string): void => {
    setUrl(v);
    setSelected(v.trim());
  };

  const isSelected = (key: string): boolean => selected === `memesen:${key}` || selected === key;

  return (
    <Modal testId="change-picture-dialog" title="Display Picture" width={384} onClose={p.onClose} footer={
      <>
        <button data-testid="change-picture-cancel-button" onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 16px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>Cancel</button>
        <button
          data-testid="change-picture-ok-button"
          onClick={() => selected.trim() && p.onChoose(selected.trim())}
          style={{ ...GREEN_BTN, padding: '5px 22px', opacity: selected.trim() ? 1 : 0.6 }}
        >
          OK
        </button>
      </>
    }>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <Avatar pic={selected || p.current} size={72} status="online" style={{ margin: '0 auto' }} />
            <div style={{ color: '#2a4a78', fontSize: 9, marginTop: 4, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#333', marginBottom: 5 }}>Choose a picture:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
              {AVATAR_KEYS.map((key) => (
                <div
                  key={key}
                  data-testid="change-picture-avatar-item"
                  onClick={() => pickBundled(key)}
                  className="msn-toolbtn"
                  title={key}
                  style={{
                    padding: 2,
                    borderRadius: 3,
                    cursor: 'pointer',
                    border: isSelected(key) ? '2px solid #2d8bf5' : '2px solid transparent',
                    background: isSelected(key) ? '#dcecff' : 'transparent',
                  }}
                >
                  <Avatar pic={`memesen:${key}`} size={36} style={{ margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, borderTop: '1px solid #e3e9f2', paddingTop: 12 }}>
          <div style={{ color: '#333', marginBottom: 4 }}>…or use a picture from the web:</div>
          <input
            data-testid="change-picture-url-input"
            value={url}
            onChange={(e) => changeUrl(e.target.value)}
            placeholder="https://example.com/me.jpg"
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #9bb0d0', fontFamily: 'Tahoma, sans-serif', fontSize: 11 }}
          />
        </div>
      </div>
    </Modal>
  );
};
