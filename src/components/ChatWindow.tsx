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
import { useIsMobile, MOBILE_NAV_H } from '../hooks/useIsMobile';
import msnLogo from '../assets/msn/ui/msn-logo.png';
import nudgeIcon from '../assets/msn/toolbar/nudge.png';
import winkIcon from '../assets/msn/toolbar/wink.png';
import inviteIcon from '../assets/msn/toolbar/invite.png';
import sendFilesIcon from '../assets/msn/toolbar/send.png';
import videoIcon from '../assets/msn/toolbar/video.png';
import voiceIcon from '../assets/msn/toolbar/voice.png';
import voiceClipIcon from '../assets/msn/toolbar/voice-clip.png';
import gamesIcon from '../assets/msn/toolbar/games.png';
import activitiesIcon from '../assets/msn/toolbar/activities.png';

// The big top action toolbar (Invite · Send Files · Video · Voice · Activities ·
// Games): a large icon with a small caption underneath, exactly as MSN 7.
const BIG_BTN: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
  padding: '2px 7px',
  borderRadius: 3,
  border: '1px solid transparent',
  cursor: 'pointer',
  color: '#1a3a6a',
  fontSize: 9,
  whiteSpace: 'nowrap',
};
const BIG_ICON: CSSProperties = { width: 24, height: 24 };

// The little formatting strip that sits just above the input box.
const FMT_BTN: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  padding: '2px 5px',
  borderRadius: 3,
  border: '1px solid transparent',
  cursor: 'pointer',
  color: '#1a4a9c',
  fontSize: 10,
  whiteSpace: 'nowrap',
};
const FMT_ICON: CSSProperties = { width: 15, height: 15, verticalAlign: 'middle' };
const SEP: CSSProperties = { width: 1, alignSelf: 'stretch', margin: '2px 3px', background: '#c4d2e6' };

export interface ChatWindowProps {
  readonly chat: Chat;
  readonly contact: ResolvedContact;
  readonly inContacts: boolean;
  readonly myAvatar: string;
  readonly myName: string;
  readonly onAddContact: () => void;
  readonly onTitleDrag: (e: ReactMouseEvent) => void;
  readonly onFocus: () => void;
  readonly onResize: (e: ReactMouseEvent) => void;
  readonly onClose: () => void;
  /** Mobile only: step back to the buddy list without closing the conversation. */
  readonly onBack?: () => void;
  readonly onDraft: (v: string) => void;
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly onSend: () => void;
  readonly onNudge: () => void;
  readonly onWink: () => void;
  readonly onToggleEmoji: () => void;
  readonly onPickEmoji: (code: string) => void;
  readonly onOpenFont: () => void;
  /** Re-send a message whose delivery failed (click the ⚠ marker). */
  readonly onResend: (body: string) => void;
}

