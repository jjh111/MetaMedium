# dyna.ink on Cloudflare — the site, the room relay and the models

Three things, all built here and none deployed until you do the steps below:

| What | Where | Address (yours to bind) |
|---|---|---|
| **The site** — the app, the whitepaper and the pages that run, as a Cloudflare Pages site, with security headers and the app's own policy | `build-site.mjs`, `pages/` | `https://dyna.ink` (the app at `/app/`) |
| **The room relay** — `Demos/relay.mjs`'s protocol as a Worker with one Durable Object per room: rooms anyone opens from the app (`POST /rooms`), a key per room, a room's pictures, https | `relay/` | `https://relay.dyna.ink` |
| **The models, on the relay** — dyna.ink's own decider (Cloudflare's Clef-flash, `/decide`), its writer and reader (`/ai/v1/…`) and an extraction route (`/extract`), through the Worker's Workers AI binding, so no key is ever in a browser | `relay/src/ai.mjs`, `Demos/decide-protocol.mjs`, `Demos/ai-protocol.mjs` | the same host |

**Status, 23 October 2026.** All three are built and tested in Node and in `workerd` (`wrangler dev
--local`), and the gate's `prod` scenario serves the built site as Pages does. **None of it has reached
Cloudflare**: no deploy has run, `relay.dyna.ink` is not bound, and no Workers AI model has been
called — every model reply the tests read is a fake (*Recording a real
System One reply*, below). Everything this file says about Cloudflare's own behaviour is marked
*unverified* where it is.

GitHub Pages keeps publishing as before (`https://jjh111.github.io/MetaMedium/app/` and every old
address). dyna.ink is a second home. The relay is what lets two people on two machines draw on one
board, and an iPad on https join a room an agent is in: an https page cannot reach a plain-http relay on
a LAN, so a room between your iPad and a Claude Code session anywhere needs an https relay.

```
a tab   ── https://dyna.ink/app/?live=r-…#key=…  (an invite: the key after #, never sent to a server) ──┐
                                                                                                      ├─ Worker ─ Durable Object per room (its lines and pictures, in storage)
Claude Code ── MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=… node Demos/mcp.mjs ───────────────────────┘     └ Workers AI (only when a person asks)
```

## What you do, once — from a browser (an iPad is enough)

Nothing to install: the workflow on GitHub deploys (`.github/workflows/deploy-cloudflare.yml` makes the
Pages project the first time, deploys the site and the Worker, and puts the relay's secret when you keep
it on GitHub).

1. **Sign in to Cloudflare with GitHub** (the dashboard's *Sign in with GitHub*; it uses your GitHub
   primary email, and makes an account if that email has none).
2. **Add dyna.ink**: *Add a domain*, then change the nameservers at your registrar to the two it gives.
   This can wait, but rooms and dyna.ink's own models answer nothing on the published app until
   `relay.dyna.ink` is bound (step 9; *Trying it before the domain*, below): at dyna.ink and at the old
   address alike, *Share this board* says *the relay did not answer*, and no house model is seated.
3. **Open *Workers & Pages* once**, so the account has a `workers.dev` subdomain (a first `wrangler
   deploy` with `workers_dev = true` may refuse without one — unverified). **Open *AI → Workers AI*
   once**, and enable it or accept its terms if it asks: the decider, the writer and the reader are Workers
   AI calls billed to this account. Whether the Worker's binding answers before you have done this is
   unverified.
4. **An API token**: *My Profile → API Tokens → Create Token → Custom token*, your account, with
   **Account · Cloudflare Pages · Edit**, **Account · Workers Scripts · Edit** and **Account · Workers AI ·
   Read**. Whether deploying a Worker with an `[ai]` binding needs the last is unverified; it costs
   nothing to include. Copy the token, and your **account id** (the dashboard's account home, right-hand
   side). These permissions have never been run against an account: the first green deploy (step 8) is
   what verifies them.
5. **A relay secret**: any long random string — a password manager's generator, 32 characters or more.
   **Keep it**: every room key is made from it, the keys of the rooms the app opens included.
6. **Choose one home for that secret** — not both:
   - **on GitHub**, as the repository secret `MM_RELAY_SECRET`: the workflow puts it on the Worker after
     every deploy (from stdin, never on a command line or in a log). Easiest from a browser alone. A
     rotation is then done here, because the next deploy writes this value over whatever the Worker holds;
   - **on the Worker**, after the first deploy has made it: *Workers & Pages → dyna-relay → Settings →
     Variables and Secrets → Add*, type *Secret*, name `MM_RELAY_SECRET` (or `wrangler secret put`, below),
     and no GitHub secret. The Worker keeps it across deploys. Until it is set the relay answers 503 to
     every room, in words.
7. **GitHub → the repository that deploys → Settings → Secrets and variables → Actions → New repository
   secret**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `MM_RELAY_SECRET` if you chose GitHub.
   **Which repository**: only one may hold them, or two deploys overwrite each other's site and Worker.
   `NEW-REPO-PLAN.md` puts them in the new dyna.ink repository (its §7–§8) and none in this one, which holds
   none today.
8. **Actions → Deploy to Cloudflare → Run workflow**, from `master` (or merge to `master` and let CI pass;
   *When it deploys*, below). Green is not enough on its own: with either secret missing every step is
   skipped and the run is still green, so open the run and see that *Deploy to Pages* and *Deploy the
   Worker* ran. Then the site is at (usually) `https://dyna-ink.pages.dev` and the relay at
   `https://dyna-relay.<your-subdomain>.workers.dev`.
