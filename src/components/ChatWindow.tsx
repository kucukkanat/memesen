import { useEffect, useRef } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { Chat } from '../state/types';
import type { ResolvedContact } from '../state/view';
import { statusOf } from '../state/data';
import { CLOSE_BTN, MENU_BAR, SIDE_BORDERS, TITLE_BAR, TITLE_TEXT, GREEN_BTN } from '../ui/chrome';
import type { StatusKey } from '../state/types';
import { Butterfly, StatusIcon } from '../assets/icons';
import { Avatar } from '../assets/avatars';
import { Emoticon, EMOTICON_LIST, RichText } from '../assets/emoticons';
import nudgeIcon from '../assets/msn/toolbar/nudge.png';
import winkIcon from '../assets/msn/toolbar/wink.png';
import inviteIcon from '../assets/msn/toolbar/invite.png';
import sendFilesIcon from '../assets/msn/toolbar/send.png';
import videoIcon from '../assets/msn/toolbar/video.png';
import voiceIcon from '../assets/msn/toolbar/voice.png';
import gamesIcon from '../assets/msn/toolbar/games.png';
import activitiesIcon from '../assets/msn/toolbar/activities.png';

const TOOL_BTN: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  border: '1px solid #b9c8de',
  background: 'linear-gradient(180deg,#fff,#eef3fb)',
  borderRadius: 3,
  cursor: 'pointer',
  color: '#1a4a9c',
  fontSize: 10,
  whiteSpace: 'nowrap',
};
const ICON_BTN: CSSProperties = { ...TOOL_BTN, padding: '3px 6px', color: '#33476a' };

export interface ChatWindowProps {
  readonly chat: Chat;
  readonly contact: ResolvedContact;
  readonly myAvatar: string;
  readonly myName: string;
  readonly onTitleDrag: (e: ReactMouseEvent) => void;
  readonly onFocus: () => void;
  readonly onResize: (e: ReactMouseEvent) => void;
  readonly onClose: () => void;
  readonly onDraft: (v: string) => void;
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly onSend: () => void;
  readonly onNudge: () => void;
  readonly onWink: () => void;
  readonly onToggleEmoji: () => void;
  readonly onPickEmoji: (code: string) => void;
}

