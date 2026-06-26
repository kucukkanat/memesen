import { useState } from 'react';
import { CLOSE_BTN, GREEN_BTN, SIDE_BORDERS, TITLE_BAR, TITLE_TEXT } from '../ui/chrome';
import { Butterfly } from '../assets/icons';
import { Avatar } from '../assets/avatars';
import { AVATAR_KEYS } from '../nostr/keys';

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
    <div style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%,-50%)', width: 384, zIndex: 26, boxShadow: '0 12px 38px rgba(0,0,0,.5)' }}>
      <div style={{ ...TITLE_BAR }}>
        <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
        <span style={TITLE_TEXT}>Display Picture</span>
        <div onClick={p.onClose} style={{ ...CLOSE_BTN, width: 19, height: 17, fontSize: 10 }}>✕</div>
      </div>

      <div style={{ ...SIDE_BORDERS, background: '#fff', borderBottom: '1px solid #06387c', padding: '14px 16px' }}>
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
            value={url}
            onChange={(e) => changeUrl(e.target.value)}
            placeholder="https://example.com/me.jpg"
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #9bb0d0', fontFamily: 'Tahoma, sans-serif', fontSize: 11 }}
          />
        </div>
      </div>

      <div style={{ background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)', border: '1px solid #06387c', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '8px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 16px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>Cancel</button>
        <button
          onClick={() => selected.trim() && p.onChoose(selected.trim())}
          style={{ ...GREEN_BTN, padding: '5px 22px', opacity: selected.trim() ? 1 : 0.6 }}
        >
          OK
        </button>
      </div>
    </div>
  );
};
