# dyna.ink on Cloudflare — the site and a room relay

Two things, both built here and neither deployed until you do the steps below:

| What | Where | Address (yours to bind) |
|---|---|---|
| **The site** — what GitHub Pages publishes, as a Cloudflare Pages site, with security headers | `build-site.mjs`, `pages/` | `https://dyna.ink` (the app at `/app/`) |
| **The room relay** — `Demos/relay.mjs` as a Worker with one Durable Object per room, a key per room, https | `relay/` | `https://relay.dyna.ink` |

GitHub Pages keeps publishing as before (`https://jjh111.github.io/MetaMedium/app/` and every
old address). This is a second home. The relay is what lets an iPad on https join a room an
agent is in: an https page cannot reach a plain-http relay on a LAN, so a room between your iPad
and a Claude Code session anywhere needs an https relay.

```
iPad  ── https://dyna.ink/app/?live=claude&relay=https://relay.dyna.ink&key=… ──┐
                                                                                 ├─ Worker ─ Durable Object "claude" (the room's lines, in storage)
Claude Code session ── MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=… node Demos/mcp.mjs ──┘
```

## What you do, once

You need a Cloudflare account with **dyna.ink added as a zone** (Websites → Add a site; change
the nameservers at the registrar as it says). To try it first with no domain, use the
`*.pages.dev` and `*.workers.dev` addresses and bind the domain later (see *Another address*).

### 1. The Pages project

```sh
cd cloudflare/relay && npm ci          # installs wrangler (once)
npx wrangler login                     # opens a browser; this is your machine, not CI
npx wrangler pages project create dyna-ink --production-branch master
```

Then in the dashboard: **Workers & Pages → dyna-ink → Custom domains → Set up a custom domain →
`dyna.ink`** (and `www.dyna.ink`, then a *Redirect rule* from `www` to the apex if you want one
address). The first deploy can be by hand to see it work:

```sh
node cloudflare/build-site.mjs         # cloudflare/dist/ — 700-odd files, ~30 MB
npx wrangler pages deploy cloudflare/dist --project-name dyna-ink
```

### 2. The relay Worker

```sh
cd cloudflare/relay
npx wrangler deploy                                    # creates the Worker and its Durable Object class
SECRET=$(openssl rand -base64 32); echo "$SECRET"      # KEEP THIS (a password manager): room keys are made from it
echo "$SECRET" | npx wrangler secret put MM_RELAY_SECRET
```

Bind `relay.dyna.ink`: **Workers & Pages → dyna-relay → Settings → Domains & Routes → Add →
Custom domain → `relay.dyna.ink`**. (Or uncomment `routes` in `relay/wrangler.toml`; the dashboard
does the same.) Check it:

```sh
curl https://relay.dyna.ink/                     # dyna.ink relay — rooms/<room>/events …
curl -s -o /dev/null -w '%{http_code}\n' "https://relay.dyna.ink/rooms/claude/events"   # 401: it wants a key
```

### 3. Deploy from GitHub on every push to master

An API token: **My Profile → API Tokens → Create Token → Custom token**, permissions
**Account · Cloudflare Pages · Edit** and **Account · Workers Scripts · Edit**, scoped to your
account. The account id is on the dashboard's right-hand side. Then in the repository (or with
`gh secret set`):

```sh
gh secret set CLOUDFLARE_API_TOKEN       # paste the token
gh secret set CLOUDFLARE_ACCOUNT_ID      # paste the id
```

`.github/workflows/deploy-cloudflare.yml` then builds and deploys the site and the Worker on
every push to `master` (and by hand: Actions → *Deploy to Cloudflare* → Run workflow). With either
secret absent it skips every step and stays green, so forks and CI are unaffected. The relay's
own secret (`MM_RELAY_SECRET`) is **not** a GitHub secret: it lives on the Worker, set once above.

## Keys: handing an agent a room

A room's key is `HMAC-SHA256(secret, room name)`, 43 characters. There is no table of keys on
the relay and nothing to revoke one by one: the relay recomputes the key for whatever room it is
asked about. A key opens **that room and no other**.

```sh
export MM_RELAY_SECRET='…the secret you kept…'
node cloudflare/relay/room-key.mjs claude          # the key for room "claude" (stdout), and how to use it (stderr)
node cloudflare/relay/room-key.mjs '*'             # opens every room — yours; do not hand this to an agent
```

- **Your tab (the iPad):** `https://dyna.ink/app/?live=claude&relay=https://relay.dyna.ink&key=<key>`.
  A browser's `EventSource` cannot send a header, so a tab sends the key as `?key=`. Bookmark it
  or add it to the Home Screen from that address; the app leaves the key out of any board's address, the log, the
  board, an export and every cache, and sends `Referrer-Policy: no-referrer`. The key is in the address bar and in
  Cloudflare's request log — it is a room key, not an account password; rotate it if a screenshot shows it.
- **An agent** (Claude Code anywhere, `Demos/mcp.mjs`; `Demos/seat-watch.mjs`): the environment,
  `MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=<key> MM_ROOM=claude`, sent as `Authorization: Bearer`.
  (`--relay` / `--key` also work, but an argument is in the process list.)
- **Rotate:** `echo "$NEW" | npx wrangler secret put MM_RELAY_SECRET` retires every key at once. To move
  hands over gently, set the secret to `new,old` (comma-separated, new first), hand out the new keys, then
  set it to `new` alone.
- **No key set up yet:** a relay with neither `MM_RELAY_SECRET` nor `MM_RELAY_OPEN=1` answers 503 to
  everything and says why. It fails closed. `MM_RELAY_OPEN=1` (a var in `wrangler.toml`) is an open
  relay on purpose — for a trial, not for the address you keep.
