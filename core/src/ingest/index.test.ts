// The one door (V1-SPEC IN1, `ingest(bytes, name)`): the adapter is chosen by sniffing the bytes, never by the name
// alone; a PDF and InkML say they are not here yet; and nothing is ever thrown.

import { describe, it, expect } from 'vitest';
import { ingest } from './index';
import { sha256Hex } from './sha256';
import { makePng } from './fixtures/png';
import { VAULT } from './fixtures/vault';
import { mulberry32 } from '../packs/synthesize';

const enc = (s: string) => new TextEncoder().encode(s);
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><path d="M0 0 L99 49" stroke="#000"/></svg>';

const formatOf = (bytes: Uint8Array, name: string) => {
  const r = ingest(bytes, name);
  return r.ok ? r.doc.source.format : 'refused: ' + r.reason;
};

describe('the adapter is chosen by the bytes', () => {
  it('an SVG is an SVG whatever it is called, and a picture is a picture', () => {
    expect(formatOf(enc(SVG), 'drawing.svg')).toBe('svg');
    expect(formatOf(enc(SVG), 'drawing.png')).toBe('svg');
    expect(formatOf(enc(SVG), 'drawing')).toBe('svg');
    expect(formatOf(makePng(4, 3), 'cat.svg')).toBe('png');
    expect(formatOf(makePng(4, 3), 'cat')).toBe('png');
  });

  it('an SVG under a prolog, a comment and a doctype is found', () => {
    const t = '﻿<?xml version="1.0"?>\n<!-- made by hand -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd" [ <!ENTITY a "b"> ]>\n' + SVG;
    expect(formatOf(enc(t), 'a.txt')).toBe('svg');
  });

  it('a note is a note when it looks like text and is called one — or called nothing at all', () => {
    expect(formatOf(enc('# Note\n\nwords #tag [[Link]]'), 'Note.md')).toBe('markdown');
    expect(formatOf(enc('just some words'), 'Note.txt')).toBe('markdown');
    expect(formatOf(enc('just some words'), 'Note')).toBe('markdown');
    expect(formatOf(enc('<!-- a comment first -->\n# Note\n\nwords'), 'Note.md')).toBe('markdown');
  });

  it('text that is called something else is not taken for a note', () => {
    const r = ingest(enc('{"a": 1}'), 'data.json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/\.json|Markdown|\.md/);
  });

  it('every note of the vault comes in', () => {
    for (const n of VAULT) expect(formatOf(enc(n.text), n.name)).toBe('markdown');
  });
});

describe('what is not here yet says so', () => {
  it('a PDF is IN2', () => {
    const r = ingest(enc('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n'), 'Notes.pdf');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not yet — .*IN2/);
  });
  it('InkML is IN3', () => {
    const r = ingest(enc('<?xml version="1.0"?><ink xmlns="http://www.w3.org/2003/InkML"><trace>0 0, 1 1</trace></ink>'), 'page.inkml');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not yet — .*IN3/);
  });
  it('a note that only mentions a PDF’s first line is still a note', () => {
    expect(formatOf(enc('The file begins %PDF-1.7 and then a version.\n\nThat is all.'), 'pdf notes.md')).toBe('markdown');
  });
  it('a PDF named .svg is still a PDF', () => {
    const r = ingest(enc('%PDF-1.4\n'), 'fake.svg');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/IN2/);
  });
});