9. **Bind the addresses** once dyna.ink is active: *Workers & Pages → dyna-ink → Custom domains →*
   `dyna.ink`; `www.dyna.ink` as a *Redirect Rule* to the apex, **never a second Pages domain** — each origin
   has its own browser storage, so a second one splits a person's boards in two; and *dyna-relay → Settings
   → Domains & Routes → Add → Custom domain →* `relay.dyna.ink` (or uncomment `routes` in
   `relay/wrangler.toml`; the dashboard does the same). Check it:

   ```sh
   curl https://relay.dyna.ink/                                   # 200: dyna.ink relay — rooms/<room>/events …
   curl -s -o /dev/null -w '%{http_code}\n' https://relay.dyna.ink/rooms/claude/events   # 401: it wants a key
   curl https://relay.dyna.ink/rooms                              # {"idleDays":30,"opens":true}
   curl https://relay.dyna.ink/decide                             # the decision models — 501 means no Workers AI binding
   curl https://relay.dyna.ink/ai/v1/models                       # the writer and the reader — no model is called
   ```
   The two model lists prove the binding is there, not that a model answers: *Recording a real System
   One reply*, below, is the first real call.
10. **A room key for an agent** is made from the secret, on any machine with Node (or in a Claude Code
    session you give the secret to): `MM_RELAY_SECRET=… node cloudflare/relay/room-key.mjs claude`
    (*Keys*, below). Rooms you share from the app need no key from you: the relay makes one per room.

If you change a **variable** (the table below), change it in `relay/wrangler.toml`'s `[vars]` and commit:
the deploy carries it. A variable set only in the dashboard is replaced by the next `wrangler deploy`
(wrangler's default, which `keep_vars = true` changes; not tried here). Secrets are not touched by a deploy.

### Trying it before the domain (`*.pages.dev`, `*.workers.dev`)

The site at `dyna-ink.pages.dev` opens, draws, keeps boards in that browser and works offline with nothing
changed. **Rooms and dyna.ink's own models do not**, because the app and the relay each name only the other's
final address:

- the app shares through `https://relay.dyna.ink` on dyna.ink and the old address, and through this
  machine's relay (`http://127.0.0.1:8020`) everywhere else, `*.pages.dev` included (`roomRelayFor` in
  `Demos/surface/24-relay.js`); it seats dyna.ink's own decider, writer and reader only on dyna.ink and the
  old address (`houseFor` in `Demos/surface/03-seats.js`);
- the app's policy lets it reach `relay.dyna.ink` and no other relay (`pages/csp.txt`, `connect-src`);
- the relay takes browsers from its built-in origins only (`ORIGINS` in `relay/src/http.mjs`), and
  `*.pages.dev` is not one.

To try rooms there anyway: name the trial site in the relay's `MM_RELAY_ORIGINS`
(`"https://dyna-ink.pages.dev"`, in `wrangler.toml`), and the trial relay's origin in `csp.txt`'s
`connect-src` — **and** in `site.test.mjs`'s one exception beside `relay.dyna.ink`, or the site test refuses
it (*the policy allows dyna-relay.….workers.dev and nothing in the source loads from it*; tried) and CI with
it. Then type the relay's address under *share → more ways in* before *Share this board*. A guest does the
same and pastes the invite into that pane: an invite that names a relay other than the app's own is not
taken from a link (*this link names a relay this page does not use*, `24-room.js`), so nobody can send a page
on dyna.ink to a relay of their choosing. The seat — Claude answering what the page asks — is refused on any
relay but `https://relay.dyna.ink` (`ownRelay`, `24-relay.js`), and dyna.ink's own models are not seated at
all. Take the trial out again before binding the domain. Binding the domain first is the shorter way.

## What you do, once — from a terminal

You need a Cloudflare account with **dyna.ink added as a zone** (Websites → Add a site; change the
nameservers at the registrar as it says). Steps 3, 4 and 9 of the browser list stand as they are.

Every command here runs from the repository's root.

### 1. The Pages project

```sh
(cd cloudflare/relay && npm ci)        # installs wrangler 4.146.0, the lockfile's — the version the deploy uses (once)
W=cloudflare/relay/node_modules/.bin/wrangler
"$W" login                             # opens a browser; this is your machine, not CI
"$W" pages project create dyna-ink --production-branch master
```

The first deploy can be by hand to see it work (the workflow does the same, naming the commit):

```sh
node cloudflare/build-site.mjs                    # cloudflare/dist/ — 216 files, about 30 MB (23 Oct 2026)
node cloudflare/build-site.mjs --commit <sha>     # the same, with <meta name="dynaink-commit"> in the app's two pages
"$W" pages deploy cloudflare/dist --project-name dyna-ink --branch master
```

### 2. The relay Worker

```sh
(cd cloudflare/relay && npx wrangler deploy)           # the Worker, its two Durable Object classes (Room, Limits) and the AI binding
SECRET=$(openssl rand -base64 32); echo "$SECRET"      # KEEP THIS (a password manager): room keys are made from it
printf '%s' "$SECRET" | (cd cloudflare/relay && npx wrangler secret put MM_RELAY_SECRET)
```

Then bind `relay.dyna.ink` and check it as step 9 says.

## When it deploys

`.github/workflows/deploy-cloudflare.yml`, changed this cycle:

