// Disposable servers for a run: one static server over the repo root (the
// canvas surface), one vite over shard-3d (the shard imports core from source,
// so there is no bundle to go stale). Both bind 127.0.0.1 on a port the OS
// hands out, and both are stopped when the run ends — a gate that needs a
// server someone left running is not a gate.

import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, normalize, extname, resolve, dirname } from 'node:path';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

/**
 * A static server over `root`, on a free port of 127.0.0.1.
 *
 * Every response is `no-store`: after a rebuild a browser that kept the old
 * bundle tests yesterday's engine and says nothing (the memory note that cost
 * an afternoon). A fresh context plus no-store means the run can only see the
 * files on disk right now.
 */
export async function startStatic(root) {
  const base = resolve(root);
  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    } catch {
      res.writeHead(400).end('bad path');
      return;
    }
    // A folder asked for without its slash is sent to it, query and all, as GitHub Pages
    // sends /MetaMedium/app?board=… to /MetaMedium/app/?board=… (V1-PLAN R7).
    const folderAt = join(base, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!pathname.endsWith('/') && folderAt.startsWith(base) && existsSync(folderAt) && statSync(folderAt).isDirectory()) {
      const u = new URL(req.url, 'http://127.0.0.1');
      res.writeHead(301, { location: u.pathname + '/' + u.search, 'cache-control': 'no-store' }).end();
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = join(base, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(base)) {
      res.writeHead(403).end('outside the root');
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found: ' + pathname);
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store, no-cache, must-revalidate',
      pragma: 'no-cache',
    });
    createReadStream(file).pipe(res);
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', ok);
  });
  const port = server.address().port;
  return {
    origin: `http://127.0.0.1:${port}`,
    port,
    stop: () => new Promise((ok) => server.close(ok)),
  };
}

/** A port nothing is listening on right now. Vite is told it with --strictPort,
 *  so if the guess is taken between here and there the run fails loudly. */
async function freePort() {
  const probe = createServer();
  await new Promise((ok, fail) => {
    probe.once('error', fail);
    probe.listen(0, '127.0.0.1', ok);
  });
  const port = probe.address().port;
  await new Promise((ok) => probe.close(ok));
  return port;
}

function reachable(port) {
  return new Promise((ok) => {
    const sock = connect(port, '127.0.0.1');
    const done = (v) => { sock.destroy(); ok(v); };
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    setTimeout(() => done(false), 800);
  });
}

/** Vite over shard-3d, on a free port, killed on the way out. */
export async function startVite(shardDir, { timeoutMs = 60000 } = {}) {
  const bin = join(shardDir, 'node_modules', '.bin', 'vite');
  if (!existsSync(bin)) {
    throw new Error(`shard-3d has no vite — run \`npm ci\` in ${shardDir} first`);
  }
  const port = await freePort();
  const log = [];
  const child = spawn(bin, ['--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: shardDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none', NO_COLOR: '1' },
  });
  child.stdout.on('data', (b) => log.push(String(b)));
  child.stderr.on('data', (b) => log.push(String(b)));
  let dead = null;
  child.on('exit', (code) => { dead = code; });

  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (dead !== null) throw new Error(`vite exited (${dead}):\n${log.join('')}`);
    if (await reachable(port)) {
      return {
        origin: `http://127.0.0.1:${port}`,
        port,
        log: () => log.join(''),
        stop: async () => {
          if (dead === null) {
            child.kill('SIGTERM');
            await new Promise((ok) => {
              const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} ok(); }, 4000);
              child.once('exit', () => { clearTimeout(t); ok(); });
            });
          }
        },
      };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill('SIGKILL');
  throw new Error(`vite never answered on :${port} within ${timeoutMs} ms:\n${log.join('')}`);
}

// ---------------------------------------------------------------------------
// A model provider that is not one (V1-PLAN J5).
// ---------------------------------------------------------------------------

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'metamedium-core', 'src', 'llm', 'fixtures');

/** The stub's key: a test value, nothing like a real one. */
export const STUB_KEY = 'e2e-stub-key-not-a-real-key';

/** The stub's own model, beside OpenRouter's: every reply is reasoning that ran out of budget, and no answer. */
export const REASONING_ONLY = 'e2e/reasoning-only';

/** What a stub reply says, by the job its system prompt names. */
const ANSWERS = {
  // The recorded GLM reply's own content: what reading "hello" came back as.
  read: null,
  // A reading with a slug for a label, so the board is seen to say it in words (J5, the walkthrough's item 3).
  what: JSON.stringify([{ label: 'state-transformation', confidence: 0.82, reasoning: 'three circles joined by two lines: states, and the changes between them' }]),
  try: 'ok',
  other: 'ok',
};

/** Which job a request is, by the system prompt the canvas sends for it (metamedium-core/src/participants/agent.ts). */
function jobOf(system) {
  if (/reading handwriting/.test(system)) return 'read';
  if (/offer INTERPRETATIONS/.test(system)) return 'what';
  if (/connection check/i.test(system)) return 'try';
  return 'other';
}