- A wrong or missing key is said, never silent: the MCP hand and the watcher print *that is not the key for room “claude”* and
  exit 1; a tab's status line says *the relay does not take this key for this room*.

## A Claude Code session joins a room

In a terminal, on any machine:

```sh
MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=<key> node Demos/mcp.mjs          # the MCP hand, room "claude"
MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=<key> node Demos/seat-watch.mjs   # prints a line when your iPad parks a question for Claude
```

For a Claude Code session, give the MCP server the environment without committing the key —
`.mcp.json` in this repository stays as it is (a local relay):

```sh
claude mcp add metamedium --scope user \
  --env MM_RELAY=https://relay.dyna.ink --env MM_RELAY_KEY=<key> --env MM_ROOM=claude \
  -- node /path/to/MetaMedium/Demos/mcp.mjs
```

(`.mcp.json` in a project may also say `"env": { "MM_RELAY": "…", "MM_RELAY_KEY": "…" }`; do not
commit a key there. Whether Claude Code expands `${VAR}` in `.mcp.json` is unverified here.)
Run `seat-watch.mjs` under the session's Monitor tool as `CLAUDE.md` (*The canvas's seat*) says.

**What *with Claude* should default to on dyna.ink** (`Demos/surface/24-seat.js`, another unit's): the relay
`https://relay.dyna.ink`, room `claude`, and the key from the page's own `?key=` (the transport reads it
already: `openLive` takes `opts.key`, else `?key=`). On a local page the default stays `http://127.0.0.1:8020`.

## What it holds, and what it costs

- **The relay sees every line** — a hand's log is its ink, in clear — and keeps the newest of each room in
  Durable Object storage on Cloudflare: 5,000 lines or 32 MB a room, the oldest dropped, and a hand
  that joins later is told the room is older than the relay remembers (`MM_RELAY_MAX_LINES`,
  `MM_RELAY_MAX_BYTES`). It is carriage, not safekeeping: boards live in each browser (and in an export).
  No end-to-end encryption; whoever runs the Worker (you) and Cloudflare could read a room.
- **An open stream holds its room's Durable Object awake**, billed by the wall-clock second it is held
  (and a heartbeat every 25 s). One tab and one agent in a room is small; check the current free-plan
  limits for Durable Objects requests and duration before leaving many rooms open (unverified here).
- Only origins `https://dyna.ink`, `www.`, `app.`, `https://jjh111.github.io` and `localhost` / `127.0.0.1` may call it from a
  browser; add more with `MM_RELAY_ORIGINS` (comma-separated). A hand with no `Origin` (Node) is not a browser and is
  checked by its key alone.

## Headers: what the app is allowed to do

`pages/headers.template` and `pages/csp.txt` become `_headers`. The app's Content-Security-Policy allows exactly what its
source loads: its own files; the two CDNs three.js and mermaid load from; OpenRouter, Anthropic, GitHub's API; the relay;
a model on this machine (`localhost`, `127.0.0.1`, any port). It also allows `'unsafe-inline'` and `'unsafe-eval'`, because
a program's frame inherits it and runs its code with `new Function` — removing eval was tried against the real build and
made every `run` and `js` artifact throw; the sandbox that contains that code is the iframe's (no `allow-same-origin`), not the policy.

**Not sent: COOP and COEP.** `require-corp` would refuse the CDN scripts unless each sends
`Cross-Origin-Resource-Policy` (unverified for cdnjs and jsdelivr) and would refuse every sandboxed frame;
`credentialless`, which would not, is missing in Safari, and the iPad is the first target. Nothing the app does needs
cross-origin isolation yet (a browser model runs on WebGPU or one thread; `PLAN-IPAD-NOTES.md` §3).

**Another model or relay address is refused until it is named.** A custom OpenAI-compatible endpoint, a model on a LAN
host, a relay at its `workers.dev` address: add its origin to `connect-src` in `pages/csp.txt` and push — the site test
(`site.test.mjs`) asks that every `https` host in the source is in the policy and every one in the policy is in the source
(the relay's is the one exception), so a change here is deliberate. An https page calling a plain-http LAN address is
mixed content in Safari whatever the policy says (`PLAN-IPAD-NOTES.md` §6; to check on the iPad); `http://localhost` is allowed by
Chromium and Firefox and unverified in Safari.

**Pages serves `/Demos/session-engine.html` at `/Demos/session-engine`** (a 308, query kept — checked with `wrangler pages dev`);
the whitepaper's embeds follow it and the policy stands on both addresses. `/app` → `/app/` is `_redirects`, query kept.

## Try it without Cloudflare, and the tests

```sh
MM_RELAY_SECRET=test node cloudflare/relay/dev-server.mjs      # the Worker's logic in Node, :8787, in memory
cd cloudflare/relay && npx wrangler dev --local                # the real runtime (workerd), SQLite-backed storage, no login
node cloudflare/build-site.mjs && cd /somewhere/else && npx wrangler pages dev /path/to/cloudflare/dist   # the site with its headers and redirect
                                                               # (from a folder with no wrangler.toml, or wrangler reads the relay's)

node --test cloudflare/site.test.mjs                           # the file list, the headers, the policy against the source
cd cloudflare/relay && npm test                                # 24 protocol cases on the Worker (Node + a fake Durable Object storage),
                                                               # the socket and hand cases (live-node, mcp.mjs, seat-watch.mjs), and workerd
```

The relay shares its protocol with the Node relay — `Demos/relay-protocol.mjs` (what a client is replayed, the
truncation word, the cap) is one file read by both, so they cannot drift; `Demos/relay.test.mjs` still tests the Node one.