- **After CI passes on `master`, never on a push alone** (`workflow_run` on the *CI* workflow), so a change
  that breaks the engine, the bundles, the browser gate or WebKit is never deployed. It deploys the commit
  CI passed (`head_sha`), **and only while that commit is still `master`'s tip**: CI runs finish in any
  order, so a run whose commit `master` has moved past says so, deploys nothing and stays green — the tip's
  own CI deploys the tip. If it cannot read where `master` is, the run fails out loud.
- A CI run that failed or was cancelled, one for a pull request, and a branch called `master` in a fork deploy
  nothing. *Run workflow* by hand works from `master` only, and takes `master` as it stands.
- Before deploying, each job runs its checks again: the site's (`site.test.mjs`), and the relay's whole `npm
  test`, `workerd` included. Wrangler is the relay lockfile's for both deploys (no action installs another).
  Runners are pinned (`ubuntu-24.04`) with a 15-minute timeout.
- **From the repository that holds the secrets, and only from it.** With `CLOUDFLARE_API_TOKEN` or
  `CLOUDFLARE_ACCOUNT_ID` absent every step is skipped. `NEW-REPO-PLAN.md` moves the secrets to the new
  dyna.ink repository; this one is never given them, and goes on serving the old address through GitHub Pages.

## The Worker's variables

Every one is optional; each is read where the table says. Set them in `relay/wrangler.toml`'s `[vars]`
(each is there, commented), except the secret.

