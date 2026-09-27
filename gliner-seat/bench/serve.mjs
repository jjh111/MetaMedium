// serve.mjs — the browser bench's server, on loopback only.
//
//   node bench/serve.mjs [port]      → http://127.0.0.1:8030/bench/web.html?ep=webgpu
//
// Serves this folder read-only (the page, the modules, the fixtures, the ORT
// wasm files and the model fetch.mjs put in models/), cross-origin isolated so
// the wasm build may use threads, and takes one kind of write: a POST of the
// page's results to /results/<name>.json. Binds 127.0.0.1 and nothing else.

import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] ?? 8030);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.onnx_data': 'application/octet-stream',
};
const ISOLATED = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  // The page keeps the model in Cache Storage itself, so that a "warm" load
  // is the page's own cache, never the HTTP cache's.
  'Cache-Control': 'no-store',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'POST' && /^\/results\/[a-z0-9.-]+\.json$/.test(url.pathname)) {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 32e6) req.destroy();
      else chunks.push(c);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      JSON.parse(body); // refuse anything that is not JSON
      mkdirSync(join(ROOT, 'results'), { recursive: true });
      writeFileSync(join(ROOT, url.pathname), body.endsWith('\n') ? body : body + '\n');
      console.log(`wrote ${url.pathname} (${body.length} bytes)`);
      res.writeHead(204, ISOLATED).end();
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
  const path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!path.startsWith(ROOT + sep) || path.includes(`${sep}.git`)) return res.writeHead(403).end();
  let st;
  try {
    st = statSync(path);
  } catch {
    return res.writeHead(404, ISOLATED).end();
  }
  if (!st.isFile()) return res.writeHead(404, ISOLATED).end();
  res.writeHead(200, { ...ISOLATED, 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(path).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/bench/web.html?ep=webgpu`));
