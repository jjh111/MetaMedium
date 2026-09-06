// Kinds of code — a closed table.
//
// The canvas is a folder and nothing is invented: every file of a known kind
// is an artifact with a renderer and an addressing scheme. A kind with no
// renderer or no addressing is not a kind (ARCHITECTURE-v8 §6). The table is
// the whole vocabulary; it grows by adding a row with a test, never by a
// special case elsewhere (BUILD-PLAN-v8 I6).

export type Kind = 'html' | 'js' | 'json' | 'svg' | 'md' | 'png' | 'jpg' | 'text' | 'control' | 'run';

export type Renderer = 'page' | 'source' | 'tree' | 'vector' | 'prose' | 'image' | 'text' | 'control' | 'run';
export type Addressing = 'regions' | 'functions' | 'keys' | 'elements' | 'headings' | 'pixels' | 'runs' | 'value' | 'parts';

export interface KindRow {
  kind: Kind;
  extensions: readonly string[];
  mime: string;
  /** How the surface shows it. */
  renderer: Renderer;
  /** What ink over it lands on. */
  addressing: Addressing;
  /** Whether the file's content is text the engine can read. */
  textual: boolean;
}

export const KINDS: readonly KindRow[] = [
  { kind: 'html', extensions: ['html', 'htm'], mime: 'text/html', renderer: 'page', addressing: 'regions', textual: true },
  { kind: 'js', extensions: ['js', 'mjs', 'ts'], mime: 'text/javascript', renderer: 'source', addressing: 'functions', textual: true },
  { kind: 'json', extensions: ['json'], mime: 'application/json', renderer: 'tree', addressing: 'keys', textual: true },
  { kind: 'svg', extensions: ['svg'], mime: 'image/svg+xml', renderer: 'vector', addressing: 'elements', textual: true },
  { kind: 'md', extensions: ['md', 'markdown'], mime: 'text/markdown', renderer: 'prose', addressing: 'headings', textual: true },
  { kind: 'png', extensions: ['png'], mime: 'image/png', renderer: 'image', addressing: 'pixels', textual: false },
  { kind: 'jpg', extensions: ['jpg', 'jpeg'], mime: 'image/jpeg', renderer: 'image', addressing: 'pixels', textual: false },
  { kind: 'text', extensions: ['txt'], mime: 'text/plain', renderer: 'text', addressing: 'runs', textual: true },
  { kind: 'control', extensions: [], mime: 'application/json', renderer: 'control', addressing: 'value', textual: true },
  // A program that renders itself (a three.js scene, a 2D drawing) in a
  // scripts-only, opaque-origin frame with a clear background, and REPORTS
  // its parts — named things at named places — so ink over it lands on them.
  { kind: 'run', extensions: ['run.js'], mime: 'text/javascript', renderer: 'run', addressing: 'parts', textual: true },
];

export function kindOf(path: string): KindRow | undefined {
  const lower = path.toLowerCase();
  // A compound extension names a kind before its last segment does: `x.run.js` is a program, not a script.
  for (const row of KINDS) for (const e of row.extensions) if (e.includes('.') && lower.endsWith('.' + e)) return row;
  const ext = (path.split('.').pop() ?? '').toLowerCase();
  if (!ext || ext === path.toLowerCase()) return undefined;
  return KINDS.find((k) => k.extensions.includes(ext));
}

export function rowOf(kind: Kind): KindRow {
  return KINDS.find((k) => k.kind === kind)!;
}
