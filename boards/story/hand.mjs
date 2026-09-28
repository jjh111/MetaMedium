// Drives a shell-run MCP hand (Demos/mcp.mjs) through a command file and an
// output file: one JSON-RPC line per call, the reply matched by id.
//   node hand.mjs init
//   node hand.mjs call <tool> '<json args>' | <args.json>
//   SAVE_IMG=out.png node hand.mjs call canvas_see '{...}'
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const CMD = path.join(DIR, 'hand.cmd.jsonl');
const OUT = path.join(DIR, 'hand.out.jsonl');
const SEQ = path.join(DIR, 'hand.seq');

let seq = fs.existsSync(SEQ) ? Number(fs.readFileSync(SEQ, 'utf8')) || 100 : 100;
const next = () => { seq += 1; fs.writeFileSync(SEQ, String(seq)); return seq; };
const send = (obj) => fs.appendFileSync(CMD, JSON.stringify(obj) + '\n');

async function waitFor(id, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fs.existsSync(OUT)) {
      for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { const m = JSON.parse(line); if (m.id === id) return m; } catch { /* partial line */ }
      }
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  throw new Error('no reply to ' + id + ' within ' + ms + ' ms');
}

const [cmd, tool, raw] = process.argv.slice(2);
if (cmd === 'init') {
  const id = next();
  send({ jsonrpc: '2.0', id, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'director', version: '1' } } });
  const r = await waitFor(id, 30000);
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  console.log(JSON.stringify(r.result && r.result.serverInfo));
} else if (cmd === 'call') {
  const args = raw ? JSON.parse(/^\s*[{[]/.test(raw) ? raw : fs.readFileSync(raw, 'utf8')) : {};
  const id = next();
  send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args } });
  const r = await waitFor(id, 180000);
  if (r.error) { console.log('ERROR ' + JSON.stringify(r.error)); process.exit(1); }
  for (const c of (r.result && r.result.content) || []) {
    if (c.type === 'text') console.log(c.text);
    else {
      console.log('[' + c.type + ']');
      if (c.type === 'image' && process.env.SAVE_IMG) fs.writeFileSync(process.env.SAVE_IMG, Buffer.from(c.data, 'base64'));
    }
  }
  if (r.result && r.result.isError) process.exit(2);
} else {
  console.log('usage: node hand.mjs init | call <tool> <json|file>');
  process.exit(1);
}
