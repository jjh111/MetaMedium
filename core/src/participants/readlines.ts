// Reading my notes (PLAN-IPAD-NOTES I8): the pure parts.
//
// A page of handwriting is read a LINE at a time, as one picture, because a phrase is read better than
// its words (SURFACE-v10-PLAN D3) — and read in a BATCH, because a call to a reader costs a round trip
// and a model's start-up, and a page is a dozen lines. What is asked of a reader is the engine's own
// work, done first: which marks are a line (`writingLines`, the `writing` concept's bands, one home),
// each line drawn cleanly from ITS OWN strokes at one height on a sheet of numbered rows, and the reply
// read back line by line. None of it touches the board; the agent holds what comes back
// (`agent.readLines`) and a surface draws the sheet (`sheetOf` says where every point and numeral go).
//
// ONE IMAGE, NUMBERED LINES — not one image a line. A small vision model reads a single picture far
// better than several (many take one image a message, a provider may cap them, and each image is a
// tile of tokens and a place to lose track of which is which); a numbered margin gives the reply a key
// that cannot slip; one fixed line height gives every line the same size however it was written; and
// the sheet is capped well inside what readers take (`SHEET_MAX_PX`), so no reader downscales it. The
// reply is a JSON array, an object a line — the contract below.

import type { Point, Bounds } from '../types';
import type { Mark } from '../relate/relations';
import type { MMNode } from '../session/nodes';
import { boundsOf, isWord, lettersOf, strokePointsOf } from '../session/nodes';
import type { SessionState } from '../session/session';
import { writingLines } from '../concepts/concept';
import { isErased, isWritingMark } from '../tools/board';
import type { TranscriptReading } from './agent';

/** The most lines asked in one call: a small model reads eight lines on one sheet; more and it loses its place. */
export const LINES_PER_CALL = 8;
/** The ink of every line is drawn this tall on the sheet, whatever size it was written: one size for the reader. */
export const LINE_PX = 72;
/** Space round a line's ink within its row. */
export const ROW_PAD_PX = 12;
/** The margin the numerals stand in, left of the ink. */
export const NUMBER_PX = 56;
/** The widest and the tallest a sheet may be — under what hosted readers take without scaling it down. */
export const SHEET_MAX_PX = 1568;
/** The narrowest a sheet is made, so a line of one short word is not a sliver. */
export const SHEET_MIN_PX = 360;
/** One width for all ink: the pen's pressure is never drawn. */
export const SHEET_LINE_WIDTH = 3;

/** A line of handwriting: its marks left to right, their ink as runs of points as they stand, and the box they fill. */
export interface ReadLine {
  ids: string[];
  runs: Point[][];
  box: Bounds;
}

/** The ink of a mark as runs of points: a word is several strokes, a cursive word is one. */
function runsOf(nodes: ReadonlyMap<string, MMNode>, node: MMNode): Point[][] {
  const pts = (n: MMNode | undefined) => (n ? strokePointsOf(n) : undefined);
  const runs = isWord(node) ? lettersOf(node).map((id) => pts(nodes.get(id))) : [pts(node)];
  return runs.filter((p): p is Point[] => !!p && p.length > 1);
}

/**
 * Every line of handwriting among these marks, in reading order. Writing is the shape rung's own `text`
 * reading or a word the letters gathered into; whatever else is among the marks is left alone, and so is
 * a mark erased. Pure: nothing is written, and the same board says the same lines.
 */
export function writingLinesIn(state: Pick<SessionState, 'nodes'>, ids: readonly string[]): ReadLine[] {
  const marks: Mark[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const node = state.nodes.get(id);
    if (!node || isErased(node)) continue;
    if (!(isWord(node) || isWritingMark(node, state.nodes))) continue;
    const bounds = boundsOf(node);
    if (!bounds || !runsOf(state.nodes, node).length) continue;
    marks.push({ id, bounds } as Mark);
  }
  return writingLines(marks).map((line) => {
    const runs = line.flatMap((m) => runsOf(state.nodes, state.nodes.get(m.id)!));
    const all = runs.flat();
    return {
      ids: line.map((m) => m.id),
      runs,
      box: {
        minX: Math.min(...all.map((p) => p.x)), minY: Math.min(...all.map((p) => p.y)),
        maxX: Math.max(...all.map((p) => p.x)), maxY: Math.max(...all.map((p) => p.y)),
      },
    };
  });
}

