import { describe, expect, it } from 'bun:test';
import { decodeWire, encodeWire } from './wire';

describe('wire — control codec', () => {
  it('round-trips plain text', () => {
    expect(decodeWire(encodeWire({ kind: 'text', body: 'hey :)' }))).toEqual({ kind: 'text', body: 'hey :)' });
  });

  it('round-trips a nudge', () => {
    expect(decodeWire(encodeWire({ kind: 'nudge', body: '' }))).toEqual({ kind: 'nudge', body: '' });
  });

  it('round-trips a wink with its glyph', () => {
    expect(decodeWire(encodeWire({ kind: 'wink', body: '🎉' }))).toEqual({ kind: 'wink', body: '🎉' });
  });

  it('treats ordinary text that merely mentions nudge as text', () => {
    expect(decodeWire('please nudge me')).toEqual({ kind: 'text', body: 'please nudge me' });
  });
});