| Variable | Default | What it does | Read in |
|---|---|---|---|
| `MM_RELAY_SECRET` (a **secret**) | none: every room, and opening one, is refused (503) | Room keys are the HMAC-SHA256 of a room's name under it. Comma-separated `new,old` while hands move to new keys; a room the app opens gets its key under the first | `relay/src/auth.mjs`, `worker.mjs`, `mint.mjs`, `ai.mjs` |
| `MM_RELAY_OPEN` | unset | `1`: no key is asked anywhere, and `POST /rooms` answers `key: null` — an open relay, on purpose, for a trial; never the address you keep | `worker.mjs`, `mint.mjs` |
| `MM_RELAY_ORIGINS` | unset | More origins a browser may call from, comma-separated, beside the built-in `https://dyna.ink`, `www.`, `app.`, `https://jjh111.github.io` and `localhost` / `127.0.0.1` / `[::1]` on any port | `relay/src/http.mjs` (`ORIGINS`) |
| `MM_RELAY_MAX_LINES` | 5,000 | Lines a room keeps. Past it, what replay would never send goes first (a hand's own whole logs a newer one stands after), then the oldest; a hand that joins later is told the room is older than the relay remembers | `Demos/relay-protocol.mjs` (`DEFAULT_MAX_LINES`) |
| `MM_RELAY_MAX_BYTES` | 32,000,000 | Characters of lines a room keeps, by the same rule | `worker.mjs` (`DEFAULT_MAX_CHARS`) |
| `MM_RELAY_ASSET_BYTES` | 67,108,864 (64 MiB) | Bytes of pictures a room keeps. Past it a put is refused (507, in words) and no picture is ever let go — an event may still name it | `relay-protocol.mjs` (`DEFAULT_ASSET_ROOM_BYTES`) |
| `MM_RELAY_MINT` | on | `0`: `POST /rooms` opens no room (503, in words), and `GET /rooms` says `opens: false` | `relay/src/mint.mjs` |
| `MM_RELAY_MINT_PER_HOUR` | 10 | Rooms one address may open in an hour (429 with `retry-after` past it) | `mint.mjs` |
| `MM_RELAY_MINT_PER_DAY` | 500 | Rooms the relay opens in a day, for everyone together | `mint.mjs` |
| `MM_RELAY_ROOM_IDLE_DAYS` | 30 | Days a room the relay opened is kept after its last use; then everything it holds is deleted | `relay-protocol.mjs` (`DEFAULT_ROOM_IDLE_DAYS`) |
| `MM_DECIDE` | `limited` | Who may ask `/decide` and `/extract`: `off`; `keyed` (a room's key only); `limited` (the app's own pages, counted by address, and hands with a room's key). Any other word: 503 | `relay/src/ai.mjs` |
| `MM_AI_DAILY` | 20,000 | Decisions and extractions a day, for everyone together; past it 429, and the engine's ranking stands. `0` refuses every call | `Demos/decide-protocol.mjs` (`DEFAULT_AI_DAILY`) |
| `MM_AI_CHAT` | follows `MM_DECIDE`, else `limited` | Who may ask the writer and the reader (`/ai/v1/chat/completions`), the same three words — so `MM_DECIDE = "off"` alone turns every model off, and `MM_AI_CHAT` set says otherwise for the writer and reader | `Demos/ai-protocol.mjs` (`chatModeOf`) |
| `MM_AI_CHAT_DAILY` | 2,000 | Writer and reader calls a day, for everyone together — a budget apart from the decisions', because a chat call costs far more. `0` refuses every call | `ai-protocol.mjs` (`DEFAULT_AI_CHAT_DAILY`) |
| `MM_AI_WRITER` | `@cf/qwen/qwen3.8-27b` | The Workers AI model the writer asks. The page never names an `@cf` id: it asks for `writer`, and the relay maps it. A value that is no `@cf/…` id leaves the writer *not set up* (503) | `ai-protocol.mjs` (`DEFAULT_AI_MODEL`) |
| `MM_AI_READER` | `@cf/qwen/qwen3.8-27b` | The one the reader asks; it must take pictures | `ai-protocol.mjs` |

**Bindings** (`wrangler.toml`): `ROOMS` (the `Room` Durable Object), `LIMITS` (the `Limits` Durable Object,
where every count below the rooms is kept, so a limit is one count wherever a request lands) and `AI`
(Workers AI). Without `LIMITS`, `POST /rooms` and the model routes fail closed (503); without `AI`, the model
routes answer 501 in words and the page seats no house model. The class names, the migration tags `v1` and
`v2`, the Worker's name `dyna-relay` and the secret keep every room and every key: change one and they are
lost (`NEW-REPO-PLAN.md` §6).

**Not the Worker's**: `MM_RELAY_ASSET_DIR` (the Node relay keeps pictures as files there), `PORT`,
`MM_DECIDE_FAKE` / `MM_AI_FAKE` (`dev-server.mjs`: a fake model in the binding's place); and `MM_RELAY`,
`MM_RELAY_KEY`, `MM_ROOM`, `MM_NAME`, which the hands read (*Keys*, below).

**The limits that are constants**, in code (one file read by both relays; the Node relay keeps the claims and the
line and picture limits, and only the Worker has the floodgate and the model routes):

| What | Limit | Where |
|---|---|---|
| A hand's lines into a room | 30 lines in 10 s and 16,000,000 characters a minute, each a bucket with an equal burst (a hand is its secret's hash, else its name) | `relay-protocol.mjs` (`FLOOD`) |
| One address's lines into a room, whatever hands it writes as | 150 lines in 10 s, 24,000,000 characters a minute (`cf-connecting-ip`) | `relay-protocol.mjs` (`FLOOD_ADDRESS`) |
| A room, from all its hands | 300 lines in 10 s, 24,000,000 characters a minute | `relay-protocol.mjs` (`FLOOD_ROOM`) |
| New names one address may claim in a room | 30, then one more every 20 s | `relay-protocol.mjs` (`NEW_HANDS`) |
| Names a room keeps | 1,000; names no kept line was written under go first; past it a newcomer is told to open a new room (429) | `relay-protocol.mjs` (`MAX_CLAIMS`) |
| One line | 4,000,000 characters (413); a hand cuts a bigger log into pieces of 3,000,000 (`LINE_CHARS`, `core/src/store/live.ts`) | `relay-protocol.mjs` (`MAX_LINE_CHARS`) |
| One picture | 12 MB, a PNG, JPEG, WebP or GIF by its own bytes, its hash checked (413, 415, 422) | `relay-protocol.mjs` (`MAX_ASSET_BYTES`, `assetCheck`) |
| A room's name | 1–128 characters; a beat on every open stream every 25 s | `relay/src/worker.mjs` |
| Decisions, per minute | 20 per address (an IPv6 address counted by its /64), 120 per room key; `/decide` and `/extract` share the count and the day's budget | `decide-protocol.mjs` (`DECIDE_PER_MINUTE`) |
| Decisions, per day | 1,000 per address, with a room's key or without (a key is free to have: `POST /rooms` mints one) | `decide-protocol.mjs` (`DECIDE_PER_DAY`) |
| A decision's size and wait | 64 KiB of words, 6 MiB with pictures (the pictures' alone), 16 questions; the relay waits 10 s (504) | `decide-protocol.mjs` (`DECIDE_LIMITS`, `DECIDE_WAIT_MS`) |
| Writer and reader, per minute | 10 per address, 30 per room key | `ai-protocol.mjs` (`AI_CHAT_PER_MINUTE`) |
| Writer and reader, per day | 200 per address, room key or not | `ai-protocol.mjs` (`AI_CHAT_PER_DAY`) |
| A chat call's size and wait | 32 messages, 64 KiB of words, 4 pictures, 6 MiB with them, at most 4,096 tokens out; the relay waits 60 s (504) | `ai-protocol.mjs` (`AI_CHAT_LIMITS`, `AI_CHAT_WAIT_MS`) |

A request to a model route with neither an `Origin` nor a room's key is refused (403): an `Origin` is easy to
leave out, and a script anywhere would otherwise spend the account's Workers AI. Every refusal is a sentence.

## Rooms anyone opens from the app

- **Share this board** (*controls → Helpers → share*): the page asks the relay to open a room (`POST
  /rooms`). The relay picks the name — `r-` and 128 random bits, never a name a person chose — and answers
  `{ room, key, idleDays }`, the key the HMAC of that name under the secret, kept nowhere. The board on screen
  goes in with the person: their marks, and other hands' marks each as a copy they hand on, the pictures put
  on the relay first, up to 12,000,000 characters of log (`CARRY_MAX_CHARS`, `24-relay.js`; past it, *share an
  empty board instead*). Who may open one is counted, not checked: a browser on the app's origins, or a program
  that sends no `Origin`, each held to 10 rooms an hour by address, the relay to 500 a day.
- **Copy invite link**: `https://dyna.ink/app/?live=r-…#key=…` — `&relay=` only when the room is on a relay
  other than the address's own. **The key is after `#`**: a browser sends the fragment to no server and no
  `Referer` carries it. A page in a room keeps `?live=<room>` in its address and the key in its fragment, so a
  reload rejoins, and drops the key from every other address it makes. The stream and every line send the key
  as `Authorization: Bearer`; only a browser that cannot read a stream with `fetch` falls back to an
  `EventSource` with `?key=` in its address. An old link's `?key=` still works and is moved into the fragment at
  once — though the request that loaded it has carried it to the site's server.
- **A guest** opens the link in any browser, is asked a name the first time (the page came by an invite and
  none is kept), and joins. Joining never brings the guest's own board in. The bar shows the room and a dot for
  each person drawing. A name is **claimed** by the first hand that writes under it (`x-dyna-hand`, a secret of
  the sitting, kept as a SHA-256), so a second hand under the same name is refused (409) and told why;
  `Demos/live-node.mjs` sends a secret for every Node hand, and a hand that sends none works only under a name
  nobody has claimed.
- **Offline**: what a hand draws is held on its page and sent again when the relay answers (2 s, then backing
  off to 30 s, and at once on `online`). Leaving, or switching boards, with marks not yet taken is refused and
  said, with *Leave anyway* beside it.
- **Save a copy to my boards** keeps the room's board, as it stands, in this browser as a board of the person's
  own — **the only way a room's board is kept on a device**. A room the relay opened is forgotten 30 days after
  it was last used; `GET /rooms` tells a guest how long, and a guest in an empty room is told it may have been.
- **more ways in**: a room by name, or an invite pasted, with a relay typed; and *with Claude* (room `claude`,
  the board on screen carried in, the seat taken through it — below).
- The gate holds it: `node e2e/run.mjs room` (two browsers in a minted room on the Worker's logic in Node).

## Keys: handing an agent a room

A room's key is `HMAC-SHA256(secret, "dyna-room:" + room name)`, 43 characters. There is no table of keys on
the relay and nothing to revoke one by one: the relay recomputes the key for whatever room it is asked about.
A key opens **that room and no other**; the key for the room `*` opens every room.

```sh
export MM_RELAY_SECRET='…the secret you kept…'
node cloudflare/relay/room-key.mjs claude          # the key for room "claude" (stdout), and how to use it (stderr)
node cloudflare/relay/room-key.mjs '*'             # opens every room — yours; do not hand this to an agent
```

- **Your tab (the iPad):** `https://dyna.ink/app/?live=claude#key=<key>` — the key after `#`, so it reaches
  no server. (`room-key.mjs` still prints the older `&key=` form; it works, and the page moves the key into the
  fragment, but the first request carries it.) Bookmark it or add it to the Home Screen from there. The app
  leaves the key out of the log, the board, an export, every cache and every other address, and sends
  `Referrer-Policy: no-referrer`. On dyna.ink the share pane's *with Claude* uses this relay (room `claude`)
  and the key the page was opened with, and takes the seat through it.
- **An agent** (Claude Code anywhere, `Demos/mcp.mjs`; `Demos/seat-watch.mjs`): the environment,
  `MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=<key> MM_ROOM=claude`, sent as `Authorization: Bearer`.
  (`--relay` / `--key` also work, but an argument is in the process list.)
- **Rotate**: change the secret where you keep it (step 6) — that retires every key at once, every invite
  link the app has handed out included. To move hands over gently, set it to `new,old` (new first), hand out the
  new keys, then set it to `new` alone; the rooms the app opened stay reachable through their old links only
  while `old` is listed.
- **No key set up yet**: a relay with neither `MM_RELAY_SECRET` nor `MM_RELAY_OPEN=1` answers 503 to every
  room and says why. It fails closed.
- A wrong or missing key is said, never silent: the MCP hand and the watcher print *that is not the key for
  room “claude”* and exit 1; a tab's status line says *the relay does not take this key for this room*, and a
  page that came by an invite says *this invite link does not open the room — ask whoever sent it for a new
  link*.

## A Claude Code session joins a room

In a terminal, on any machine:

```sh
MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=<key> node Demos/mcp.mjs          # the MCP hand, room "claude"
MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=<key> node Demos/seat-watch.mjs   # prints a line when your iPad parks a question for Claude
```

For a Claude Code session, give the MCP server the environment without committing the key — `.mcp.json` in
this repository stays as it is (a local relay):

```sh
claude mcp add dynaink --scope user \
  --env MM_RELAY=https://relay.dyna.ink --env MM_RELAY_KEY=<key> --env MM_ROOM=claude \
  -- node /path/to/MetaMedium/Demos/mcp.mjs
```

(`.mcp.json` in a project may also say `"env": { "MM_RELAY": "…", "MM_RELAY_KEY": "…" }`; do not commit a key
there. Whether Claude Code expands `${VAR}` in `.mcp.json` is unverified here.) Run `seat-watch.mjs` under the
session's Monitor tool as `CLAUDE.md` (*The canvas's seat*) says.

### What an agent does there: look, import a picture, say

An agent with a room key is **a hand in John's room**: what it draws, writes and says arrives in his tab as that
hand's own ink, in its own colour, and what he draws arrives for it. Fourteen tools; the ones for this flow, in
the order a session uses them:

1. **`canvas_look`** — the board in words, with ids: every mark and what the engine reads it as, the regions
   and the handwriting a line at a time, the pictures (*a picture sky.png 64×64 · its pixels are in the room —
   canvas_see draws it*), who else is in the room.
2. **`canvas_see`** — the ink as an image, **with the board's pictures under it**: a PNG is drawn in where it
   stands; a JPEG or WebP (what an iPad's photos are kept as) is a frame in that image and then arrives **as an
   image of its own, the very bytes the tab kept**.
3. **`canvas_import { path | url | base64, name?, at?: {x, y, w?, h?} | place?: {right: "<id>", …} }`** — puts a
   picture on the board: a PNG, JPEG or WebP, or an SVG (an `svg` artifact drawn from its text). The bytes go to
   the relay first, then the `import` event in the agent's log names them. Up to 12 MB; a refusal is a sentence
   and places nothing.
4. **`canvas_say`**, `canvas_propose`, `canvas_label` (only its own ink), `canvas_write`, `canvas_draw`,
   `canvas_find`, `canvas_region`, `canvas_move` — and the seat's `canvas_pending` / `canvas_answer`
   (`CLAUDE.md`, *The MCP hand* and *The canvas's seat*).

```sh
# the whole thing from a shell, no MCP client: one process kept alive across turns
touch /tmp/hand.in; MM_RELAY=https://relay.dyna.ink MM_RELAY_KEY=<key> node Demos/mcp.mjs < <(tail -f /tmp/hand.in) > /tmp/hand.out &
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"canvas_import","arguments":{"path":"/path/to/sketch.png","at":{"x":0,"y":0,"w":400}}}}' > /tmp/hand.in
```

**Pictures in a room, as the relay keeps them.** `PUT|GET|HEAD https://relay.dyna.ink/rooms/<room>/assets/<sha256>`
— the room's key as `Authorization: Bearer`, the bytes as the body, verified against the hash on arrival, a picture
only, up to 12 MB, a room's pictures capped (`MM_RELAY_ASSET_BYTES`). A get is immutable and cached for a year (its
address is its content). They are kept in the room's **Durable Object storage**, in pieces of 96 KiB, not R2: R2 is
a second product to enable (it asks for a payment method even on its free tier), a second binding and a second place
a room's data could outlive the room. The Node relay keeps pictures in memory, or as files under
`MM_RELAY_ASSET_DIR`, with the same rules.

## The models: dyna.ink's own decider, writer and reader

The page asks them by a short name and the relay maps it, in code, to a Workers AI model: no key in a browser,
no `@cf` id in a page.

| Route | What | The page asks it |
|---|---|---|
| `POST /decide` (`GET` lists) | A decision model of Cloudflare's System One class: `clef-flash` (the page's default), `clef`, `clef-omni` (sees pictures) | *Which is it?*, *Which diagram is this?* — a tap each — and, for a person who chose it with a model here to write, *what should this brief make?* on a brief's Enter. Held only when 99% sure |
| `POST /ai/v1/chat/completions` (`GET /ai/v1/models` lists) | dyna.ink's `writer` and `reader`, OpenAI's chat shape, so core's transport speaks to them unchanged | The writer: *What is this?*, a brief, `ask:`, `draw:`. The reader: *Read the writing*, *Read these*, *Read the picture* |
| `POST /extract` (`GET` lists) | An extraction model (`clairic`) | Nothing yet: the route and its checks only |

- **Seated only when the relay answers.** On dyna.ink and the old address the page reads each list once when it
  opens (`GET /decide`, `GET /ai/v1/models` — no model is called) and seats dyna.ink's own models only if the list
  answers; with the relay unbound, closed or without the binding, it seats nothing and behaves as before.
- **Last, never first.** A model of the person's own, or Claude Code seated, is asked before dyna.ink's. *none* on a
  seat (*models → seats*) stops dyna.ink's own there and is remembered; *dyna.ink's own* takes it back.
- **Asked only by a person's act** — never on drawing, holding, opening the field or joining; auto-read never
  asks dyna.ink's reader. An ask the house cannot answer just now (a 429, a 5xx, a timeout) is kept for a model of
  the person's and said in the relay's own words.
- To try them on this machine with a fake model:
  `MM_AI_FAKE=1 MM_RELAY_OPEN=1 node cloudflare/relay/dev-server.mjs`, then the app served on this machine with
  `?decide=http://127.0.0.1:8787&ai=http://127.0.0.1:8787` (honoured only on a page on this machine). The fake
  measures nothing of any real model.

**Unverified, all of it against the real service**: the `@cf` ids (`@cf/cloudflare/clef-flash`, `clef`,
`clef-omni`, `clairic`, `@cf/qwen/qwen3.8-27b`); what `env.AI.run` takes and returns for each (System One's
field names, whether a chat model answers `{ response }` or `{ choices }` — both are read, anything else is a 502 in
words); whether Qwen3.8 27B sees and how much it reads (one catalog says 8K of context on Workers AI); whether a
27B model writes a page within the relay's 60 s; and whether Clef's answers ever reach the 0.99 the page takes
them at.

## Retention and privacy

What the relay keeps, logs and sends, said plainly. It is carriage, not safekeeping, and there is no end-to-end
encryption: whoever runs the Worker (you) and Cloudflare could read a room.

**What it keeps**, in each room's Durable Object storage on Cloudflare, in clear:

- **A room's lines** — each hand's log: its ink, its words, the readings and names it wrote. No model key and no
  room key is ever in a log.
- **A room's pictures** — the bytes every hand put there, by their hash.
- **A SHA-256 of each claimed name's sitting secret**, never the secret. Presence beats are passed on to the open
  streams and never stored.
- **How long**: a room **the relay opened** (`r-` and 22 characters) is kept until nobody has used it for
  `MM_RELAY_ROOM_IDLE_DAYS` (30). A use is a line sent (a beat included), the stream opened or a picture put; a
  picture fetched is not one. Then an alarm deletes everything the room holds (`storage.deleteAll()`), lets go of
  its memory and closes its streams; nothing of it is kept anywhere else. Accurate to about an hour. A room
  **named by hand** (`claude`, a name typed) is never expired: it holds at most `MM_RELAY_MAX_LINES` lines and
  `MM_RELAY_MAX_BYTES` characters, the oldest let go once what replay never sends has gone, and its pictures up to
  `MM_RELAY_ASSET_BYTES`, never let go. **Changing the secret deletes nothing**: it makes every key stop opening
  every room, but what a named room holds stays in storage (a room the relay opened goes 30 days later, since nobody
  can use it). No route deletes a room; deleting the `Room` class (a
  migration) deletes every room, opened or named — not tried here.
- **Counts by address**: the `Limits` object keeps, for each window, a count under the caller's address
  (`cf-connecting-ip`; an IPv6 address by its /64) — for rooms opened an hour, and for model calls a minute and a
  day — and deletes each window once it has ended, so an address is kept at most a day. A room's floodgate keeps its
  buckets in memory only.
- **Nothing of a model call** — no state, question, message or picture; nothing is cached, and AI Gateway is not
  used (its logs would keep a board's words).
- **Not a room key**: keys are recomputed on every request and stored nowhere.

**What it logs**: one JSON line per model call — `{ route, model, status, ms, bytes }` — never its words, its
pictures or a key; nothing per room line. `wrangler.toml` turns on no persistent logging (`wrangler tail` shows the
lines live). Cloudflare itself sees every request — the address it came from, and the path, which names the room
— and what it keeps of that is Cloudflare's (unverified here).

**What it sends to Cloudflare's Workers AI, and when** — only when a person asks:

- **the decider**: when someone taps *Which is it?* or *Which diagram is this?*, the words written on and beside the
  marks asked about (labels, read writing, typed text, a figure's words, region names — never an id, Mermaid text or
  a file name) and a line on each thing it chooses between (a definition: what it was drawn as, the words written
  beside it; a kind of diagram: its name); on a brief's Enter, only for a person who chose
  dyna.ink's decider and has a model here to write, the brief typed too;
- **the writer**: on *What is this?*, a brief, `ask:` or `draw:`, the prompt every model is given — the drawing
  described in words (its shapes, how they relate, the words on them) and what was typed;
- **the reader**: on *Read the writing* or *Read these*, a picture of the ink; on *Read the picture*, that picture,
  at most 1,568 px on its long side.

Whether Workers AI keeps what it is sent is Cloudflare's to say — unverified here; read Cloudflare's terms for
Workers AI before a public launch.

**A room's key is a link.** Anyone holding an invite link, or an address with `#key=` in it, can read every line and
picture in that room, draw in it, and save a copy — until the room is forgotten or the secret changes. There is no
revoking one person's access; rotating the secret retires every key at once.

**Budgets, and turning them off.** Every model call counts against its address's share of the day (1,000 decisions,
200 writer and reader calls) and the day's budget for everyone (`MM_AI_DAILY` 20,000, `MM_AI_CHAT_DAILY` 2,000). To
turn the models off: `MM_DECIDE = "off"` (the decider, and the writer and reader unless `MM_AI_CHAT` says otherwise);
`MM_AI_CHAT = "off"` (the writer and reader alone); `keyed` admits only hands with a room's key. A page that reads a
closed list seats nothing, so the app goes on as it was. `MM_RELAY_MINT = "0"` stops new rooms.

## Costs to check before relying on it

All unverified here: Cloudflare changes its plans and prices, and no account has run this.

- **Workers Paid** is likely needed for real use; the free plan's Durable Object and Workers AI allowances have not
  been checked against a public launch.
- **Durable Object duration**: an open stream holds its room's object awake, billed by the wall-clock second, with a
  beat every 25 s. The relay uses Server-Sent Events, not hibernating WebSockets, so a room with a tab left open is
  awake the whole time. One tab and one agent is small; many rooms left open are not.
- **Durable Object requests and storage**: every line is a request and a few rows written (a 2 MB picture is about
  22 rows); every model call is up to three requests to the `Limits` object, every room opened two. Check the SQLite
  storage a Durable Object may hold and the rows a plan may write a day; a room full of photographs meets them
  first, and `MM_RELAY_ASSET_BYTES` is the knob.
- **Workers AI**: billed by use, per model, past whatever free allocation the account has. The defaults cap a day at
  20,000 decisions and 2,000 writer and reader calls, each chat call up to 64 KiB of words in and 4,096 tokens out;
  what that costs is not measured. Some newer models may need Workers Paid.
- **Rooms**: 500 opened a day at most, each kept 30 days after its last use.

## Recording a real System One reply

No real reply from Clef or Clairic has been seen: the fixtures are written by hand, and the decider's reader
(`core/src/llm/decide-systemone.ts`) accepts every spelling third-party write-ups mention. Once the relay is up, record
one reply per question shape — a choice, a score and a yes-or-no from Clef-flash, a choice with a picture from
Clef-omni, a text and a list field from Clairic:

```sh
node scripts/record-systemone.mjs --relay https://relay.dyna.ink     # through the relay, as the app's page asks
node scripts/record-systemone.mjs --rest --dry-run                   # what would be sent to Cloudflare's API; nothing is
CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… node scripts/record-systemone.mjs --rest   # Cloudflare's own API, with a token
```

Through the relay it uses `MM_RELAY_KEY` and `MM_ROOM` when they are set, else says it comes from dyna.ink's page.
Through the API the account and the token are read from the environment only (a token with Workers AI read access);
the script refuses `--token` or `--key` as an argument, and never prints the token. Each call is billed (a handful of
small ones). The replies are written into `core/src/llm/fixtures/systemone-replies.json` beside the hand-written
spellings, each read back by core's reader with what it noted; then narrow the reader to the spelling that really
comes back. Not in CI, never in the gate.

## Headers: what the app is allowed to do

`build-site.mjs` publishes the product's pages, not the whole repository: what cannot run as published (the 3D
shard, the Web App Skeleton, `lens-canvas` — each needs a dev server), the tests, the CI, the dated plans at the
root, the engine's source, the skills and every dot-file are left out, each with its reason (`whyLeftOut`); the
root keeps `README.md`, `HELP.md` (the help pane reads it), `CHANGELOG.md`, `CONTRIBUTING.md`, `TRADEMARKS.md`,
`LICENSE`, `NOTICE` and `VERSION`. GitHub Pages still publishes everything at the old address. A `robots.txt` asks
search engines not to index an app address with a query (a board, a replay, a room).

