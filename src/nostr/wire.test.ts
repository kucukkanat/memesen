import { describe, expect, it } from 'bun:test';
import { decodeWire, encodeWire, isImageDataUrl } from './wire';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

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

  it('round-trips an image as its data URL', () => {
    expect(decodeWire(encodeWire({ kind: 'image', body: PNG }))).toEqual({ kind: 'image', body: PNG });
  });

  it('treats ordinary text that merely mentions nudge as text', () => {
    expect(decodeWire('please nudge me')).toEqual({ kind: 'text', body: 'please nudge me' });
  });

  it('refuses a non-image payload smuggled behind the image prefix (falls back to text)', () => {
    // A crafted DM trying to land javascript:/ html in an <img src> must not
    // decode as an image — it stays inert text.
    const evil = `img:javascript:alert(1)`;
    expect(decodeWire(evil)).toEqual({ kind: 'text', body: evil });
  });
});

describe('isImageDataUrl', () => {
  it('accepts a base64 image data URL', () => {
    expect(isImageDataUrl(PNG)).toBe(true);
    expect(isImageDataUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
  });

  it('rejects non-image and non-base64 URLs', () => {
    expect(isImageDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isImageDataUrl('https://example.com/cat.png')).toBe(false);
    expect(isImageDataUrl('javascript:alert(1)')).toBe(false);
    expect(isImageDataUrl('data:image/svg+xml,<svg/>')).toBe(false);
  });
});
