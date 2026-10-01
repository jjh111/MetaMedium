// Reading my notes (PLAN-IPAD-NOTES I8): every line of handwriting among some marks, rendered
// cleanly from its OWN strokes onto one numbered sheet, asked of the reader in a batch, and what
// comes back held per line. The pure parts: which marks are a line, the sheet a line is drawn on,
// the batches, the reply read back line by line — and `agent.readLines` / `agent.readPicture`
// against an injected transport, so no model is asked.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { handText, circleStroke } from '../test/strokes';
import { PRESETS, type ChatMessage } from '../llm/provider';
import { createAgentParticipant } from './agent';
import { transcriptsOf, strokePointsOf } from '../session/nodes';
import READ_LINES from '../llm/fixtures/read-lines.json';
import {
  writingLinesIn, sheetOf, batchesOf, parseLineReadings, parsePictureLines,
  LINES_PER_CALL, LINE_PX, SHEET_MAX_PX,
} from './readlines';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const seeing = { ...PRESETS.ollama, model: 'qwen3.5:9b', vision: true } as const;
const blind = { ...PRESETS.ollama, model: 'qwen3:8b' } as const;

/** A page of notes: line 1 is two words, line 2 one, line 3 one; a circle among them; strokes spaced far apart in time. */
function page() {
  const s = createSession();
  let at = 10_000;
  const w = (x: number, y: number, width: number, height: number, seed: number) => s.addStroke(handText(x, y, width, height, { seed }), (at += 10_000), undefined, 1);
  const a1 = w(100, 100, 160, 40, 1);
  const a2 = w(290, 100, 120, 40, 2);
  const b = w(100, 260, 260, 48, 3);
  const c = w(100, 420, 80, 30, 4);
  const ring = s.addStroke(circleStroke(600, 300, 40), (at += 10_000), undefined, 1);
  return { s, a1, a2, b, c, ring, all: [a1, a2, b, c, ring] };
}

const reply = (lines: { line?: number; text: string; confidence?: number }[]) => JSON.stringify(lines);

describe('writingLinesIn: every line of handwriting among some marks', () => {
  it('groups the words by line, top to bottom and left to right, and leaves what is not writing out', () => {
    const { s, a1, a2, b, c, all, ring } = page();
    const lines = writingLinesIn(s.getState(), all);
    expect(lines.map((l) => l.ids)).toEqual([[a1, a2], [b], [c]]);
    expect(lines.flatMap((l) => l.ids)).not.toContain(ring);
    // The ink of a line is the strokes of its marks, as they stand.
    expect(lines[0].runs).toHaveLength(2);
    expect(lines[0].runs[0]).toEqual(strokePointsOf(s.getState().nodes.get(a1)!));
    expect(lines[1].box.minX).toBeLessThan(lines[1].box.maxX);
  });

  it('only the marks it is given: a subset is read as the lines it holds', () => {
    const { s, b, c } = page();
    expect(writingLinesIn(s.getState(), [c, b]).map((l) => l.ids)).toEqual([[b], [c]]);
    expect(writingLinesIn(s.getState(), [])).toEqual([]);
  });

  it('a mark erased is not a line', () => {
    const { s, b, all } = page();
    s.erase(b, 99_000);
    expect(writingLinesIn(s.getState(), all).flatMap((l) => l.ids)).not.toContain(b);
  });
});

