#!/usr/bin/env node
// The door, the other way: the canvas calls OUT to an MCP server, so any
// server can join as a participant — a parsing method beside the local and
// hosted models (SURFACE-v10 D1 made the canvas an MCP server; this makes it
// an MCP client).
//
//   node Demos/mcp-client.mjs -- node server.mjs [args]   # a stdio server, bridged
//   node Demos/mcp-client.mjs --url http://host:8080/mcp  # a remote streamable-HTTP server, proxied
//   MM_DOOR_PORT=8040 node Demos/mcp-client.mjs -- npx -y some-server
//
// Then, in the canvas: controls › models › MCP server, endpoint
// http://127.0.0.1:8030 — connect, pick which tool reads, answers and draws,
// join. The browser can spawn nothing and most servers send no CORS headers;
// this small process is the door for both.
//
// Endpoints (CORS open, loopback only):
//   GET  /tools → { server: {name, version}, tools: [{name, description}] }
//   POST /call  { name, arguments } → { text?, image?, contents } (the tool
//                 result's content blocks, text concatenated for convenience)

import { spawn } from 'node:child_process';
import http from 'node:http';
import readline from 'node:readline';

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const PORT = Number(flag('port') || process.env.MM_DOOR_PORT || 8030);
const URL_ = flag('url');
const dashdash = argv.indexOf('--');
const CMD = !URL_ && dashdash >= 0 ? argv.slice(dashdash + 1) : null;
if (!URL_ && (!CMD || !CMD.length)) {
  console.error('usage: node Demos/mcp-client.mjs -- <command> [args…]   |   node Demos/mcp-client.mjs --url <http-mcp-url>');
  process.exit(1);
}
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

// ----- One JSON-RPC channel: stdio child or remote HTTP -------------------
let nextId = 1;
const pending = new Map();
let child = null;

function rpcStdio(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('the server is thinking too long (60s)')); }, 60000);
    pending.set(id, (msg) => { clearTimeout(timer); msg.error ? reject(new Error(msg.error.message || JSON.stringify(msg.error))) : resolve(msg.result); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function rpcHttp(method, params) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' from the server');
  const type = res.headers.get('content-type') || '';
  const text = await res.text();
  // Streamable HTTP may answer as SSE: take the last data: payload.
  const payload = type.includes('event-stream')
    ? text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).pop()
    : text;
  const msg = JSON.parse(payload || '{}');
  if (msg.error) throw new Error(msg.error.message || JSON.stringify(msg.error));
  return msg.result;
}

const rpc = URL_ ? rpcHttp : rpcStdio;

async function start() {
  if (CMD) {
    child = spawn(CMD[0], CMD.slice(1), { stdio: ['pipe', 'pipe', 'inherit'] });
    child.on('exit', (code) => { log('the server exited (' + code + '); the door closes'); process.exit(code ?? 1); });
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      let msg; try { msg = JSON.parse(line); } catch { return; }
      if (msg.id != null && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    });
  }
  const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'metamedium-door', version: '0.1.0' } });
  if (!URL_) child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const listed = await rpc('tools/list', {});
  const server = (init && init.serverInfo) || { name: URL_ || CMD[0], version: '' };
  log('door open on http://127.0.0.1:' + PORT + ' — ' + (server.name || '?') + ' with ' + (listed.tools || []).length + ' tools');
  return { server, tools: listed.tools || [] };
}

const ready = start().catch((err) => { log('could not open the door: ' + err.message); process.exit(1); });

// ----- The browser side of the door ---------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === 'GET' && req.url === '/tools') {
      const { server, tools } = await ready;
      send(200, { server, tools: tools.map((t) => ({ name: t.name, description: t.description || '' })) });
      return;
    }
    if (req.method === 'POST' && req.url === '/call') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { name, arguments: args } = JSON.parse(body || '{}');
      await ready;
      const result = await rpc('tools/call', { name, arguments: args || {} });
      const contents = (result && result.content) || [];
      send(200, {
        text: contents.filter((c) => c.type === 'text').map((c) => c.text).join('\n'),
        image: (contents.find((c) => c.type === 'image') || {}).data,
        isError: !!result && !!result.isError,
        contents,
      });
      return;
    }
    send(404, { error: 'GET /tools or POST /call' });
  } catch (err) {
    send(502, { error: err.message });
  }
});
server.listen(PORT, '127.0.0.1');
