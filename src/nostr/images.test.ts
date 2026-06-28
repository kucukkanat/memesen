import { describe, expect, it } from 'bun:test';
import { fitWithin, isImageFile, MAX_EDGE } from './images';

describe('fitWithin', () => {
  it('leaves an image that already fits untouched (never upscales)', () => {
    expect(fitWithin(640, 480, MAX_EDGE)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(100, 100, 1024)).toEqual({ width: 100, height: 100 });
  });

  it('scales a landscape image to the longest-edge cap, preserving aspect', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
  });

  it('scales a portrait image by its height', () => {
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it('keeps a square square and never drops below one pixel', () => {
    expect(fitWithin(2048, 2048, 1024)).toEqual({ width: 1024, height: 1024 });
    expect(fitWithin(10000, 1, 1024)).toEqual({ width: 1024, height: 1 });
  });
});

describe('isImageFile', () => {
  const file = (type: string, size: number): File =>
    ({ type, size }) as File; // only `type`/`size` are read

  it('accepts a non-empty image file', () => {
    expect(isImageFile(file('image/png', 1234))).toBe(true);
    expect(isImageFile(file('image/jpeg', 1))).toBe(true);
  });

  it('rejects non-images and zero-byte files', () => {
    expect(isImageFile(file('application/pdf', 1234))).toBe(false);
    expect(isImageFile(file('text/plain', 10))).toBe(false);
    expect(isImageFile(file('image/png', 0))).toBe(false);
  });
});
