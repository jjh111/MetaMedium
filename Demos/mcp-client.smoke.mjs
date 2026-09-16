// Smoke test for Demos/mcp-client.mjs (the door): a fake stdio MCP server
// behind the bridge, then /tools and /call over HTTP, as the canvas calls them.
//   node Demos/mcp-client.smoke.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fake = path.join(here, '.mcp-client-smoke-server.mjs');
writeFileSync(fake, `
let id = null;
process.stdin.on('data', (d) => {
  for (const line of String(d).split('\\n')) {
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') reply({ protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'fake-parser', version: '9' } }, msg.id);
    else if (msg.method === 'tools/list') reply({ tools: [
      { name: 'parse_marks', description: 'read marks', inputSchema: { type: 'object' } },
      { name: 'answer_question', description: 'answer', inputSchema: { type: 'object' } },
    ] }, msg.id);
    else if (msg.method === 'tools/call') {
      const a = msg.params.arguments || {};
      if (!['parse_marks', 'answer_question'].includes(msg.params.name)) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'unknown tool' } }) + '\\n');
        return;
      }
      reply({ content: [{ type: 'text', text: a.image ? '[{"text":"hello","confidence":0.8}]' : '[{"label":"doodad","confidence":0.77,"reasoning":"the fake parser says so"}]' }] }, msg.id);
    }
  }
});
function reply(result, id) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\\n'); }
`);

const PORT = 8039;
const door = spawn('node', [path.join(here, 'mcp-client.mjs'), '--port', String(PORT), '--', 'node', fake], { stdio: ['ignore', 'pipe', 'pipe'] });
door.stderr.on('data', (d) => process.stderr.write('[door] ' + d));
process.on('exit', () => { door.kill(); try { unlinkSync(fake); } catch {} });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' — ' + JSON.stringify(detail))); if (!ok) failures++; };

try {
  let tools = null;
  for (let i = 0; i < 30 && !tools; i++) {
    await sleep(400);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/tools`); if (r.ok) tools = await r.json(); } catch {}
  }
  check('the door answers /tools', !!tools);
  check('the server is named and its tools listed',
    tools && tools.server.name === 'fake-parser' && tools.tools.length === 2 && tools.tools[0].name === 'parse_marks', tools);

  const call = await fetch(`http://127.0.0.1:${PORT}/call`, { method: 'POST', body: JSON.stringify({ name: 'parse_marks', arguments: { brief: 'a circle at 100,100', ids: ['stroke:1'] } }) });
  const out = await call.json();
  check('a call comes back as text the canvas can parse',
    call.ok && /doodad/.test(out.text) && out.isError === false, out);

  const bad = await fetch(`http://127.0.0.1:${PORT}/call`, { method: 'POST', body: JSON.stringify({ name: 'no_such_tool', arguments: {} }) });
  const badOut = await bad.json();
  check('an unknown tool is an error, not a crash', bad.status === 502 && !!badOut.error, { status: bad.status, out: badOut });
} catch (err) {
  check('the smoke itself ran', false, err.message);
}
door.kill();
try { unlinkSync(fake); } catch {}
process.exit(failures ? 1 : 0);