describe('sheetOf: the lines drawn cleanly, one numbered row each, at a fixed line height', () => {
  const run = (w: number, h: number) => [Array.from({ length: 30 }, (_, i) => ({ x: (i / 29) * w, y: (i % 2) * h }))];
  const line = (w: number, h: number, ids: string[] = ['x']) => ({ ids, runs: run(w, h), box: { minX: 0, minY: 0, maxX: w, maxY: h } });
  const inkHeight = (r: { strokes: { x: number; y: number }[][] }) => { const ys = r.strokes.flat().map((p) => p.y); return Math.max(...ys) - Math.min(...ys); };

  it('every line is scaled to the same height, however tall it was written, so the reader sees one size', () => {
    const sheet = sheetOf([line(400, 20), line(300, 90), line(500, 200)]);
    expect(sheet.rows).toHaveLength(3);
    for (const r of sheet.rows) expect(inkHeight(r)).toBeCloseTo(LINE_PX, 0);
    expect(sheet.rows.map((r) => r.n)).toEqual([1, 2, 3]);
    // Rows are stacked a row apart, in order, and the numeral stands in the margin left of the ink.
    expect(sheet.rows[1].y - sheet.rows[0].y).toBe(sheet.rowHeight);
    expect(sheet.height).toBe(sheet.rowHeight * 3);
    for (const r of sheet.rows) expect(r.label.x).toBeLessThan(Math.min(...r.strokes.flat().map((p) => p.x)));
  });

  it('a very long line is fitted to the sheet instead — it never makes a picture wider than a reader takes', () => {
    const sheet = sheetOf([line(40_000, 20), line(300, 90)]);
    expect(sheet.width).toBeLessThanOrEqual(SHEET_MAX_PX);
    expect(Math.max(...sheet.rows[0].strokes.flat().map((p) => p.x))).toBeLessThanOrEqual(SHEET_MAX_PX);
    expect(sheet.rows[0].k).toBeLessThan(1);
  });

  it('the pen’s pressure is ignored: the same ink with and without it makes the same sheet, at one line width', () => {
    const plain = line(400, 40);
    const pressed = { ...plain, runs: plain.runs.map((r) => r.map((p, i) => ({ ...p, p: (i % 10) / 10 }))) };
    expect(sheetOf([pressed])).toEqual(sheetOf([plain]));
    expect(typeof sheetOf([plain]).lineWidth).toBe('number');
  });

  it('is a pure function of its lines', () => {
    const lines = [line(400, 20), line(300, 90)];
    expect(sheetOf(lines)).toEqual(sheetOf(lines));
  });
});

