// ===== export =====
// **The board as its log, out and back in** (G0).
//
// A board that cannot leave the tab is a board nobody can settle an argument
// about. John's two boards of 16 September 2026 are the evidence G1's whole
// package turns on — *the massing stood on the floor while the profiles were
// drawn above it* — and until this file existed the only way to look at one was
// a screenshot and a hook dump.
//
// **The format is the canvas's, unchanged**: `encodeLog` of the session's own
// events, one JSON event per line (`metamedium-core/src/store/seam.ts`). That
// is what `.metamedium/logs/*.log` holds, what the canvas's export pane writes
// as `canvas.jsonl`, and what `mergeLogs` reads — so a board exported from
// either surface is the same kind of thing, and a shard board can be opened in
// the canvas's folder store without a converter. One definition, one home.
//
// Two ways in, and they are not the same kind of thing:
//
// - **A log** is the board. It replays into exactly the drawing it came from,
//   because state is a pure function of the log (invariant 4).
// - **A fixture** is a *view* of a board — what `__shard.state()` exposed:
//   marks with their plane, their bounds and their readings, and no stroke
//   points at all. `boardFromFixture` rebuilds a board from those bounds, which
//   is a reconstruction and says so. It exists because the fixture was captured
//   before there was an export; **a real log export supersedes it**.

import { decodeLog, encodeLog, type Point, type SessionEvent } from 'metamedium-core';
import type { PlaneName } from './plane';

/** The events as a file: one JSON event per line, core's own encoding. */
export function encodeBoard(events: readonly SessionEvent[]): string {
  return encodeLog(events);
}

/** A file back into events. A broken line is skipped and counted, never fatal. */
export function decodeBoard(text: string): { events: SessionEvent[]; skipped: number } {
  return decodeLog(text);
}

/**
 * What the file is called. `.mm.log` rather than `.jsonl`, because the line
 * format is an implementation of the thing and *the log* is what it is; both
 * are accepted on the way back in.
 */
export function boardFilename(at = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `shard-${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}.mm.log`;
}

/** Whether a filename is one of ours — said to the hand rather than guessed at. */
export function looksLikeLog(name: string): boolean {
  return /\.(mm\.log|log|jsonl|json)$/i.test(name);
}

// ---- the file, in and out (the only DOM in here) ----------------------------

/** The canvas's own download, ported (`Demos/surface/18-images.js`). */
export function downloadText(name: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

/** A file picker, as a promise. Null when the hand cancelled. */
export function pickTextFile(accept = '.mm.log,.log,.jsonl,.json,application/json,text/plain'): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    document.body.appendChild(input);
    let done = false;
    const finish = (v: { name: string; text: string } | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(v);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      file
        .text()
        .then((text) => finish({ name: file.name, text }))
        .catch(() => finish(null));
    });
    // A cancelled picker fires nothing in most browsers; `cancel` where it does.
    input.addEventListener('cancel', () => finish(null));
    input.click();
  });
}

// ---- a fixture back into a board -------------------------------------------

/** One mark as the hook's `state()` exposed it, and as the fixtures hold it. */
export interface FixtureMark {
  id: string;
  plane: string;
  source?: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** *circle 0.766* — the label and its number, as the panel says it. */
  reads?: string;
  plays?: string;
}

export interface Fixture {
  captured?: string;
  note?: string;
  marks: FixtureMark[];
  [key: string]: unknown;
}

/** A mark rebuilt: where it goes, and the path to draw there. */
export interface RebuiltMark {
  /** The id it had on the board it was captured from — provenance, not an id here. */
  was: string;
  plane: PlaneName;
  points: Point[];
  /** The shape rung's word the fixture recorded, which is what the path was built as. */
  shape: string;
  why: string;
}

export interface RebuiltBoard {
  marks: RebuiltMark[];
  /** What could not be rebuilt, and why — dropped AND counted, never quietly. */
  dropped: string[];
  /** The one sentence the status line says about the whole thing. */
  sentence: string;
}

