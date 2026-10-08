// Pictures, by their own headers (V1-SPEC IN1: `raster.ts` — pictures as I1 keeps them).
//
// A PNG, a JPEG or a WebP is known by its first bytes, never by what it is called, and its size is read from
// the header by hand — no image library, no canvas. A phone's JPEG is stored the way the sensor saw it and turned
// by a tag when it is shown, and I1 keeps pictures turned (`createImageBitmap`'s `from-image`), so the size this
// reports is the size on show: width and height swap for the four turned orientations.
//
// The document a picture makes is one page of its own size holding one picture with its bytes. Nothing is
// decoded, traced or kept here: that is the surface's (PLAN-IPAD-NOTES I1, `18-images.js`), and tracing is
// only ever done on request.
//
// Read, not trusted (DATA-1): every read is bounds-checked, and bytes that are not a picture, or whose size
// cannot be read, are a refusal with the reason.

import { type IngestResult, type InkDocument, type SourceFormat, accept, blankPage, refuse } from './source';

export interface ImageInfo {
  format: 'png' | 'jpeg' | 'webp' | 'gif';
  mime: string;
  /** The size stored in the file, in pixels; 0 when a JPEG's frame was not found. */
  w: number;
  h: number;
  /** The EXIF orientation of a JPEG, 1–8; 1 when it says nothing. */
  orientation: number;
}

/** The most pixels a picture may have: 16,384 on a side. Past it a browser's decoder is not to be asked. */
export const MAX_PICTURE_PX = 268_435_456;

const at = (b: Uint8Array, i: number) => (i >= 0 && i < b.length ? b[i] : 0);
const le16 = (b: Uint8Array, i: number) => at(b, i) | (at(b, i + 1) << 8);
const be16 = (b: Uint8Array, i: number) => (at(b, i) << 8) | at(b, i + 1);
const be32 = (b: Uint8Array, i: number) => at(b, i) * 16777216 + (at(b, i + 1) << 16) + (at(b, i + 2) << 8) + at(b, i + 3);
const tag = (b: Uint8Array, i: number, s: string) => {
  if (i < 0 || i + s.length > b.length) return false;
  for (let k = 0; k < s.length; k++) if (b[i + k] !== s.charCodeAt(k)) return false;
  return true;
};

/** The orientation tag of a JPEG's EXIF block, which starts at `i` (just past the `Exif\0\0`); 1 when there is none to read. */
function exifOrientation(b: Uint8Array, i: number, end: number): number {
  const little = at(b, i) === 0x49 && at(b, i + 1) === 0x49;
  const big = at(b, i) === 0x4d && at(b, i + 1) === 0x4d;
  if (!little && !big) return 1;
  const r16 = (p: number) => (little ? le16(b, p) : be16(b, p));
  const r32 = (p: number) => (little ? (le16(b, p) | (le16(b, p + 2) << 16)) >>> 0 : be32(b, p));
  if (r16(i + 2) !== 42) return 1;
  const ifd = i + r32(i + 4);
  if (ifd < i || ifd + 2 > end) return 1;
  const count = Math.min(r16(ifd), 64);
  for (let k = 0; k < count; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > end) break;
    if (r16(e) === 0x0112 && r16(e + 2) === 3) {
      const v = r16(e + 8);
      return v >= 1 && v <= 8 ? v : 1;
    }
  }
  return 1;
}

/** What a picture's own header says it is: a PNG, JPEG, WebP or GIF with its stored size, or null for bytes that are none of them. */
export function sniffImage(b: Uint8Array): ImageInfo | null {
  if (!b || b.length < 4) return null;
  if (b.length >= 24 && b[0] === 0x89 && tag(b, 1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a && tag(b, 12, 'IHDR')) {
    return { format: 'png', mime: 'image/png', w: be32(b, 16), h: be32(b, 20), orientation: 1 };
  }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let orientation = 1;
    let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0x00) { i += 2; continue; }
      if (m === 0xd9 || m === 0xda) break;
      const len = be16(b, i + 2);
      if (m === 0xe1 && tag(b, i + 4, 'Exif\0\0')) orientation = exifOrientation(b, i + 10, Math.min(b.length, i + 2 + len));
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { format: 'jpeg', mime: 'image/jpeg', w: be16(b, i + 7), h: be16(b, i + 5), orientation };
      }
      i += 2 + Math.max(2, len);
    }
    return { format: 'jpeg', mime: 'image/jpeg', w: 0, h: 0, orientation };
  }
  if (b.length >= 25 && tag(b, 0, 'RIFF') && tag(b, 8, 'WEBP')) {
    if (b.length >= 30 && tag(b, 12, 'VP8X')) {
      return { format: 'webp', mime: 'image/webp', w: 1 + (at(b, 24) | (at(b, 25) << 8) | (at(b, 26) << 16)), h: 1 + (at(b, 27) | (at(b, 28) << 8) | (at(b, 29) << 16)), orientation: 1 };
    }
    if (tag(b, 12, 'VP8L') && b[20] === 0x2f) {
      const bits = (at(b, 21) | (at(b, 22) << 8) | (at(b, 23) << 16) | (at(b, 24) * 16777216)) >>> 0;
      return { format: 'webp', mime: 'image/webp', w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff), orientation: 1 };
    }
    if (b.length >= 30 && tag(b, 12, 'VP8 ') && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
      return { format: 'webp', mime: 'image/webp', w: le16(b, 26) & 0x3fff, h: le16(b, 28) & 0x3fff, orientation: 1 };
    }
    return null;
  }
  if (b.length >= 10 && (tag(b, 0, 'GIF87a') || tag(b, 0, 'GIF89a'))) {
    return { format: 'gif', mime: 'image/gif', w: le16(b, 6), h: le16(b, 8), orientation: 1 };
  }
  return null;
}

/** A picture's size as it is shown: width and height swap when its orientation turns it a quarter. */
export function shownSize(info: ImageInfo): { w: number; h: number } {
  return info.orientation >= 5 ? { w: info.h, h: info.w } : { w: info.w, h: info.h };
}

/** A picture file as a document: one page of its size, one picture with its bytes. */
export function ingestRaster(bytes: Uint8Array, name: string, hash: string): IngestResult {
  const info = sniffImage(bytes);
  if (!info) return refuse('those bytes are not a PNG, JPEG or WebP picture');
  if (info.format === 'gif') return refuse('a GIF is not brought in — save it as a PNG, JPEG or WebP first');
  if (!(info.w > 0) || !(info.h > 0)) return refuse(`the ${info.format.toUpperCase()}'s size could not be read — the file may be cut short`);
  if (info.w * info.h > MAX_PICTURE_PX) return refuse(`the picture is ${info.w.toLocaleString('en')} × ${info.h.toLocaleString('en')} pixels, more than a browser can be asked to decode`);
  const { w, h } = shownSize(info);
  const page = blankPage(0, w, h);
  page.pictures.push({ order: 0, box: { x: 0, y: 0, w, h }, bytes, mime: info.mime, w, h, name });
  const notes: string[] = [];
  if (info.orientation > 1) notes.push(`the picture is stored turned (EXIF orientation ${info.orientation}); its size is given as shown`);
  const doc: InkDocument = {
    source: { hash, name, format: info.format as SourceFormat },
    pages: [page],
    reading: { as: 'picture', evidence: { width: w, height: h, bytes: bytes.length }, words: `a ${info.format.toUpperCase()} picture, ${w} × ${h} pixels` },
  };
  return accept(doc, notes);
}
