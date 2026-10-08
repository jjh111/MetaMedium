// Pictures by their own headers (V1-SPEC IN1, `raster.ts`): a PNG, a JPEG or a WebP is known by its first bytes,
// its size is read by hand, and a phone’s turned photo is given the size it is shown at.

import { describe, it, expect } from 'vitest';
import { sniffImage, ingestRaster, shownSize } from './raster';
import { sha256Hex } from './sha256';
import { makePng } from './fixtures/png';
import { mulberry32 } from '../packs/synthesize';

/** A JPEG that is only its headers: the start, an EXIF block saying how it is turned (if asked), a frame of the size given. */
function jpeg(w: number, h: number, orientation?: number): Uint8Array {
  const out: number[] = [0xff, 0xd8];
  if (orientation !== undefined) {
    const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0];
    const len = exif.length + 2;
    out.push(0xff, 0xe1, len >> 8, len & 255, ...exif);
  }
  out.push(0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1);
  out.push(0xff, 0xda, 0, 12, 3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0, 0xff, 0xd9);
  return new Uint8Array(out);
}

/** An extended WebP header of the size given. */
function webp(w: number, h: number): Uint8Array {
  const b = new Uint8Array(30);
  b.set([0x52, 0x49, 0x46, 0x46, 22, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0], 0);
  const x = w - 1, y = h - 1;
  b.set([x & 255, (x >> 8) & 255, (x >> 16) & 255, y & 255, (y >> 8) & 255, (y >> 16) & 255], 24);
  return b;
}

describe('knowing a picture by its header', () => {
  it('a PNG, a JPEG and a WebP, each with the size its header gives', () => {
    expect(sniffImage(makePng(30, 20))).toMatchObject({ format: 'png', mime: 'image/png', w: 30, h: 20 });
    expect(sniffImage(jpeg(640, 480))).toMatchObject({ format: 'jpeg', mime: 'image/jpeg', w: 640, h: 480, orientation: 1 });
    expect(sniffImage(webp(800, 600))).toMatchObject({ format: 'webp', mime: 'image/webp', w: 800, h: 600 });
  });

  it('a JPEG says how it is turned, and is shown at the size that turns it', () => {
    const info = sniffImage(jpeg(4000, 3000, 6))!;
    expect(info.orientation).toBe(6);
    expect(shownSize(info)).toEqual({ w: 3000, h: 4000 });
    expect(shownSize(sniffImage(jpeg(4000, 3000, 3))!)).toEqual({ w: 4000, h: 3000 });
    expect(shownSize(sniffImage(jpeg(4000, 3000, 8))!)).toEqual({ w: 3000, h: 4000 });
    expect(sniffImage(jpeg(4000, 3000, 9))!.orientation).toBe(1);
  });

  it('bytes that are not a picture are none, however they are named', () => {
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it('truncated or mangled at every length it never throws', () => {
    const rnd = mulberry32(5);
    for (const full of [makePng(9, 9), jpeg(10, 10, 6), webp(11, 11)]) {
      for (let n = 0; n <= full.length; n++) expect(() => sniffImage(full.subarray(0, n))).not.toThrow();
      for (let k = 0; k < 100; k++) {
        const copy = full.slice();
        for (let j = 0; j < 3; j++) copy[Math.floor(rnd() * copy.length)] = Math.floor(rnd() * 256);
        expect(() => sniffImage(copy)).not.toThrow();
      }
    }
  });
});

describe('a picture as a document', () => {
  it('is one page of its size holding one picture with its bytes, and says where it came from', () => {
    const png = makePng(30, 20);
    const r = ingestRaster(png, 'photo.png', sha256Hex(png));
    if (!r.ok) throw new Error(r.reason);
    const { doc } = r;
    expect(doc.source).toMatchObject({ name: 'photo.png', format: 'png', hash: sha256Hex(png) });
    expect(doc.pages).toHaveLength(1);
    expect([doc.pages[0].width, doc.pages[0].height]).toEqual([30, 20]);
    expect(doc.pages[0].strokes).toHaveLength(0);
    expect(doc.pages[0].pictures).toHaveLength(1);
    expect(doc.pages[0].pictures[0]).toMatchObject({ box: { x: 0, y: 0, w: 30, h: 20 }, mime: 'image/png', w: 30, h: 20, name: 'photo.png' });
    expect(doc.pages[0].pictures[0].bytes).toBe(png);
    expect(doc.reading.as).toBe('picture');
  });

  it('a turned photo is a page the shape it is shown, and says so', () => {
    const j = jpeg(4000, 3000, 6);
    const r = ingestRaster(j, 'IMG_0001.JPG', sha256Hex(j));
    if (!r.ok) throw new Error(r.reason);
    expect([r.doc.pages[0].width, r.doc.pages[0].height]).toEqual([3000, 4000]);
    expect(r.doc.source.format).toBe('jpeg');
    expect(r.notes.join(' ')).toMatch(/orientation|turned/i);
  });

  it('is refused, with the reason, when it is a GIF, has no size, is enormous, or is not a picture', () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 2, 0, 2, 0, 0, 0]);
    const cases: [Uint8Array, RegExp][] = [
      [gif, /GIF/],
      [new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 3, 0, 0xff, 0xd9]), /size/],
      [jpeg(40000, 40000), /pixels|decode/],
      [new TextEncoder().encode('hello there'), /not a/],
    ];
    for (const [bytes, why] of cases) {
      const r = ingestRaster(bytes, 'x', sha256Hex(bytes));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(why);
    }
  });
});