/**
 * The pen's scale a rebuilt mark is given.
 *
 * A fixture records no scale — `state()` has one per mark and the capture did
 * not keep it — and the shape rung needs one, because every fixed pixel
 * threshold in it is about the HAND (MVP.md §7). So a rebuilt mark is treated
 * as though it had been drawn across two hundred screen pixels, which is what a
 * hand drawing a shape does. It is stated here, once, so that a reading taken
 * off a rebuilt board can be told from a reading taken off a real one.
 */
export const FIXTURE_PEN_PX = 200;

const NAMED: PlaneName[] = ['foundation', 'height', 'width'];

/** The label the fixture recorded, without its number. */
function shapeOf(reads: string | undefined): string {
  return (reads ?? '').trim().split(/\s+/)[0] ?? '';
}

/** A closed outline through corners, densified the way a hand leaves a path. */
function loop(corners: Point[], per = 16): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(corners[0]);
  return out;
}

function run(a: Point, b: Point, n = 28): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => ({
    x: a.x + ((b.x - a.x) * i) / n,
    y: a.y + ((b.y - a.y) * i) / n,
  }));
}

/**
 * A board from a fixture's marks: **circles and rectangles from their bounds,
 * on their own planes**.
 *
 * Only the three named world planes are rebuilt. A mark the fixture puts on a
 * `view` plane was drawn on the plane facing a camera at a pose, through the
 * cursor — and a fixture records the pose but not the frame the shard built
 * from it, so rebuilding one would mean guessing at a (u, v) basis and calling
 * the guess John's drawing. Those marks are dropped and counted, and the ones
 * that carry the board's claim about its own shape — the profiles on the tiles
 * — are exactly the ones that come back.
 */
export function boardFromFixture(fixture: Fixture): RebuiltBoard {
  const marks: RebuiltMark[] = [];
  const dropped: string[] = [];
  for (const m of fixture.marks ?? []) {
    if (!NAMED.includes(m.plane as PlaneName)) {
      dropped.push(`${m.id} lay on the ${m.plane} plane — a fixture holds the pose it was drawn from, not the frame that pose made`);
      continue;
    }
    const plane = m.plane as PlaneName;
    const b = m.bounds;
    if (!b || !Number.isFinite(b.minX) || !Number.isFinite(b.maxY)) {
      dropped.push(`${m.id} has no bounds to rebuild it from`);
      continue;
    }
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const shape = shapeOf(m.reads);
    if (shape === 'circle' || shape === 'arc') {
      marks.push({
        was: m.id,
        plane,
        shape,
        points: Array.from({ length: 73 }, (_, i) => {
          const t = (i / 72) * Math.PI * 2;
          return { x: cx + (Math.cos(t) * w) / 2, y: cy + (Math.sin(t) * h) / 2 };
        }),
        why: `rebuilt from the fixture as the ellipse inscribed in ${m.id}'s own bounds on the ${plane} plane`,
      });
    } else if (shape === 'rectangle' || shape === 'triangle' || shape === 'text') {
      marks.push({
        was: m.id,
        plane,
        shape,
        points: loop([
          { x: b.minX, y: b.minY },
          { x: b.maxX, y: b.minY },
          { x: b.maxX, y: b.maxY },
          { x: b.minX, y: b.maxY },
        ]),
        why: `rebuilt from the fixture as ${m.id}'s own bounding box on the ${plane} plane`,
      });
    } else if (shape === 'line') {
      marks.push({
        was: m.id,
        plane,
        shape,
        points: run({ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }),
        why: `rebuilt from the fixture as the run across ${m.id}'s own bounds on the ${plane} plane`,
      });
    } else {
      dropped.push(`${m.id} read as “${m.reads ?? 'nothing'}” — a shape a bounding box cannot be rebuilt into`);
    }
  }
  return {
    marks,
    dropped,
    sentence:
      `${marks.length} mark${marks.length === 1 ? '' : 's'} rebuilt from the fixture's bounds` +
      `${dropped.length ? `, ${dropped.length} not` : ''} — a reconstruction, not a replay: an exported log supersedes it`,
  };
}
