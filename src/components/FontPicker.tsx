import { useState } from 'react';
import { GREEN_BTN } from '../ui/chrome';
import { FONT_COLORS, FONT_OPTIONS } from '../ui/fonts';
import { Modal } from './Modal';

export interface FontPickerProps {
  readonly fontFamily: string;
  readonly fontColor: string;
  readonly onChoose: (fontFamily: string, fontColor: string) => void;
  readonly onClose: () => void;
}

/**
 * The MSN "Change My Message Font" dialog: pick one of the six classic fonts and
 * one of ten colours. The choice re-styles the contact list, chat history and the
 * message input (via the app-root CSS variables).
 */
export const FontPicker = (p: FontPickerProps) => {
  const [stack, setStack] = useState(p.fontFamily);
  const [color, setColor] = useState(p.fontColor);

  return (
    <Modal title="Change My Message Font" width={360} onClose={p.onClose} footer={
      <>
        <button onClick={p.onClose} style={{ ...GREEN_BTN, padding: '5px 16px', background: 'linear-gradient(180deg,#fdfdfd,#dfe6ef)', color: '#33476a', borderColor: '#9bb0d0' }}>Cancel</button>
        <button onClick={() => p.onChoose(stack, color)} style={{ ...GREEN_BTN, padding: '5px 22px' }}>OK</button>
      </>
    }>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ color: '#333', marginBottom: 5 }}>Font:</div>
        <div style={{ border: '1px solid #9bb0d0', borderRadius: 2, overflow: 'hidden' }}>
          {FONT_OPTIONS.map((f) => {
            const on = f.stack === stack;
            return (
              <div
                key={f.name}
                onClick={() => setStack(f.stack)}
                className="msn-row"
                style={{
                  padding: '5px 9px',
                  cursor: 'pointer',
                  fontFamily: f.stack,
                  fontSize: 14,
                  color: on ? '#fff' : '#1a1a1a',
                  background: on ? '#2d8bf5' : '#fff',
                }}
              >
                {f.name}
              </div>
            );
          })}
        </div>

        <div style={{ color: '#333', margin: '12px 0 5px' }}>Color:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FONT_COLORS.map((c) => {
            const on = c === color;
            return (
              <div
                key={c}
                onClick={() => setColor(c)}
                title={c}
                className="msn-toolbtn"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: c,
                  border: on ? '2px solid #1a3a6a' : '2px solid #cdd8e8',
                  boxShadow: on ? '0 0 0 1px #fff inset' : undefined,
                }}
              />
            );
          })}
        </div>

        <div style={{ color: '#333', margin: '14px 0 5px' }}>Preview:</div>
        <div
          style={{
            border: '1px solid #9bb0d0',
            borderRadius: 2,
            background: '#fff',
            padding: '10px 12px',
            minHeight: 44,
            fontFamily: stack,
            color,
            fontSize: 15,
          }}
        >
          The quick brown fox :) (Y)
        </div>
      </div>
    </Modal>
  );
};