/** Whether a line is read: every mark of it holds a transcript, or was read with its line (`isRead`, the host's). */
export function lineIsRead(line: Pick<ReadLine, 'ids'>, isRead: (id: string) => boolean): boolean {
  return line.ids.length > 0 && line.ids.every(isRead);
}

/** Split in order into calls of at most `per` lines. */
export function batchesOf<T>(items: readonly T[], per: number = LINES_PER_CALL): T[][] {
  const out: T[][] = [];
  const n = Math.max(1, Math.floor(per));
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

/** One row of the sheet: a line's ink in sheet pixels, and where its numeral stands. */
export interface LinesSheetRow {
  /** 1-based: the number the reply names the line by. */
  n: number;
  /** The top of the row. */
  y: number;
  /** The scale the line was drawn at: sheet pixels a world unit. */
  k: number;
  strokes: Point[][];
  /** Where the numeral is drawn (its left, and the middle of the row). */
  label: { x: number; y: number };
  /** The ink's width on the sheet. */
  w: number;
}

export interface LinesSheet {
  width: number;
  height: number;
  rowHeight: number;
  lineWidth: number;
  rows: LinesSheetRow[];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The sheet the lines are drawn on: one row each, numbered, the ink scaled to `LINE_PX` tall (or, for a line
 * too long for the sheet, as large as fits), centred in its row, black on white at one line width — the
 * surface draws it exactly as said. Pressure, time and everything else a point carries are left behind.
 */
export function sheetOf(lines: readonly Pick<ReadLine, 'runs' | 'box'>[]): LinesSheet {
  const rowHeight = LINE_PX + ROW_PAD_PX * 2;
  const inkMax = SHEET_MAX_PX - NUMBER_PX - ROW_PAD_PX * 2;
  const rows: LinesSheetRow[] = lines.map((l, i) => {
    const w = Math.max(1, l.box.maxX - l.box.minX);
    // A flat line has no height to scale by: give it the height a hand's line of that length has.
    const h = Math.max(l.box.maxY - l.box.minY, w / 40, 1);
    const k = Math.min(LINE_PX / h, inkMax / w);
    const inkW = w * k, inkH = h * k;
    const x0 = NUMBER_PX + ROW_PAD_PX, y0 = i * rowHeight + ROW_PAD_PX + (LINE_PX - inkH) / 2;
    return {
      n: i + 1, y: i * rowHeight, k,
      strokes: l.runs.map((run) => run.map((p) => ({ x: round1(x0 + (p.x - l.box.minX) * k), y: round1(y0 + (p.y - l.box.minY) * k) }))),
      label: { x: ROW_PAD_PX, y: i * rowHeight + rowHeight / 2 },
      w: inkW,
    };
  });
  const widest = rows.reduce((m, r) => Math.max(m, r.w), 0);
  return {
    width: Math.min(SHEET_MAX_PX, Math.max(SHEET_MIN_PX, Math.ceil(NUMBER_PX + ROW_PAD_PX * 2 + widest))),
    height: rowHeight * rows.length,
    rowHeight,
    lineWidth: SHEET_LINE_WIDTH,
    rows,
  };
}

/** What the sheet says to the reader, in words: how many lines, and which mark each is. The reader's contract is its system message. */
export function linesBrief(lines: readonly { ids: string[] }[]): string {
  const n = lines.length;
  return `The image is a sheet of ${n} numbered line${n === 1 ? '' : 's'} of handwriting, 1 to ${n}, top to bottom; each line's number is printed at its left. Transcribe every line.`;
}

/** The reader's contract for a batch: the numbered sheet in, a JSON array a line out. */
export const READ_LINES_PROMPT = `You are reading handwriting from a shared drawing canvas. The image is a sheet of numbered lines of handwriting, dark ink on a white ground, each line drawn from the human's own strokes at one size; its number is printed at its left, in the margin.

Transcribe every line, in the human's casing and punctuation. Read each line on its own: do not describe the image, do not guess at meaning, do not add words that are not there, and do not merge or split lines. If a line is ambiguous you may give a second object for the same line with a lower confidence.

Reply with ONLY a JSON array, no prose, no code fences, one object a line:
[{"line":1,"text":"what line 1 says","confidence":0.0-1.0},{"line":2,"text":"what line 2 says","confidence":0.0-1.0}]
A line you cannot read at all: {"line":3,"text":"","confidence":0}`;

/** The reader's contract for a photographed page: its text as lines. */
export const READ_PICTURE_PROMPT = `You are reading a photograph or a scan of a page from a shared drawing canvas — handwriting, print, or both.

Transcribe its text, top to bottom, one text for each line of the page, in the human's casing and punctuation. Leave out anything that is a drawing rather than writing, do not describe the image, do not guess at meaning and do not add words that are not there.

Reply with ONLY a JSON object, no prose, no code fences:
{"lines":["the first line","the second line"]}`;

const clamp01 = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
};

const unfence = (text: string) => text.replace(/```(?:json)?/gi, '').trim();

/** The JSON a reply holds: an array, or an object, as the first that parses between its outermost brackets. */
function jsonIn(text: string): unknown | undefined {
  for (const [open, close] of [['[', ']'], ['{', '}']] as const) {
    const a = text.indexOf(open), b = text.lastIndexOf(close);
    if (a === -1 || b < a) continue;
    try { return JSON.parse(text.slice(a, b + 1)); } catch { /* the other kind, or none */ }
  }
  return undefined;
}

/**
 * The reply to a sheet, line by line: for each of `count` lines, its readings best first — empty when the
 * reply said nothing for it, which is said, never invented. Tolerant, as every reader is, because a small
 * model wraps its JSON, writes an object for the array, answers by position with plain strings, or ignores
 * the JSON and numbers its lines: `parseLineReadings` takes each and returns what a line was given.
 */
export function parseLineReadings(text: string, count: number): TranscriptReading[][] {
  const out: TranscriptReading[][] = Array.from({ length: Math.max(0, count) }, () => []);
  if (!text || count < 1) return out;
  const clean = unfence(text);
  const put = (line: number, t: unknown, confidence: unknown) => {
    if (!Number.isInteger(line) || line < 1 || line > count) return;
    const said = typeof t === 'string' ? t.trim() : '';
    if (said) out[line - 1].push({ text: said, confidence: clamp01(confidence) });
  };
  const parsed = jsonIn(clean);
  let items: unknown[] | null = null;
  if (Array.isArray(parsed)) items = parsed;
  else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { lines?: unknown }).lines)) items = (parsed as { lines: unknown[] }).lines;
  if (items) {
    items.forEach((item, i) => {
      if (typeof item === 'string') { put(i + 1, item, 0.5); return; }
      if (!item || typeof item !== 'object') return;
      const rec = item as Record<string, unknown>;
      const said = typeof rec.text === 'string' ? rec.text : typeof rec.label === 'string' ? rec.label : '';
      const given = typeof rec.line === 'number' ? rec.line : typeof rec.line === 'string' && /^\d+$/.test(rec.line.trim()) ? Number(rec.line) : i + 1;
      put(given, said, rec.confidence);
    });
  } else {
    // Numbered plain lines: "1. hello", "2) world", "3: and so on".
    let any = false;
    for (const raw of clean.split(/\r?\n/)) {
      const m = /^\s*(\d+)\s*[.):\-]\s*(.+?)\s*$/.exec(raw);
      if (m) { put(Number(m[1]), m[2].replace(/^["'“]+|["'”]+$/g, ''), 0.5); any = true; }
    }
    // One line asked: a bare word is still an answer.
    if (!any && count === 1) {
      const bare = clean.replace(/^["'\s]+|["'\s]+$/g, '');
      if (bare && bare.length <= 200 && !/\n/.test(bare) && !/^the image|^i (can|cannot|can't)/i.test(bare)) put(1, bare, 0.5);
    }
  }
  return out.map((l) => l.sort((a, b) => b.confidence - a.confidence));
}

/** A photographed page's text, line by line: `{"lines": […]}`, an array of strings, or plain lines. */
export function parsePictureLines(text: string): string[] {
  if (!text) return [];
  const clean = unfence(text);
  const parsed = jsonIn(clean);
  const take = (list: unknown[]) => list.map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && typeof (x as { text?: unknown }).text === 'string' ? (x as { text: string }).text : '')).map((x) => x.trim()).filter(Boolean);
  if (Array.isArray(parsed)) return take(parsed);
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { lines?: unknown }).lines)) return take((parsed as { lines: unknown[] }).lines);
  if (/[[{]/.test(clean)) return [];
  return clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 400);
}
