// The relay's catch-up: a connecting client is brought up to the PRESENT.
//
//   node --test Demos/relay.test.mjs
//
// `replay` is a pure function of a room and a last-seen id, so it can be asked
// questions with no server, no socket and no clock — the same seam the field's
// reader has (SEAM-1). The truncation notice is checked over a real socket,
// because it is the one thing that is about the wire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay, truncationNotice, startRelay } from './relay.mjs';

const room = (...lines) => ({
  name: 'r',
  dropped: 0,
  clients: new Set(),
  lines: lines.map((l, i) => ({ id: i + 1, data: JSON.stringify(l), participant: l.participant, kind: l.hello ? 'hello' : l.full ? 'full' : 'append' })),
});
const kinds = (ls) => ls.map((l) => l.participant + ':' + l.kind + l.id);

test('a superseded `full` is never replayed — a snapshot out of its moment installs a past state', () => {
  const r = room(
    { participant: 'alice', full: true },   // 1 — alice's log as it was
    { participant: 'alice' },               // 2
    { participant: 'alice', full: true },   // 3 — alice's log as it stands
    { participant: 'bob' },                 // 4
  );
  assert.deepEqual(kinds(replay(r)), ['alice:append2', 'alice:full3', 'bob:append4']);
});

test('the last `full` of EACH hand stands, and the appends around it keep their order', () => {
  const r = room(
    { participant: 'alice', full: true },
    { participant: 'bob', full: true },
    { participant: 'bob', full: true },
    { participant: 'alice' },
  );
  assert.deepEqual(kinds(replay(r)), ['alice:full1', 'bob:full3', 'alice:append4']);
});

test('a `hello` IS replayed — it is how a hand that arrived first is answered at last', () => {
  const r = room({ participant: 'carol', hello: true }, { participant: 'alice' });
  assert.deepEqual(kinds(replay(r)), ['carol:hello1', 'alice:append2']);
});

test('a reconnect replays only what it has not seen', () => {
  const r = room({ participant: 'alice' }, { participant: 'alice', full: true }, { participant: 'alice' });
  assert.deepEqual(kinds(replay(r, 2)), ['alice:append3']);
});

test('a room inside its buffer says nothing', () => {
  assert.equal(truncationNotice(room({ participant: 'alice' })), null);
});

test('a room that has outlived its buffer says so to a client asking for everything', () => {
  const r = room({ participant: 'alice' });
  r.dropped = 12;
  const notice = truncationNotice(r, 0);
  assert.deepEqual(notice, { relay: 'truncated', room: 'r', dropped: 12, kept: 1 });
  // No `participant`, so a store that only knows about logs ignores it.
  assert.equal(typeof notice.participant, 'undefined');
});

test('a client whose last id is still held missed nothing, and is told nothing', () => {
  const r = room({ participant: 'alice' }, { participant: 'bob' });
  r.dropped = 12;
  r.lines[0].id = 13; r.lines[1].id = 14;
  assert.equal(truncationNotice(r, 12), null);   // it has line 12; 13 is next
  assert.ok(truncationNotice(r, 5));             // it is missing 6..12
});

test('over a real socket: the stream opens, the stale snapshot is gone and the present is there', async () => {
  const server = await startRelay(0);
  const url = `http://127.0.0.1:${server.address().port}/rooms/r/events`;
  const post = (line) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(line) });
  try {
    await post({ participant: 'alice', events: [{ type: 'old' }], at: 1, full: true });
    await post({ participant: 'carol', events: [], at: 2, hello: true });
    await post({ participant: 'alice', events: [{ type: 'now' }], at: 3, full: true });
    const res = await fetch(url, { headers: { accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    let text = '';
    while (!text.includes('"now"')) text += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    assert.ok(!text.includes('"old"'), 'the superseded snapshot was replayed');
    assert.ok(text.includes('"hello"'), 'carol, who arrived first, was left unanswered');
    assert.ok(!text.includes('"relay":"truncated"'), 'a room inside its buffer said otherwise');
  } finally { server.close(); }
});