describe('batchesOf: several lines a call, never more than a reader can hold', () => {
  it('splits in order, a call at most LINES_PER_CALL lines', () => {
    const items = Array.from({ length: LINES_PER_CALL + 2 }, (_, i) => i);
    const b = batchesOf(items);
    expect(b.map((x) => x.length)).toEqual([LINES_PER_CALL, 2]);
    expect(b.flat()).toEqual(items);
    expect(batchesOf([])).toEqual([]);
    expect(batchesOf([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });
});

describe('parseLineReadings: the reply, line by line', () => {
  it('reads the contract: one object a line, a second object under the same line a lower reading', () => {
    const out = parseLineReadings('[{"line":1,"text":"hello world","confidence":0.9},{"line":2,"text":"pricing","confidence":0.8},{"line":2,"text":"prizing","confidence":0.2},{"line":3,"text":"milk","confidence":0.7}]', 3);
    expect(out.map((l) => l.map((t) => t.text))).toEqual([['hello world'], ['pricing', 'prizing'], ['milk']]);
    expect(out[0][0].confidence).toBeCloseTo(0.9);
  });
  it('lines in any order, fences and prose around them, are read', () => {
    const out = parseLineReadings('Here you go:\n```json\n[{"line":2,"text":"b","confidence":0.5},{"line":1,"text":"a","confidence":0.5}]\n```\nDone.', 2);
    expect(out.map((l) => l.map((t) => t.text))).toEqual([['a'], ['b']]);
  });
  it('an object with lines, plain strings by position, and numbered plain lines are all answers', () => {
    expect(parseLineReadings('{"lines":[{"line":1,"text":"a"},{"line":2,"text":"b"}]}', 2).map((l) => l[0]?.text)).toEqual(['a', 'b']);
    expect(parseLineReadings('["a","b","c"]', 3).map((l) => l[0]?.text)).toEqual(['a', 'b', 'c']);
    expect(parseLineReadings('1. a\n2) b\n3: c d', 3).map((l) => l[0]?.text)).toEqual(['a', 'b', 'c d']);
  });
  it('a line the reply leaves out, or leaves empty, has no reading — said by an empty list, never invented', () => {
    const out = parseLineReadings('[{"line":1,"text":"a"},{"line":3,"text":"  ","confidence":0}]', 3);
    expect(out[0][0].text).toBe('a');
    expect(out[1]).toEqual([]);
    expect(out[2]).toEqual([]);
  });
  it('a line number past the sheet is dropped; a reply that is no answer is no reading on any line', () => {
    expect(parseLineReadings('[{"line":9,"text":"stray"}]', 2)).toEqual([[], []]);
    expect(parseLineReadings('The image shows some handwriting.', 2)).toEqual([[], []]);
    expect(parseLineReadings('', 2)).toEqual([[], []]);
  });
  it('one line asked, a bare word answers it', () => {
    expect(parseLineReadings('"hello"', 1)[0][0].text).toBe('hello');
  });
});

describe('parsePictureLines: a page’s text, one text a line', () => {
  it('reads {"lines": […]}, an array of strings, and plain lines', () => {
    expect(parsePictureLines('{"lines":["Monday","buy milk"]}')).toEqual(['Monday', 'buy milk']);
    expect(parsePictureLines('```json\n["a","b"]\n```')).toEqual(['a', 'b']);
    expect(parsePictureLines('Monday\n\nbuy milk\n')).toEqual(['Monday', 'buy milk']);
    expect(parsePictureLines('')).toEqual([]);
    expect(parsePictureLines('{"lines":[]}')).toEqual([]);
  });
});

/** An agent whose transport is ours: the messages it was sent are kept, and what it says is given. */
function readerWith(s: Session, config: typeof seeing | typeof blind, say: (messages: ChatMessage[]) => string | Error | Promise<string>) {
  const sent: ChatMessage[][] = [];
  const agent = createAgentParticipant(s, config, 1500, {
    transport: async (_c, messages) => {
      sent.push(messages);
      const said = await say(messages);
      return said instanceof Error ? { ok: false, error: said.message } : { ok: true, text: said, model: 'stub' };
    },
  });
  return { agent, sent };
}

describe('agent.readLines: one call, one picture, every line held where it was written', () => {
  const lineArgs = (p: ReturnType<typeof page>) => [{ nodeId: p.a1, ids: [p.a1, p.a2] }, { nodeId: p.b, ids: [p.b] }, { nodeId: p.c, ids: [p.c] }];

  it('sends the sheet once, as one image, with the numbered-lines contract and the lines said in words', async () => {
    const p = page();
    const { agent, sent } = readerWith(p.s, seeing, () => reply(READ_LINES.lines.slice(0, 3).map((l, i) => ({ line: i + 1, ...l }))));
    const res = await agent.readLines({ lines: lineArgs(p), image: PNG, at: 20_000 });
    expect(res.ok).toBe(true);
    expect(sent).toHaveLength(1);
    const system = String(sent[0].find((m) => m.role === 'system')!.content);
    expect(system).toMatch(/numbered lines/i);
    expect(system).toMatch(/"line"/);
    const user = sent[0].find((m) => m.role === 'user')!.content as { type: string; dataUrl?: string; text?: string }[];
    expect(user.filter((x) => x.type === 'image')).toHaveLength(1);
    expect(user.find((x) => x.type === 'text')!.text).toMatch(/3 lines/);
  });

  it('holds each line’s reading, attributed: a line of two words as one word on each mark, any other line on its first mark', async () => {
    const p = page();
    const { agent } = readerWith(p.s, seeing, () => reply(READ_LINES.lines.slice(0, 3).map((l, i) => ({ line: i + 1, ...l }))));
    const res = await agent.readLines({ lines: lineArgs(p), image: PNG, at: 20_000 });
    expect(res.lines.map((l) => l.ok)).toEqual([true, true, true]);
    const held = (id: string) => transcriptsOf(p.s.getState().nodes.get(id)!).map((t) => t.text);
    expect(held(p.a1)).toEqual(['hello']);
    expect(held(p.a2)).toEqual(['world']);
    expect(held(p.b)).toEqual(['pricing']);
    // "buy oat milk today" is four words on one mark: the line is held on it whole.
    expect(held(p.c)).toEqual(['buy oat milk today']);
    expect(transcriptsOf(p.s.getState().nodes.get(p.b)!)[0].source).toBe(agent.id);
    expect(res.lines[0].transcripts[0].text).toBe('hello world');
    expect(res.lines.map((l) => l.how)).toEqual(['each', 'first', 'first']);
  });

  it('a line the reply left out fails by itself and says why; the others are held', async () => {
    const p = page();
    const { agent } = readerWith(p.s, seeing, () => reply([{ line: 1, text: 'hello world', confidence: 0.9 }, { line: 3, text: 'milk', confidence: 0.7 }]));
    const res = await agent.readLines({ lines: lineArgs(p), image: PNG, at: 20_000 });
    expect(res.ok).toBe(true);
    expect(res.lines.map((l) => l.ok)).toEqual([true, false, true]);
    expect(res.lines[1].error).toMatch(/no reading came back for line 2/);
    expect(transcriptsOf(p.s.getState().nodes.get(p.b)!)).toEqual([]);
    expect(transcriptsOf(p.s.getState().nodes.get(p.c)!).map((t) => t.text)).toEqual(['milk']);
  });

  it('a failed call fails every line with the provider’s words; a reply that is no answer says so, with the raw text kept', async () => {
    const p = page();
    const bad = readerWith(p.s, seeing, () => new Error('HTTP 429 — rate limited'));
    const r1 = await bad.agent.readLines({ lines: lineArgs(p), image: PNG, at: 20_000 });
    expect(r1.ok).toBe(false);
    expect(r1.error).toMatch(/429/);
    expect(r1.lines.every((l) => !l.ok && /429/.test(l.error!))).toBe(true);
    const prose = readerWith(p.s, seeing, () => 'The image shows three lines of handwriting.');
    const r2 = await prose.agent.readLines({ lines: lineArgs(p), image: PNG, at: 20_000 });
    expect(r2.ok).toBe(false);
    expect(r2.raw).toMatch(/three lines/);
    expect(r2.lines.every((l) => !l.ok)).toBe(true);
  });

  it('a model that cannot see is never asked; neither is a call with no image', async () => {
    const p = page();
    const b = readerWith(p.s, blind, () => '[]');
    expect((await b.agent.readLines({ lines: lineArgs(p), image: PNG, at: 20_000 })).ok).toBe(false);
    const s = readerWith(p.s, seeing, () => '[]');
    expect((await s.agent.readLines({ lines: lineArgs(p), image: 'not an image', at: 20_000 })).ok).toBe(false);
    expect(b.sent).toHaveLength(0);
    expect(s.sent).toHaveLength(0);
  });

  it('a mark erased while the model was thinking is refused the STATE-1 way: that line fails, the rest are held', async () => {
    const p = page();
    const { agent } = readerWith(p.s, seeing, () => { p.s.erase(p.b, 30_000); return reply(READ_LINES.lines.slice(0, 3).map((l, i) => ({ line: i + 1, ...l }))); });
    const res = await agent.readLines({ lines: lineArgs(p), image: PNG, at: 20_000 });
    expect(res.lines.map((l) => l.ok)).toEqual([true, false, true]);
    expect(res.lines[1].error).toMatch(/erased/);
  });
});

describe('agent.readPicture: a photographed page, its text as lines', () => {
  it('sends the picture once and returns its lines, holding nothing on the board', async () => {
    const s = createSession();
    const id = s.import({ kind: 'jpg', path: 'imports/page.jpg', name: 'page.jpg', bounds: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, asset: 'sha256:' + 'ab'.repeat(32), mime: 'image/jpeg', w: 1568, h: 1176, at: 1000 })!;
    const before = s.getEvents().length;
    const { agent, sent } = readerWith(s, seeing, () => JSON.stringify({ lines: READ_LINES.picture }));
    const res = await agent.readPicture({ nodeId: id, image: PNG, at: 2000 });
    expect(res.ok).toBe(true);
    expect(res.lines).toEqual(READ_LINES.picture);
    expect(res.text).toBe(READ_LINES.picture.join('\n'));
    expect(sent).toHaveLength(1);
    expect((sent[0].find((m) => m.role === 'user')!.content as { type: string }[]).filter((x) => x.type === 'image')).toHaveLength(1);
    expect(s.getEvents().length).toBe(before);
  });
  it('says why when it cannot: no sight, no image, nothing in the reply', async () => {
    const s = createSession();
    const id = s.import({ kind: 'jpg', path: 'imports/page.jpg', bounds: { minX: 0, minY: 0, maxX: 400, maxY: 300 }, asset: 'sha256:' + 'ab'.repeat(32), at: 1000 })!;
    expect((await readerWith(s, blind, () => '').agent.readPicture({ nodeId: id, image: PNG, at: 2000 })).error).toMatch(/cannot see/);
    expect((await readerWith(s, seeing, () => '').agent.readPicture({ nodeId: id, image: 'x', at: 2000 })).ok).toBe(false);
    const none = await readerWith(s, seeing, () => '{"lines":[]}').agent.readPicture({ nodeId: id, image: PNG, at: 2000 });
    expect(none.ok).toBe(false);
    expect(none.error).toMatch(/no text/);
  });
});