const DisplayPicture = ({ pic, status, label }: { pic: string; status: StatusKey; label: string }) => (
  <div style={{ textAlign: 'center' }}>
    <Avatar pic={pic} size={64} status={status} style={{ margin: '0 auto' }} />
    <div style={{ color: '#2a4a78', fontSize: 9, marginTop: 3, maxWidth: 78, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      <RichText text={label} size={12} />
    </div>
  </div>
);

export const ChatWindow = (p: ChatWindowProps) => {
  const { chat, contact, inContacts } = p;
  const mobile = useIsMobile();
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
        // On phones the conversation is a full-screen view above the bottom nav
        // — no dragging, no resize, no stacking maths. Desktop stays a floating,
        // draggable, resizable window exactly as before.
        position: mobile ? 'fixed' : 'absolute',
        boxShadow: '0 8px 30px rgba(0,0,0,.45)',
        zIndex: chat.z,
        top: mobile ? 0 : chat.top,
        left: mobile ? 0 : chat.left,
        right: mobile ? 0 : undefined,
        bottom: mobile ? `calc(${MOBILE_NAV_H}px + var(--safe-bottom))` : undefined,
        width: mobile ? 'auto' : chat.width,
        height: mobile ? 'auto' : chat.height,
        display: 'flex',
        flexDirection: 'column',
        animation: chat.shake ? 'msn-shake 0.8s ease' : 'none',
      }}
    >
      {/* title bar */}
      <div
        onMouseDown={mobile ? undefined : p.onTitleDrag}
        style={{ ...TITLE_BAR, flexShrink: 0, cursor: mobile ? 'default' : 'move', height: mobile ? 'auto' : 24, paddingTop: mobile ? 'calc(4px + var(--safe-top))' : undefined, paddingBottom: mobile ? 4 : undefined }}
      >
        {mobile && p.onBack && (
          <div onClick={p.onBack} title="Back to contacts" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 22, marginRight: 2, color: '#fff', fontSize: 18, cursor: 'pointer' }}>‹</div>
        )}
        <span style={{ marginRight: 5, display: 'flex' }}><Butterfly size={15} /></span>
        <span style={TITLE_TEXT}><RichText text={contact.name} size={15} /> - Conversation</span>
        <div onClick={p.onClose} style={{ ...CLOSE_BTN, width: mobile ? 26 : 19, height: mobile ? 22 : 17, fontSize: mobile ? 12 : 10 }}>✕</div>
      </div>

      {/* menu — with the msn wordmark parked at the far right, as in the original */}
      <div style={{ ...MENU_BAR, flexShrink: 0, alignItems: 'center' }}>
        <span className="msn-link"><u>F</u>ile</span>
        <span className="msn-link"><u>E</u>dit</span>
        <span className="msn-link"><u>A</u>ctions</span>
        <span className="msn-link"><u>T</u>ools</span>
        <span className="msn-link"><u>H</u>elp</span>
        <span style={{ flex: 1 }} />
        <img src={msnLogo} alt="msn" height={15} draggable={false} style={{ verticalAlign: 'middle', opacity: 0.95 }} />
      </div>

      {/* big action toolbar */}
      <div
        style={{
          ...SIDE_BORDERS,
          flexShrink: 0,
          background: 'linear-gradient(180deg,#fbfdff,#dbe7f7)',
          borderBottom: '1px solid #9bb0d0',
          display: 'flex',
          alignItems: 'flex-start',
          padding: '4px 4px 3px',
          gap: 1,
          overflowX: 'auto',
        }}
      >
        <div className="msn-toolbtn" onClick={p.onAddContact} title="Invite someone" style={BIG_BTN}>
          <img src={inviteIcon} style={BIG_ICON} alt="" /> Invite
        </div>
        <div className="msn-toolbtn" title="Send files" style={BIG_BTN}>
          <img src={sendFilesIcon} style={BIG_ICON} alt="" /> Send Files
        </div>
        <div style={SEP} />
        <div className="msn-toolbtn" title="Start a video call" style={BIG_BTN}>
          <img src={videoIcon} style={BIG_ICON} alt="" /> Video
        </div>
        <div className="msn-toolbtn" title="Start a voice call" style={BIG_BTN}>
          <img src={voiceIcon} style={BIG_ICON} alt="" /> Voice
        </div>
        <div style={SEP} />
        <div className="msn-toolbtn" title="Activities" style={BIG_BTN}>
          <img src={activitiesIcon} style={BIG_ICON} alt="" /> Activities
        </div>
        <div className="msn-toolbtn" title="Games" style={BIG_BTN}>
          <img src={gamesIcon} style={BIG_ICON} alt="" /> Games
        </div>
      </div>

      {/* not-in-contacts notice (old MSN yellow info bar) */}
      {!inContacts && (
        <div
          style={{
            ...SIDE_BORDERS,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px',
            background: 'linear-gradient(180deg,#fffbe0,#ffe9a8)',
            borderBottom: '1px solid #e3c24a',
            color: '#7a5a14',
            fontSize: 11,
          }}
        >
          <span style={{ flexShrink: 0, fontSize: 13, lineHeight: 1 }}>⚠️</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <RichText text={contact.name} size={13} /> is not in your contact list yet.
          </span>
          <button
            onClick={p.onAddContact}
            style={{ ...GREEN_BTN, flexShrink: 0, padding: '3px 12px', fontSize: 11 }}
          >
            Add to Contacts
          </button>
        </div>
      )}

      {/* content: message column on the left, the two display pictures down the
          right edge spanning the full height — exactly the MSN split. */}
      <div style={{ ...SIDE_BORDERS, flex: 1, minHeight: 0, display: 'flex', background: '#fff' }}>
        {/* left: To header → transcript → format strip → input */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* To: header inside the white area */}
          <div style={{ flexShrink: 0, padding: '4px 10px', borderBottom: '1px solid #e2e9f3', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: '#5a7398' }}>To:</span>
            <span style={{ color: '#0a3a8c', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <RichText text={contact.name} size={13} /> <span style={{ color: '#7a8aa0', fontWeight: 'normal' }}>&lt;{contact.handle}&gt;</span>
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#7a8aa0', fontSize: 10, flexShrink: 0 }}>
              <StatusIcon status={contact.status} size={11} /> {info.label}
            </span>
          </div>

          {/* transcript */}
          <div ref={logRef} className="msn-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 10px', fontFamily: 'var(--msn-font)' }}>
            {chat.messages.map((m, i) =>
              m.kind === 'system' ? (
                <div key={i} style={{ textAlign: 'center', color: '#9a6a1a', fontSize: 10, margin: '6px 0', fontStyle: 'italic' }}>
                  {m.text}
                </div>
              ) : (
                <div key={i} style={{ marginBottom: 7 }}>
                  <div style={{ color: m.mine ? '#1a5fc8' : '#c8401a', fontWeight: 'bold', fontSize: 10 }}>
                    <RichText text={m.mine ? p.myName : contact.name} size={13} /> <span style={{ color: '#aaa', fontWeight: 'normal' }}>{m.time}</span>
                    {m.mine && m.delivery === 'sending' && <span style={{ color: '#aaa', fontWeight: 'normal' }}> · Sending…</span>}
                    {m.mine && m.delivery === 'failed' && (
                      <span
                        onClick={() => p.onResend(m.body)}
                        title="Message not delivered — click to try again"
                        style={{ color: '#c8401a', fontWeight: 'normal', cursor: 'pointer' }}
                      >
                        {' '}· ⚠ Not delivered — Retry
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--msn-color)', paddingLeft: 8, wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                    <RichText text={m.body} size={18} />
                  </div>
                </div>
              ),
            )}
          </div>

          {/* typing indicator */}
          <div style={{ flexShrink: 0, padding: '0 10px', height: 14, color: '#888', fontSize: 10, fontStyle: 'italic' }}>
            {chat.typing ? `${contact.name} is writing a message...` : ''}
          </div>

          {/* emoticon palette */}
          {chat.emojiOpen && (
            <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #c8d4e6', padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {EMOTICON_LIST.map((e) => (
                <div
                  key={e.code}
                  className="msn-toolbtn"
                  onClick={() => pickEmoji(e.code)}
                  title={`${e.name}  ${e.code}`}
                  style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid transparent', borderRadius: 3 }}
                >
                  <Emoticon code={e.code} size={20} />
                </div>
              ))}
            </div>
          )}

          {/* formatting strip just above the input */}
          <div
            style={{
              flexShrink: 0,
              background: 'linear-gradient(180deg,#fbfdff,#e9f0fa)',
              borderTop: '1px solid #d6e0ee',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '3px 6px',
            }}
          >
            <div className="msn-toolbtn" onClick={p.onOpenFont} title="Change my message font" style={{ ...FMT_BTN, fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 13, color: '#1a4a9c', padding: '0 6px' }}>A</div>
            <div className="msn-toolbtn" onClick={p.onToggleEmoji} title="Emoticons" style={FMT_BTN}>
              <Emoticon code=":)" size={15} />
            </div>
            <div style={SEP} />
            <div className="msn-toolbtn" title="Record a voice clip" style={FMT_BTN}>
              <img src={voiceClipIcon} style={FMT_ICON} alt="" /> Voice Clip
            </div>
            <div style={SEP} />
            <div className="msn-toolbtn" onClick={p.onNudge} title="Send a Nudge" style={FMT_BTN}>
              <img src={nudgeIcon} style={FMT_ICON} alt="" /> Nudge
            </div>
            <div className="msn-toolbtn" onClick={p.onWink} title="Send a Wink" style={FMT_BTN}>
              <img src={winkIcon} style={FMT_ICON} alt="" /> Winks
            </div>
          </div>

          {/* input + the Send / Search button column */}
          <div style={{ flexShrink: 0, background: '#fff', padding: '7px 8px 8px', display: 'flex', gap: 7, alignItems: 'stretch' }}>
            <textarea
              ref={inputRef}
              value={chat.draft}
              onChange={(e) => p.onDraft(e.target.value)}
              onKeyDown={p.onKeyDown}
              placeholder="Type a message"
              style={{
                flex: 1,
                height: 50,
                resize: 'none',
                padding: '5px 6px',
                border: '1px solid #9bb0d0',
                fontFamily: 'var(--msn-font)',
                fontSize: 11,
                color: 'var(--msn-color)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 66, flexShrink: 0 }}>
              <button onClick={p.onSend} style={{ ...GREEN_BTN, flex: 1 }}>Send</button>
              <button title="Find a message" style={{ ...GREEN_BTN, flex: 1, color: '#33476a', background: 'linear-gradient(180deg,#fdfefe,#dfe8f4)', border: '1px solid #9bb0d0' }}>Search</button>
            </div>
          </div>
        </div>

        {/* right: display pictures down the full height (contact on top, me below) */}
        <div
          style={{
            width: 92,
            flexShrink: 0,
            background: 'linear-gradient(180deg,#dfeafa,#c2d6ef)',
            borderLeft: '1px solid #a8bcd8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
          }}
        >
          <DisplayPicture pic={contact.avatar} status={contact.status} label={contact.name} />
          <DisplayPicture pic={p.myAvatar} status="online" label={p.myName} />
        </div>
      </div>

      {/* footer */}
      <div style={{ position: 'relative', flexShrink: 0, background: 'linear-gradient(180deg,#f4f8fd,#dde8f5)', border: '1px solid #06387c', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '4px 9px', color: '#7a8aa0', fontSize: 10 }}>
        {contact.status === 'offline' ? 'This contact is offline. Your message will arrive when they reconnect.' : 'This conversation is private and encrypted'}
        {/* resize grip — desktop only; the mobile view is full-screen */}
        {!mobile && (
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
        )}
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
