#!/usr/bin/env node
// The seat's watcher (V1-PLAN J4): one line per brief newly parked, and
// nothing else — what wakes a Claude Code session when John asks.
//
//   node Demos/seat-watch.mjs                                  # room "claude", relay http://127.0.0.1:8020
//   MM_ROOM=table MM_RELAY=http://127.0.0.1:8020 node Demos/seat-watch.mjs
//   node Demos/seat-watch.mjs --room claude --relay http://127.0.0.1:8020
//
// A page that seats *Claude Code (MCP hand)* parks every question it asks —
// What is this?, Read the writing, a question — in the room as a brief
// (core's `participants/seat.ts`). The hand that answers is the MCP server
// (`Demos/mcp.mjs`: `canvas_pending`, `canvas_answer`), but an MCP server
// cannot speak first: a session learns a brief is waiting only when it asks.
// This is the other half. Put under a session's Monitor tool, each line it
// prints is the session woken: *a brief is waiting — read it and answer it*.
//
// It is a SILENT reader: it connects to the relay and writes nothing — no
// hello, no log, no presence, no copy of anyone's log handed on — so no hand
// in the room knows it is there. The relay's replay brings it the room as it
// stands, and every line after; a brief already waiting when it starts is
// printed too, because it is waiting. A brief is printed once, the first time
// it is seen unanswered; one answered or withdrawn before then is not.
// Without a relay it waits for one, silently, reconnecting each second.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relayTransport } from './live-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const ROOM = flag('room') || process.env.MM_ROOM || 'claude';
const RELAY = (flag('relay') || process.env.MM_RELAY || 'http://127.0.0.1:8020').replace(/\/+$/, '');

const distPath = path.join(here, 'metamedium-core.node.mjs');
if (!existsSync(distPath)) {
  process.stderr.write('Demos/metamedium-core.node.mjs is missing — run `npm run build:node` in metamedium-core and copy dist/metamedium-core.node.mjs to Demos/\n');
  process.exit(1);
}
const MM = await import(pathToFileURL(distPath).href);

// The relay's stream in; nothing out. A store answers hellos and hands copies
// on — here every line it would send goes nowhere.
const wire = relayTransport(RELAY, ROOM);
const silent = { send: () => undefined, onMessage: (cb) => wire.onMessage(cb), close: () => wire.close() };
const NAME = 'seat-watch';
const store = new MM.LiveStore(silent, NAME, ROOM);
// A session of the room, as every hand keeps one, so a brief's key is the id
// every hand derives for it — the one canvas_pending and canvas_answer use.
const session = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: NAME });
const merger = new MM.LiveMerge(session, NAME);

let merged = -1;
const said = new Set();
function look() {
  const rev = store.revision();
  if (rev === merged) return;
  merged = rev;
  merger.sync(store.heldLogs());
  for (const b of MM.pendingBriefs(session.getState())) {
    if (said.has(b.key)) continue;
    said.add(b.key);
    process.stdout.write('brief ' + b.key + ' · ' + (b.asked || 'a brief') + ' · about ' + (b.about.join(', ') || '(nothing)') + ' · from ' + b.who +
      ' · room ' + ROOM + ' — canvas_pending reads it, canvas_answer answers it\n');
  }
}
// The replay on connecting is one burst, and a brief and its answer can sit in
// it: looked at once the burst has settled, a brief answered long ago is never
// printed. After that every line is looked at as it lands (one look a tick),
// so a brief is printed before any hand could have answered it.
let timer = null;
let settled = false;
let queued = false;
store.subscribe(() => {
  if (!settled) { clearTimeout(timer); timer = setTimeout(() => { settled = true; look(); }, 300); return; }
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; look(); });
});
// A room with nothing to replay says nothing at all; from here, lines are looked at as they land.
setTimeout(() => { if (!settled && !timer) settled = true; }, 1000).unref();

const stop = () => { clearTimeout(timer); try { store.close(); } catch { /* closing */ } process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
