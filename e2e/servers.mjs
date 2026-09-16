// Disposable servers for a run: one static server over the repo root (the
// canvas surface), one vite over shard-3d (the shard imports core from source,
// so there is no bundle to go stale). Both bind 127.0.0.1 on a port the OS
// hands out, and both are stopped when the run ends — a gate that needs a
// server someone left running is not a gate.

import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, normalize, extname, resolve } from 'node:path';
import { connect } from 'node:net';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
