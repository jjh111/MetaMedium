// One door for every file (V1-SPEC IN1, `ingest(bytes, name)`).
//
// Bytes come in, and an ink document comes out, or a reason it did not. The adapter is chosen by what the bytes
// are — a picture by its header, an SVG by its root element, a note because it is text — and never by the name
// alone: a PNG called `.svg` is a PNG, an SVG called `.png` is an SVG. The name is asked only to tell a note from
// other text (a file of JSON is text, but it is not a note), and is kept as the document's own.
//
// What is not here yet says so: a PDF is IN2 (pdf.js, a unit of its own) and InkML is IN3.
//
// Nothing here throws, whatever it is handed: a result is `{ ok: true, doc, notes }` or `{ ok: false, reason }`
// with the reason as a sentence a person can be told (DATA-1).

import { type IngestResult, type IngestOptions, type IngestLimits, DEFAULT_LIMITS, isHash, refuse } from './source';
import { sha256Hex } from './sha256';
import { sniffImage, ingestRaster } from './raster';
import { ingestSvg } from './svg';
import { ingestMarkdown } from './markdown';

export * from './source';
export { sha256Hex } from './sha256';
export { sniffImage, shownSize, ingestRaster, MAX_PICTURE_PX } from './raster';
export type { ImageInfo } from './raster';
export { ingestSvg, fromBase64, FREEFORM_NODES } from './svg';
export { ingestMarkdown } from './markdown';
export {
  recoverFill, inkStep, FAITHFUL_AT, NEAR_AT, RASTER_PEN_PX, DOT_MAX_PX, PEN_ELONGATION, CAP_WINDOW, CAP_TURN, MAX_CAP_CANDIDATES, MAX_CAP_PAIRS,
} from './ink-outline';
export type { Fill, FillRule, RecoveredStroke, Attempt, OutlineRecovery, RecoverOptions } from './ink-outline';

const fmt = (n: number) => (n < 1024 ? `${n} bytes` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const startsWith = (b: Uint8Array, ...bytes: number[]) => bytes.every((v, i) => b[i] === v);
const asciiAt = (b: Uint8Array, s: string, from = 0) => {
  for (let i = 0; i < s.length; i++) if (b[from + i] !== s.charCodeAt(i)) return false;
  return true;
};

/** The first element's name in some XML text, past a prolog, comments and a doctype; null when there is no element. */
function rootOf(head: string): string | null {
  let i = head.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (;;) {
    while (i < head.length && /\s/.test(head[i])) i++;
    if (head.startsWith('<?', i)) { const e = head.indexOf('?>', i); if (e < 0) return null; i = e + 2; continue; }
    if (head.startsWith('<!--', i)) { const e = head.indexOf('-->', i); if (e < 0) return null; i = e + 3; continue; }
    if (head.startsWith('<!', i)) {
      let depth = 0, quote = '', j = i + 2;
      for (; j < head.length; j++) {
        const c = head[j];
        if (quote) { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === "'") quote = c;
        else if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '>' && depth <= 0) break;
      }
      if (j >= head.length) return null;
      i = j + 1;
      continue;
    }
    break;
  }
  const m = /^<([A-Za-z_][\w:.-]*)/.exec(head.slice(i));
  return m ? m[1].replace(/^svg:/, '') : null;
}

/** A PDF begins `%PDF-`; a reader also accepts it within the first kilobyte if the file ends the way a PDF does. */
function isPdf(b: Uint8Array): boolean {
  if (asciiAt(b, '%PDF-')) return true;
  const latin = new TextDecoder('latin1');
  return latin.decode(b.subarray(0, 1024)).includes('%PDF-') && latin.decode(b.subarray(Math.max(0, b.length - 2048))).includes('%%EOF');
}

const NOTE_NAMES = /\.(?:md|markdown|mdown|txt|text)$/i;

export function ingest(input: Uint8Array | ArrayBuffer, name: string, opts: IngestOptions = {}): IngestResult {
  try {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
    if (!(bytes instanceof Uint8Array)) return refuse('ingest takes a file’s bytes, and was handed something else');
    const label = typeof name === 'string' && name ? name : 'untitled';
    if (bytes.length === 0) return refuse('that file is empty');
    const limits: IngestLimits = { ...DEFAULT_LIMITS, ...opts.limits };
    if (bytes.length > limits.bytes) return refuse(`that file is ${fmt(bytes.length)} — over the ${fmt(limits.bytes)} limit on what is read`);
    const hash = opts.hash && isHash(opts.hash) ? opts.hash : sha256Hex(bytes);

    // Pictures are known by their headers.
    const image = sniffImage(bytes);
    if (image) return ingestRaster(bytes, label, hash);
    // Other things with a signature of their own.
    if (isPdf(bytes)) return refuse('a PDF is not read yet — not yet — IN2 brings a PDF’s ink, pages and words in');
    if (startsWith(bytes, 0x1f, 0x8b)) return refuse('that file is compressed (gzip, as a .svgz is) — unpack it first; compressed files are not read');
    if (startsWith(bytes, 0x50, 0x4b, 0x03, 0x04) || startsWith(bytes, 0x50, 0x4b, 0x05, 0x06)) {
      return refuse('that is a zip file — a board’s own bundle opens with From a file…; other archives are not read');
    }

    // The rest is read as text, looked at at its head first.
    const head = bytes.subarray(0, 8192);
    let text: string;
    if (startsWith(bytes, 0xff, 0xfe) || startsWith(bytes, 0xfe, 0xff)) text = new TextDecoder(bytes[0] === 0xff ? 'utf-16le' : 'utf-16be').decode(head);
    else {
      let nul = 0, ctl = 0;
      for (const v of head) { if (v === 0) nul++; else if (v < 9 || (v > 13 && v < 32)) ctl++; }
      if (nul > 0 || ctl > head.length * 0.02) return refuse(`those bytes are not a file dyna.ink reads — not a picture, an SVG or a note (${fmt(bytes.length)})`);
      text = new TextDecoder('utf-8').decode(head);
    }
    const root = text.trimStart().startsWith('<') || text.charCodeAt(0) === 0xfeff ? rootOf(text) : null;
    if (root === 'svg') return ingestSvg(bytes, label, hash, opts);
    if (root && /^ink$/i.test(root.replace(/^.*:/, ''))) return refuse('InkML is not read yet — not yet — IN3 brings InkML’s traces, times and pressures in');
    if (root && root.toLowerCase() === 'html') {
      if (!NOTE_NAMES.test(label)) return refuse(`that is an HTML page, not a drawing or a note${/\.svg$/i.test(label) ? ' — its name says .svg but its root is <html>' : ''}`);
    } else if (root && !NOTE_NAMES.test(label)) {
      return refuse(`that is XML whose root is <${root}>, which is not read${/\.svg$/i.test(label) ? ' — its name says .svg but it is not an SVG' : ''}`);
    }
    if (NOTE_NAMES.test(label) || !/\.[A-Za-z0-9]{1,8}$/.test(label)) return ingestMarkdown(bytes, label, hash, opts);
    const ext = /(\.[A-Za-z0-9]{1,8})$/.exec(label)![1];
    return refuse(`that looks like text, but its name says ${ext} — only Markdown notes and plain text (.md, .txt) are brought in as notes`);
  } catch (err) {
    return refuse('that file could not be read: ' + (err instanceof Error ? err.message : String(err)));
  }
}