`pages/headers.template` and `pages/csp.txt` become `_headers`:

- **Every page**: HSTS for six months, this host only (`max-age=15552000`, no `includeSubDomains`: `relay.dyna.ink`
  is a subdomain; no `preload`) — if you also set HSTS on the zone, keep it the same — and a floor policy:
  `object-src 'none'; base-uri 'self'; frame-ancestors 'self'`.
- **The app** (`/app/`, the old address and `/Demos/session-engine`): `csp.txt` and `no-referrer`, once each. The
  policy allows exactly what its source loads: its own files; the two CDNs three.js and mermaid load from; the
  relay (rooms, the decider, the writer and the reader are one host); OpenRouter, Anthropic and GitHub's API;
  Hugging Face for the semantic seat's model files; a model on this machine (`localhost`, `127.0.0.1`, any port).
  `'unsafe-inline'` and `'unsafe-eval'` stand because a program's frame inherits the policy and runs its code with
  `new Function`; what contains that code is the iframe's sandbox (opaque origin) and the frames' own policy
  (`connect-src 'none'` for a program and a Mermaid frame, and for the frame a behaviour's worker runs in), not
  this one.
- **The app carries its own policy** too: the build writes `csp.txt` into the app's two pages as a `<meta
  http-equiv="Content-Security-Policy">` after the charset (less `frame-ancestors`, which only a header says). Pages
  matches `_headers` against the path as asked, still encoded, so `/ap%70/` or `//app/` served the app under the floor
  alone; with the policy in the page it holds at any address Pages answers with the app.
- **Not sent: COOP and COEP.** `require-corp` would refuse the CDN scripts unless each sends
  `Cross-Origin-Resource-Policy` (unverified for cdnjs and jsdelivr) and every sandboxed frame; `credentialless`, which
  would not, is missing in Safari, and the iPad is the first target.
- **Another model or relay address is refused until it is named** in `connect-src` (and in the source, or
  `site.test.mjs` refuses it — *Trying it before the domain*). An https page calling a plain-http LAN address is mixed
  content in Safari whatever the policy says (`PLAN-IPAD-NOTES.md` §6); `http://localhost` is allowed by Chromium and
  Firefox and unverified in Safari.
- **Pages serves `/Demos/session-engine.html` at `/Demos/session-engine`** (a 308, query kept); the policy stands on
  both, and the service worker answers either offline after one visit. `/app` → `/app/` is `_redirects`, query kept.

## Try it without Cloudflare, and the tests

```sh
MM_RELAY_SECRET=test node cloudflare/relay/dev-server.mjs      # the Worker's logic in Node, :8787, in memory
MM_AI_FAKE=1 MM_RELAY_OPEN=1 node cloudflare/relay/dev-server.mjs   # …with a fake model in the AI binding's place
cd cloudflare/relay && npx wrangler dev --local                # the real runtime (workerd), SQLite-backed storage, no login
node e2e/run.mjs prod                                          # the built site served as Pages serves it, the app run under its headers
node e2e/run.mjs room                                          # two browsers in a room the relay opened

node --test cloudflare/site.test.mjs                           # what is published and why not, the headers, the policy against the source, the deploy's guards
cd cloudflare/relay && npm test                                # the limits, the decider and chat routes, the protocol on the Worker (a fake Durable
                                                               # Object storage), the parity with the Node relay, the hands over a socket, and workerd
```

To see the real Pages server, run `wrangler pages dev` on `cloudflare/dist` with a wrangler installed **outside**
`cloudflare/relay`: the relay's own install finds the relay's `wrangler.toml` through its Pages shim and fails with
*Durable Objects … not exported: Room*. `node e2e/run.mjs prod` needs neither (`e2e/pages.mjs` applies `_headers`,
`_redirects`, the `.html` 308 and the 404 as wrangler 4.146's Pages server does — checked against it, not against
production).

The relay shares its protocols with the Node relay — `Demos/relay-protocol.mjs` (rooms, claims, the floodgate,
pictures), `Demos/decide-protocol.mjs` and `Demos/ai-protocol.mjs` (the model routes, which the Node relay answers 501
in words) — one file each, read by both, so they cannot drift; `Demos/relay.test.mjs` tests the Node relay, and the
picture cases are one file (`Demos/relay-assets.conformance.mjs`) run against both.