const DisplayPicture = ({ pic, status, label }: { pic: string; status: StatusKey; label: string }) => (
  <div style={{ textAlign: 'center' }}>
    <Avatar pic={pic} size={62} status={status} style={{ margin: '0 auto' }} />
    <div style={{ color: '#2a4a78', fontSize: 9, marginTop: 3, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      <RichText text={label} size={12} />
    </div>
  </div>
);

const TBAR_ICON: CSSProperties = { width: 16, height: 16, verticalAlign: 'middle' };

export const ChatWindow = (p: ChatWindowProps) => {
  const { chat, contact } = p;
  const info = statusOf(contact.status);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.typing]);

  const pickEmoji = (code: string): void => {
    p.onPickEmoji(code);
    inputRef.current?.focus();
  };

  return (
    <div
      data-win="chat"
      onMouseDown={p.onFocus}
      style={{
        position: 'absolute',
        boxShadow: '0 8px 30px rgba(0,0,0,.45)',
        zIndex: chat.z,
        top: chat.top,
        left: chat.left,
        width: chat.width,
        height: chat.height,
        display: 'flex',
        flexDirection: 'column',
        animation: chat.shake ? 'msn-shake 0.8s ease' : 'none',
      }}
    >
      {/* title bar */}
      <div onMouseDown={p.onTitleDrag} style={{ ...TITLE_BAR, flexShrink: 0, cursor: 'move' }}>
        <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
        <span style={TITLE_TEXT}><RichText text={contact.name} size={15} /> - Conversation</span>
        <div onClick={p.onClose} style={{ ...CLOSE_BTN, width: 19, height: 17, fontSize: 10 }}>✕</div>
      </div>

      {/* menu */}
      <div style={{ ...MENU_BAR, flexShrink: 0 }}>
        <span className="msn-link"><u>F</u>ile</span>
        <span className="msn-link"><u>E</u>dit</span>
        <span className="msn-link"><u>A</u>ctions</span>
        <span className="msn-link"><u>T</u>ools</span>
        <span className="msn-link"><u>H</u>elp</span>
      </div>

      {/* contact strip */}
      <div
        style={{
          ...SIDE_BORDERS,
          flexShrink: 0,
          background: 'linear-gradient(180deg,#eaf3ff,#cfe0f6)',
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #9bb0d0',
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0, width: 24, height: 24 }}>
          <Avatar pic={contact.avatar} size={24} />
          <span style={{ position: 'absolute', bottom: -3, right: -3 }}><StatusIcon status={contact.status} size={11} /></span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#0a3a8c', fontWeight: 'bold' }}>
            To: <RichText text={contact.name} size={14} /> <span style={{ color: '#5a7398', fontWeight: 'normal' }}>&lt;{contact.handle}&gt;</span>
          </div>
          <div style={{ color: '#7a8aa0', fontSize: 10 }}>{info.label}</div>
        </div>
      </div>

      {/* toolbar */}
      <div
        style={{
          ...SIDE_BORDERS,
          flexShrink: 0,
          background: 'linear-gradient(180deg,#fefefe,#e8eef6)',
          padding: '4px 8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          borderBottom: '1px solid #c8d4e6',
        }}
      >
        <div className="msn-toolbtn" onClick={p.onToggleEmoji} title="Emoticons" style={TOOL_BTN}>
          <Emoticon code=":)" size={16} /> Emoticons
        </div>
        <div className="msn-toolbtn" onClick={p.onNudge} title="Send a Nudge" style={TOOL_BTN}>
          <img src={nudgeIcon} style={TBAR_ICON} alt="" /> Nudge
        </div>
        <div className="msn-toolbtn" onClick={p.onWink} title="Send a Wink" style={TOOL_BTN}>
          <img src={winkIcon} style={TBAR_ICON} alt="" /> Winks
        </div>
        <div className="msn-toolbtn" title="Invite someone" style={ICON_BTN}><img src={inviteIcon} style={TBAR_ICON} alt="" /></div>
        <div className="msn-toolbtn" title="Send files" style={ICON_BTN}><img src={sendFilesIcon} style={TBAR_ICON} alt="" /></div>
        <div className="msn-toolbtn" title="Webcam" style={ICON_BTN}><img src={videoIcon} style={TBAR_ICON} alt="" /></div>
        <div className="msn-toolbtn" title="Voice clip" style={ICON_BTN}><img src={voiceIcon} style={TBAR_ICON} alt="" /></div>
        <div className="msn-toolbtn" title="Activities" style={ICON_BTN}><img src={activitiesIcon} style={TBAR_ICON} alt="" /></div>
        <div className="msn-toolbtn" title="Games" style={ICON_BTN}><img src={gamesIcon} style={TBAR_ICON} alt="" /></div>
      </div>

      {/* transcript + display pictures (flexes to absorb the window's height) */}
      <div style={{ ...SIDE_BORDERS, flex: 1, minHeight: 0, display: 'flex', background: '#fff' }}>
        <div ref={logRef} className="msn-scroll" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', padding: '8px 10px' }}>
          {chat.messages.map((m, i) =>
            m.kind === 'system' ? (
              <div key={i} style={{ textAlign: 'center', color: '#9a6a1a', fontSize: 10, margin: '6px 0', fontStyle: 'italic' }}>
                {m.text}
              </div>
            ) : (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ color: m.mine ? '#1a5fc8' : '#c8401a', fontWeight: 'bold', fontSize: 10 }}>
                  <RichText text={m.mine ? p.myName : contact.name} size={13} /> <span style={{ color: '#aaa', fontWeight: 'normal' }}>{m.time}</span>
                </div>
                <div style={{ color: '#222', paddingLeft: 8, wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                  <RichText text={m.body} size={18} />
                </div>
              </div>
            ),
          )}
        </div>
        <div
          style={{
            width: 84,
            flexShrink: 0,
            background: 'linear-gradient(180deg,#dfeafa,#c2d6ef)',
            borderLeft: '1px solid #a8bcd8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 0',
          }}
        >
          <DisplayPicture pic={contact.avatar} status={contact.status} label={contact.name} />
          <DisplayPicture pic={p.myAvatar} status="online" label={p.myName} />
        </div>
      </div>

      {/* typing indicator */}
      <div style={{ ...SIDE_BORDERS, flexShrink: 0, background: '#fbfcfe', padding: '1px 10px', height: 15, color: '#888', fontSize: 10, fontStyle: 'italic' }}>
        {chat.typing ? `${contact.name} is writing a message...` : ''}
      </div>

      {/* emoticon palette */}
      {chat.emojiOpen && (
        <div style={{ ...SIDE_BORDERS, flexShrink: 0, background: '#fff', borderTop: '1px solid #c8d4e6', padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {EMOTICON_LIST.map((e) => (
            <div
              key={e.code}
              className="msn-toolbtn"
              onClick={() => pickEmoji(e.code)}
              title={`${e.name}  ${e.code}`}
              style={{
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '1px solid transparent',
                borderRadius: 3,
              }}
            >
              <Emoticon code={e.code} size={20} />
            </div>
          ))}
        </div>
      )}

      {/* input */}
      <div style={{ ...SIDE_BORDERS, flexShrink: 0, background: '#fff', padding: '7px 8px', display: 'flex', gap: 7, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={chat.draft}
          onChange={(e) => p.onDraft(e.target.value)}
          onKeyDown={p.onKeyDown}
          placeholder="Type a message"
          style={{
            flex: 1,
            height: 46,
            resize: 'none',
            padding: '5px 6px',
            border: '1px solid #9bb0d0',
            fontFamily: 'Tahoma, sans-serif',
            fontSize: 11,
            color: '#222',
          }}
        />
        <button onClick={p.onSend} style={{ ...GREEN_BTN, padding: '6px 16px', height: 46 }}>Send</button>
      </div>

      {/* footer */}
      <div style={{ position: 'relative', flexShrink: 0, background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)', border: '1px solid #06387c', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '4px 9px', color: '#7a8aa0', fontSize: 10 }}>
        {contact.status === 'offline' ? 'This contact is offline. Your message will arrive when they reconnect.' : 'This conversation is private and encrypted'}
        {/* resize grip */}
        <div
          onMouseDown={p.onResize}
          title="Drag to resize"
          style={{
            position: 'absolute',
            right: 1,
            bottom: 0,
            width: 16,
            height: 16,
            cursor: 'nwse-resize',
            color: '#7a93b8',
            fontSize: 12,
            lineHeight: '14px',
            textAlign: 'right',
          }}
        >
          ◢
        </div>
      </div>

      {/* wink overlay */}
      {chat.winkOn && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
          <span style={{ fontSize: 120, animation: 'msn-wink 1.4s ease-out forwards', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.4))' }}>
            {chat.winkGlyph}
          </span>
        </div>
      )}
    </div>
  );
};
