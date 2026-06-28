// Turn a picked or pasted picture into something we can put inside an encrypted
// Nostr DM. A gift-wrapped event is encrypted twice and base64'd, so the raw
// bytes inflate ~1.9x on the wire; relays also cap event size. We therefore
// downscale + re-encode every image to a small JPEG `data:` URL before sending,
// trading a little fidelity for "it actually delivers across public relays".
//
// The browser-only canvas work lives here; the pure geometry (`fitWithin`) is
// split out and unit-tested. Validation of the resulting URL lives in `wire.ts`
// (`isImageDataUrl`) so both the encoder and decoder agree on what's renderable.

/** Longest-edge cap. 1024 keeps memes crisp without ballooning the payload. */
export const MAX_EDGE = 1024;
/**
 * Ceiling for the encoded `data:` URL string. ~96 KB of base64 ⇒ a gift wrap of
 * ~185 KB on the wire, comfortably under the size limit public relays enforce.
 */
export const MAX_DATA_URL_BYTES = 96 * 1024;

// Quality ladder tried at each size, then the size is shrunk and retried.
const QUALITY_STEPS: readonly number[] = [0.82, 0.7, 0.58, 0.45];
const MIN_EDGE = 320;

/**
 * Fit `width`×`height` inside a `maxSide`×`maxSide` box, preserving aspect ratio
 * and never upscaling. Pure — the testable core of the downscale step.
 */
export const fitWithin = (
  width: number,
  height: number,
  maxSide: number,
): { readonly width: number; readonly height: number } => {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

/** Whether a File is an image we'll accept (ignores empty/zero-byte entries). */
export const isImageFile = (file: File): boolean => file.type.startsWith('image/') && file.size > 0;

/**
 * Pull the image files out of a clipboard/drag payload, in order. Used by the
 * chat input's paste handler so copying a picture and hitting ⌘V just sends it.
 */
export const imageFilesFrom = (data: DataTransfer | null): File[] => {
  if (!data) return [];
  return Array.from(data.items)
    .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
    .map((it) => it.getAsFile())
    .filter((f): f is File => f !== null && f.size > 0);
};

/** Decode a File to a bitmap, honouring EXIF orientation where the browser can. */
const decode = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Some engines reject the options bag (or the codec); fall through.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const sizeOf = (src: ImageBitmap | HTMLImageElement): { width: number; height: number } =>
  'naturalWidth' in src
    ? { width: src.naturalWidth, height: src.naturalHeight }
    : { width: src.width, height: src.height };

/**
 * Downscale + JPEG-compress an image File to a `data:` URL no larger than
 * {@link MAX_DATA_URL_BYTES}. Walks the quality ladder, then shrinks the longest
 * edge and retries, so even a huge phone photo converges to a sendable size.
 * Resolves the smallest URL it produced (best-effort) and rejects only if the
 * file isn't a decodable image. Browser-only (needs canvas).
 */
export const processImage = async (file: File): Promise<string> => {
  if (!isImageFile(file)) throw new Error('not an image');
  const bitmap = await decode(file);
  const natural = sizeOf(bitmap);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  let smallest: string | null = null;
  for (let edge = MAX_EDGE; edge >= MIN_EDGE; edge = Math.floor(edge * 0.75)) {
    const { width, height } = fitWithin(natural.width, natural.height, edge);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    for (const q of QUALITY_STEPS) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (smallest === null || url.length < smallest.length) smallest = url;
      if (url.length <= MAX_DATA_URL_BYTES) {
        if ('close' in bitmap) bitmap.close();
        return url;
      }
    }
  }
  if ('close' in bitmap) bitmap.close();
  // Never produced anything under the cap (pathological input); send our best
  // effort rather than failing — relays may still accept a slightly larger event.
  if (smallest === null) throw new Error('encode failed');
  return smallest;
};
