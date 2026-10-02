// Joins a live room as a silent reader, merges it exactly as a hand does, and
// writes the board as a log — one event per line, as the app's export writes
// it — so the boards pane's "from a file…" opens it after the room is gone.
//   node archive.mjs <room> <out.jsonl>
import fs from 'node:fs';
const REPO = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { relayTransport } = await import(REPO + '/Demos/live-node.mjs');
const MM = await import(REPO + '/Demos/dynaink-core.node.mjs');

const [room = 'dyna', out = 'board.jsonl'] = process.argv.slice(2);
const ME = MM.sittingName('archive');
const store = new MM.LiveStore(relayTransport('http://127.0.0.1:8020', room), ME, room);
const session = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: ME });
const merger = new MM.LiveMerge(session, ME);
store.subscribe(() => merger.sync(store.heldLogs()));
store.hello();
// Answers come at once from every hand that is here; wait for them to settle.
let last = -1, stable = 0;
for (let i = 0; i < 40 && stable < 4; i++) {
  await new Promise((r) => setTimeout(r, 250));
  const n = session.getEvents().length;
  stable = n === last && n > 0 ? stable + 1 : 0;
  last = n;
}
merger.sync(store.heldLogs());
const events = session.getEvents();
fs.writeFileSync(out, MM.encodeLog(events));
const st = session.getState();
console.log(`${room}: ${events.length} events · ${st.contentIds.length} marks and artifacts on the board · ${out}`);
if (store.close) await store.close();
process.exit(0);
