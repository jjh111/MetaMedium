// The Worker, run in Node: the same `fetch` and the same Room, over in-memory
// storage, behind a plain http server — what the tests speak to over a socket,
// and a relay to try the keys against on this machine without wrangler:
//
//   MM_RELAY_SECRET=… node cloudflare/relay/dev-server.mjs            # :8787, keys on
//   MM_RELAY_OPEN=1 PORT=9000 node cloudflare/relay/dev-server.mjs    # no key asked
//
// It is not the deployment (`wrangler dev` runs workerd, and is the closer
// check); it is the Worker's logic with nothing else in the way.

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import worker from './src/worker.mjs';
import { fakeEnv } from './test/fake.mjs';

/** Serve `worker.fetch` as a Node request listener. */
export function listener(env) {
  return async (req, res) => {
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      const host = req.headers.host || 'localhost';
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Readable.toWeb(req);
      const request = new Request(`http://${host}${req.url}`, { method: req.method, headers: req.headers, body, duplex: 'half', signal: abort.signal });
      const out = await worker.fetch(request, env);
      res.writeHead(out.status, Object.fromEntries(out.headers));
      if (!out.body) { res.end(); return; }
      const reader = out.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(value)) await new Promise((r) => res.once('drain', r));
        if (res.destroyed) { await reader.cancel().catch(() => undefined); break; }
      }
      res.end();
    } catch (err) {
      if (!res.headersSent) res.writeHead(500);
      res.end(String(err && err.message || err));
    }
  };
}

/** A relay on a free port (or `port`): { url, env, close }. `vars` are the Worker's variables and secrets. */
export function startDevRelay(vars = {}, port = 0) {
  const env = fakeEnv(vars);
  const server = createServer(listener(env));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${server.address().port}`,
      env,
      close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
    }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8787);
  const vars = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('MM_RELAY_')));
  startDevRelay(vars, port)
    .then(({ url }) => console.log(`dyna relay (Worker logic, in memory) on ${url} — ${vars.MM_RELAY_OPEN === '1' ? 'no key asked' : vars.MM_RELAY_SECRET ? 'keys on' : 'no secret set: every request is refused (503)'}`))
    .catch((err) => { console.error(`relay: could not listen on :${port} — ${err.message}`); process.exit(1); });
}