describe('what is not read is refused with the reason', () => {
  const why = (bytes: Uint8Array, name = 'x') => {
    const r = ingest(bytes, name);
    expect(r.ok).toBe(false);
    return r.ok ? '' : r.reason;
  };
  it('nothing, a GIF, a zip, a compressed file, an HTML page, and bytes with no meaning', () => {
    expect(why(new Uint8Array(0))).toMatch(/empty/);
    expect(why(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 2, 0, 2, 0, 0, 0]), 'a.gif')).toMatch(/GIF/);
    expect(why(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 0, 0, 0, 0]), 'a.zip')).toMatch(/zip/i);
    expect(why(new Uint8Array([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 3]), 'a.svgz')).toMatch(/compress|gzip/i);
    expect(why(enc('<html><body>hello</body></html>'), 'a.html')).toMatch(/html/i);
    const noise = new Uint8Array(500);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 91 + 17) & 255;
    expect(why(noise)).toMatch(/not a file|read/i);
  });
  it('a file that is too big is turned away before anything is done to it', () => {
    const r = ingest(new Uint8Array(1000), 'big.png', { limits: { bytes: 500 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/limit|big|large/i);
  });
  it('something that is not bytes', () => {
    for (const bad of [null, undefined, 'a string', 42, {}, [1, 2, 3]]) {
      const r = ingest(bad as unknown as Uint8Array, 'x');
      expect(r.ok).toBe(false);
    }
  });
  it('a view of a buffer is bytes, with its offset and length', () => {
    const png = makePng(2, 2);
    const padded = new Uint8Array(png.length + 20);
    padded.set(png, 11);
    const r = ingest(new DataView(padded.buffer, 11, png.length), 'x.png');
    expect(r.ok).toBe(true);
    const r2 = ingest(padded.subarray(11, 11 + png.length), 'x.png');
    expect(r2.ok && r2.doc.source.hash).toBe(sha256Hex(png));
  });
  it('an ArrayBuffer is bytes', () => {
    const png = makePng(2, 2);
    const r = ingest(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer, 'x.png');
    expect(r.ok).toBe(true);
  });
});

describe('where a document came from', () => {
  it('the hash is the SHA-256 of the bytes, taken from the caller when they have it', () => {
    const bytes = enc(SVG);
    const own = ingest(bytes, 'a.svg');
    expect(own.ok && own.doc.source.hash).toBe(sha256Hex(bytes));
    const given = 'ab'.repeat(32);
    const asked = ingest(bytes, 'a.svg', { hash: given });
    expect(asked.ok && asked.doc.source.hash).toBe(given);
    const bogus = ingest(bytes, 'a.svg', { hash: 'not a hash' });
    expect(bogus.ok && bogus.doc.source.hash).toBe(sha256Hex(bytes));
  });

  it('each adapter says which version of itself read the file, so a better one can read it again and the two be compared', () => {
    const adapters = (name: string, bytes: Uint8Array) => { const r = ingest(bytes, name); return r.ok ? r.doc.adapter : 'refused'; };
    expect(adapters('a.svg', enc(SVG))).toBe('svg@1');
    expect(adapters('a.md', enc('# Hi'))).toBe('markdown@1');
    expect(adapters('a.png', makePng(3, 3))).toBe('raster@1');
  });

  it('the name goes with it, as it arrived', () => {
    const r = ingest(enc(SVG), 'Sketches/page 3.svg');
    expect(r.ok && r.doc.source.name).toBe('Sketches/page 3.svg');
  });
});

describe('nothing is ever thrown', () => {
  it('random bytes, prefixes of real files, and files with a few bytes changed', () => {
    const rnd = mulberry32(2026);
    const real = [enc(SVG), makePng(5, 5), enc(VAULT[1].text), enc('%PDF-1.4 hello'), enc('<ink xmlns="http://www.w3.org/2003/InkML"/>')];
    for (let n = 0; n < 300; n++) {
      let bytes: Uint8Array;
      if (n % 3 === 0) {
        bytes = new Uint8Array(Math.floor(rnd() * 300));
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(rnd() * 256);
      } else {
        const base = real[n % real.length];
        bytes = base.slice(0, Math.floor(rnd() * (base.length + 1)));
        for (let k = 0; k < 2 && bytes.length; k++) bytes[Math.floor(rnd() * bytes.length)] = Math.floor(rnd() * 256);
      }
      const name = ['a.svg', 'a.png', 'a.md', 'a', 'a.pdf', ''][n % 6];
      const r = ingest(bytes, name);
      expect(typeof r.ok).toBe('boolean');
      if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
    }
  });
});
