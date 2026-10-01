// The two processes a Claude Code session runs — the MCP hand (Demos/mcp.mjs) and the
// seat's watcher (Demos/seat-watch.mjs) — against the Worker over a socket with a key:
// they join with it, see a tab's mark and its brief, and with a wrong or missing key they
// say why in a sentence and stop, never sit in an empty room.
//
//   node --test cloudflare/relay/*.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startDevRelay } from './dev-server.mjs';
import { keyForRoom } from './src/auth.mjs';
import { relayTransport } from '../../Demos/live-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const demos = path.join(here, '../../Demos');
const MM = await import(pathToFileURL(path.join(demos, 'metamedium-core.node.mjs')).href);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await wait(50); } return fn(); };

function run(script, env, args = []) {
  const child = spawn(process.execPath, [path.join(demos, script), ...args], { env: { ...process.env, MM_RELAY_KEY: '', ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const r = { child, out: '', err: '', code: null };
  child.stdout.on('data', (d) => { r.out += d; });
  child.stderr.on('data', (d) => { r.err += d; });
  child.on('exit', (c) => { r.code = c; });
  r.rpc = (() => {
    let id = 1; const waiting = new Map(); let buf = '';
    child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); try { const m = JSON.parse(line); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } } catch { /* not ours */ } } });
    return (method, params) => new Promise((resolve, reject) => { const n = id++; waiting.set(n, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); setTimeout(() => reject(new Error(method + ' timed out')), 8000); });
  })();
  return r;
}

test('the MCP hand joins a keyed relay by env, draws, and a tab on the same key sees the mark', async () => {
  const secret = 'hands-secret';
  const { url, close } = await startDevRelay({ MM_RELAY_SECRET: secret });
  const key = await keyForRoom(secret, 'claude');
  const hand = run('mcp.mjs', { MM_RELAY: url, MM_RELAY_KEY: key, MM_ROOM: 'claude', MM_NAME: 'agent' });
  const tab = new MM.LiveStore(relayTransport(url, 'claude', { key }), 'tab~1', 'claude');
  try {
    await hand.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
    const drawn = await hand.rpc('tools/call', { name: 'canvas_draw', arguments: { shapes: [{ type: 'rectangle', x: 100, y: 100, w: 200, h: 120 }] } });
    assert.ok(!drawn.error, JSON.stringify(drawn));
    tab.hello();
    assert.ok(await until(async () => Object.values(await tab.readLogs()).some((l) => l.some((e) => e.type === 'stroke'))), 'the tab never saw the agent\'s mark');
    assert.ok(!hand.err.includes(key), 'the key was written to stderr');
  } finally { tab.close(); hand.child.kill(); await close(); }
});

test('the MCP hand with no key, and with a wrong one, says why and exits 1', async () => {
  const { url, close } = await startDevRelay({ MM_RELAY_SECRET: 'hands-secret' });
  try {
    const none = run('mcp.mjs', { MM_RELAY: url, MM_ROOM: 'claude' });
    assert.ok(await until(() => none.code !== null), 'it stayed');
    assert.equal(none.code, 1);
    assert.match(none.err, /needs a key/);
    const wrong = run('mcp.mjs', { MM_RELAY: url, MM_ROOM: 'claude', MM_RELAY_KEY: 'x'.repeat(43) });
    assert.ok(await until(() => wrong.code !== null));
    assert.equal(wrong.code, 1);
    assert.match(wrong.err, /not the key for room “claude”/);
    assert.ok(!wrong.err.includes('x'.repeat(43)), 'the key was said back');
  } finally { await close(); }
});

test('the watcher prints a brief parked in a keyed room, and with a wrong key stops with the reason', async () => {
  const secret = 'hands-secret';
  const { url, close } = await startDevRelay({ MM_RELAY_SECRET: secret });
  const key = await keyForRoom(secret, 'claude');
  const watch = run('seat-watch.mjs', { MM_RELAY: url, MM_RELAY_KEY: key, MM_ROOM: 'claude' });
  const tabName = 'tab~1';
  const store = new MM.LiveStore(relayTransport(url, 'claude', { key }), tabName, 'claude');
  try {
    const session = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: tabName });
    const box = session.addStroke(MM.strokeFor({ shape: 'rectangle', x: 100, y: 100, w: 160, h: 110 }), Date.now(), undefined, 1);
    // The page's seat parks its question in the room as a brief; nobody answers it here.
    const seat = MM.createSeatParticipant(session, Date.now(), { baseUrl: url });
    void seat.interpret([box], Date.now()).catch(() => undefined);
    await store.publish(session.getEvents().filter((e) => !e.by));
    assert.ok(await until(() => /^brief /m.test(watch.out)), 'no brief printed: ' + watch.out + watch.err);
  } finally { store.close(); watch.child.kill(); }
  try {
    const bad = run('seat-watch.mjs', { MM_RELAY: url, MM_RELAY_KEY: 'y'.repeat(43), MM_ROOM: 'claude' });
    assert.ok(await until(() => bad.code !== null), 'it kept watching an empty room');
    assert.equal(bad.code, 1);
    assert.match(bad.err, /not the key for room/);
  } finally { await close(); }
});