function readBody(req) {
  return new Promise((ok, fail) => {
    const parts = [];
    req.on('data', (b) => parts.push(b));
    req.on('end', () => ok(Buffer.concat(parts).toString('utf8')));
    req.on('error', fail);
  });
}

/**
 * An OpenAI-compatible endpoint on a free port of 127.0.0.1 that answers as
 * OpenRouter does, with no vendor behind it: `GET /v1/models` in OpenRouter's
 * shape (the fixture's list, and the stub's own reasoning-only model), and
 * `POST /v1/chat/completions` with the recorded reply shapes of GLM through
 * OpenRouter — content beside the model's reasoning; reasoning only, the
 * budget spent; 401 for a key that is not the stub's, 404 for an id it does
 * not list, 404 for an image sent to a model that takes text only. Both read
 * from `metamedium-core/src/llm/fixtures/`, the same shapes the core tests
 * read. CORS is answered for any origin, as OpenRouter answers it. Every
 * request is kept — what was asked, of which model, whether it carried an
 * image, the budget and the reasoning it asked for, and whether its key was
 * the stub's — never the key itself.
 */
export async function startModelStub({ key = STUB_KEY } = {}) {
  const LIST = JSON.parse(readFileSync(join(FIXTURES, 'openrouter-models.json'), 'utf8'));
  const REPLIES = JSON.parse(readFileSync(join(FIXTURES, 'replies.json'), 'utf8'));
  const own = {
    id: REASONING_ONLY,
    canonical_slug: REASONING_ONLY,
    hugging_face_id: '',
    name: 'E2E: Reasoning Only',
    created: 1790000000,
    description: "The stub's own: every reply is reasoning that ran out of budget, and no answer.",
    context_length: 32768,
    architecture: { modality: 'text->text', input_modalities: ['text'], output_modalities: ['text'], tokenizer: 'Other', instruct_type: null },
    pricing: { prompt: '0', completion: '0', request: '0', image: '0', web_search: '0', internal_reasoning: '0' },
    top_provider: { context_length: 32768, max_completion_tokens: 8192, is_moderated: false },
    per_request_limits: null,
    supported_parameters: ['include_reasoning', 'max_tokens', 'reasoning'],
  };
  const models = { data: [...LIST.data, own] };
  const byId = new Map(models.data.map((m) => [m.id, m]));
  const sees = (id) => ((byId.get(id) || {}).architecture || {}).input_modalities?.includes('image');
  const calls = [];
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type, http-referer, x-title',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-max-age': '600',
  };
  const server = createServer(async (req, res) => {
    const send = (status, body) => res.writeHead(status, { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(body));
    if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1');
    const auth = req.headers.authorization || '';
    const keyWas = auth === `Bearer ${key}` ? 'the stub\'s' : auth ? 'another' : 'none';
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      calls.push({ at: Date.now(), path: url.pathname, key: keyWas });
      send(200, models);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      let body = {};
      try { body = JSON.parse(await readBody(req)); } catch { send(400, { error: { message: 'the body is not JSON', code: 400 } }); return; }
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const system = messages.filter((m) => m.role === 'system').map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n');
      const image = messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p && p.type === 'image_url' && /^data:image\//.test((p.image_url || {}).url || '')));
      const call = {
        at: Date.now(), path: url.pathname, model: body.model, job: jobOf(system), image, key: keyWas,
        max_tokens: body.max_tokens ?? null, reasoning: body.reasoning ?? null,
      };
      calls.push(call);
      if (keyWas === 'none') { send(401, REPLIES['error-401-no-key'].body); return; }
      if (keyWas !== 'the stub\'s') { send(401, REPLIES['error-401'].body); return; }
      if (!byId.has(body.model)) { send(404, { error: { message: `No endpoints found for ${body.model}.`, code: 404 } }); return; }
      if (image && !sees(body.model)) { send(404, { error: { message: 'No endpoints found that support image input', code: 404 } }); return; }
      if (body.model === REASONING_ONLY) {
        const r = JSON.parse(JSON.stringify(REPLIES['reasoning-only'].body));
        r.model = body.model;
        send(200, r);
        return;
      }
      const r = JSON.parse(JSON.stringify(REPLIES['openrouter-glm'].body));
      r.model = body.model;
      if (ANSWERS[call.job] !== null) r.choices[0].message.content = ANSWERS[call.job];
      send(200, r);
      return;
    }
    send(404, { error: { message: `not found: ${url.pathname}`, code: 404 } });
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', ok);
  });
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  return {
    origin,
    port,
    baseUrl: `${origin}/v1`,
    key,
    /** Every request so far, oldest first. */
    calls: () => calls.map((c) => ({ ...c })),
    stop: () => new Promise((ok) => { server.closeAllConnections?.(); server.close(ok); }),
  };
}
