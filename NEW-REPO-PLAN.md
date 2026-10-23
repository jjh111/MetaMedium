# Starting the dyna.ink repository from this milestone

**23 October 2026 · a plan, for John.** Nothing on GitHub has been created; every step that
makes, moves or deploys something is John's to take. The numbers in §1 and §5 were measured
on this repository and are said with their command. This plan **replaces the transfer in
`RENAME-PLAN.md` H1** (§2, *the old repository stays where it is*).

---

## 0. In one paragraph

This cycle tied up the demo's loose ends so it works as a multiuser web app (§1). The next
step is a new repository, `dyna.ink`, that starts from that milestone and is where the product
is built and deployed from. It starts from the tree as it stands — the full history of
`master` and one commit that leaves the experiments, the legacy demos and the archive behind
— so every hash the changelog cites still resolves, the tests and the gate run unchanged, and
a fix can still be cherry-picked to the old address while people carry their boards across.
**The old repository stays where it is**, keeps serving `jjh111.github.io/MetaMedium/`, and is
the address boards are carried *from*; nothing deploys to Cloudflare from it again. Moving the
code into `packages/` and `apps/`, slimming `CLAUDE.md` and curating the site come after the
seed, as units in the new repository with the gate as their oracle.

## 1. The milestone

What this cycle added on top of `master` 6f541ef (the branch `claude/loving-maxwell-zagdqy`):

| | What a person can do now | Where |
|---|---|---|
| **Rooms anyone can open** | *Share this board* opens a room on the relay, carries the board in, and *Copy invite link* hands it on (the key after `#`, never sent to a server); a guest names themself; the bar shows who is here; *Save a copy to my boards*. A forged line in another hand's name is refused; a send that fails is sent again; a big board goes in pieces; a room the relay opened is forgotten 30 days after its last use | `cloudflare/relay/src/mint.mjs`, `Demos/relay-protocol.mjs`, `core/src/store/live.ts`, `Demos/surface/24-room.js`; gate `room` |
| **dyna.ink's own decider, no key** | Cloudflare's **Clef-flash** (a System One decision model, 1 Oct 2026) answers *Which is it?*, *Which diagram is this?* and *what should this brief make?* — through the relay's Workers AI binding, so no key is ever in a browser; held only when 99% sure | `core/src/llm/decide-systemone.ts`, `cloudflare/relay/src/ai.mjs`, `Demos/decide-protocol.mjs`; gate `models` M37+ |
| **Another hand's code never runs without consent** | A program another hand put on the board plays in your tab only after *Play it here*; a behaviour runs in a sealed, opaque-origin frame that can reach no storage and no network | `Demos/surface/13-kinds.js`, `02-artifacts.js`; gate `security` |
| **A deploy that can be trusted** | The deploy waits for CI on `master`'s tip; the app carries its own policy; the site leaves out what cannot run; the gate runs the app as production serves it | `.github/workflows/deploy-cloudflare.yml`, `cloudflare/build-site.mjs`; gate `prod` |

Wave 3 (in flight as this is written): dyna.ink's own writer and reader through Workers AI, and
a UX pass. §1 is updated when it lands.

What it was checked with: every step of CI's core and shard jobs passes, and the browser gate on
Chromium gives **957 passed, 0 failed, 13 skipped by name across 17 scenarios** at `48ee8f4`
(`node e2e/run.mjs`). WebKit does not run in the container this was built in; CI runs it.

## 2. Decisions for John

| # | Decision | What this plan assumes until he says |
|---|---|---|
| 1 | The organisation and the repository's name | **Needed before anything else** — e.g. `dynaink/dyna.ink`. Reserving an organisation's name costs nothing |
| 2 | Public or private | **Public.** AGPL-3.0 §13: the app's help pane offers its source, so the address it names must open for anyone |
| 3 | History | **The full history of `master` and one commit that prunes** (§4). A fresh import and `git filter-repo` were both measured; neither is better (§4) |
| 4 | The default branch | **`master`.** It is written into the deploy, the Pages project (made with `--production-branch=master`), the license link and several tests; changing it would quietly stop production deploys |
| 5 | The old repository | **Stays at `jjh111/MetaMedium`, is never transferred or renamed.** A transfer moves its GitHub Pages address to the organisation's, which breaks every old link, every installed iPad app, and the carry, whose sender is the old address by name (`CARRY_OLD_ORIGIN`, `17-carry.js`). This replaces RENAME-PLAN H1's transfer |
| 6 | Where production deploys from | **Only the new repository.** Both have the deploy workflow; only the one holding `CLOUDFLARE_API_TOKEN` deploys. Two holding it would overwrite each other's site and Worker |
| 7 | The milestone tag | **Cut `0.2.0` in this repository after the branch merges** (`node scripts/release.mjs 0.2.0`, N5), and seed from `v0.2.0`, so the new repository starts from a release |
| 8 | What `dyna.ink/` is | **The whitepaper**, with the app at `/app/` (John, 2 Oct). Cheap to change now, costly after N4 |
| 9 | DynaInk3D | **Carried, not deployed.** Its page needs a build the deploy does not make yet (V1-PLAN R9) |
| 10 | Anyone on dyna.ink may open a room | **Yes**, 10 an hour per address and 500 a day; a room the relay opened is forgotten 30 days after its last use. All are Worker variables (§7) |
| 11 | dyna.ink's own models cost John's Cloudflare account | **Yes, within budgets**: 20,000 decisions a day (`MM_AI_DAILY`); the writer and reader's budget is set by the wave-3 lane. `MM_DECIDE=off` turns the routes off |

## 3. What is carried, and what stays

Measured on `48ee8f4` (`git ls-files`): 966 tracked files, a 22.7 MiB pack.

**Carried** — the product and everything its tests read:
`core/` (with `bench/` and the fixture bundle `format.files.test.mjs` needs), `Demos/` but for
the old micro-demos below (the surface and its fragments, both engine bundles, `sw.js`, the
manifest and icons, the MCP hands, the relay and its protocols, `programs/`, `recordings/`),
`app/`, `cloudflare/`, `e2e/`, `scripts/`, `brand/`, `boards/`, `stories/`, `dynaink-3d/`,
`skills/`, `launch-video/` (its web copies are played by an example), the Assets the whitepaper
uses, `index.html`, `404.html`, `HELP.md`, `VERSION`, `CHANGELOG.md`, `LICENSE`, `NOTICE`,
`TRADEMARKS.md`, `CONTRIBUTING.md`, `.github/`, `.mcp.json`, `.gitignore` — and **every dated
plan at the root, moved into `docs/`**: code comments cite them by name in hundreds of files
(V1-PLAN in 272, PLAN-IPAD-NOTES in 95), and left behind that reasoning would dangle.

**Stays in the old repository** (36 entries; the old site keeps serving them):
`gliner-seat`, `lens-canvas`, `manim-explainer`, `v2-poc`, `playground.html`, `test-llm.html`,
`test-vision.html`, `Web App Skeleton`, `doodle2-canvas.html`, `metadoodle1.html`, `archive`,
`MetaMedium_Whitepaper_v4.html`, `MetaMedium_Signal_Cartography.pdf`; in `Demos/`,
`composition-diagram-v2.html`, `composition-diagram-v4.html`, `doodle2-v1.html`,
`fish-demo.html`, `iceberg-sketches.html`, `no-modes-diagram.html`, `no-modes-graph.html`,
`relational-scene-canvas.html`, `shape-equation-demo.html`, `sna-drawing-demo.html`,
`waveform-canvas-v2.html`; in `Assets/`, `fig-MetaMediumTriad.svg`, `fig-digidraw.svg`,
`fig1-semiotic-triad.png`, `fig2-activity-theory.png`, `library-refactor.js`,
`metamedium-figures_1.html`, `thumb-metamedium.jpg`, `thumb-metamedium-v5.png`,
`ux-audit-2026-09-28/`; and the two `skills/*/.DS_Store` files and `.claude/`. Check the exact
file names against `git ls-files` at the freeze commit before running §5.

## 4. History

All three ways give the same tree; they differ in what `git log` and `git blame` can answer.
Measured after an aggressive gc on a full clone:

| | Pack | What it keeps |
|---|---|---|
| A fresh import, one commit | 18.6 MiB | Nothing before the seed; the changelog's 801 cited hashes resolve only in the old repository |
| `git filter-repo` of the carried paths | 20.8 MiB | 792 of 936 commits, rewritten — every hash changes. It must also be told every path's old name (`metamedium-core/`, `shard-3d/`, …) or history starts on 2 Oct |
| **The full history of `master`, then one prune commit** | 24.5 MiB | Every commit and hash; the `v0.1.0` tag; shared ancestry with the old repository, so a fix for the old address cherry-picks across |

A scan of every blob in the history found no key but the planted test keys (`sk-or-v1-PLANTED…`,
`sk-ant-PLANTED…`, `ghp_PLANTED…`) and no `.env` ever committed. Push only `master` and the
tags, never the other branches or `refs/pull/*`.

## 5. The procedure

From a **full** clone — the container this plan was written in holds a shallow one (100
commits, no tags), from which a seed must not be made:

```sh
SRC=v0.2.0                     # the milestone tag (§2 #7); or the freeze commit, with the gate green on it
git clone --single-branch --branch master https://github.com/jjh111/MetaMedium.git dynaink-seed && cd dynaink-seed
git fetch --tags && git checkout -b seed "$SRC" && git remote rename origin metamedium
tr '\n' '\0' < seed-drop.txt | xargs -0 git rm -r -q --      # §3's list, one path a line
git commit -m "Seed: dyna.ink from jjh111/MetaMedium@$SRC — the experiments, legacy demos and archive stay there"
```

Then the seed's own edits, one commit each, every one green on the suite below:

1. **The source address** (AGPL §13): `SOURCE_URL` in `Demos/surface/17-boards.js`, the links in
   `dynaink-3d/index.html`, `index.html`, `404.html`, `TRADEMARKS.md`, `CONTRIBUTING.md`; then
   `node Demos/build-surface.mjs`. `scripts/rights.test.mjs` holds that they agree.
2. **The tests pinned to the old file set**: `cloudflare/site.test.mjs`'s list of published files;
   `scripts/rights.test.mjs`'s count of packages (from 8 to the 4 carried: core, dynaink-3d, e2e,
   cloudflare/relay); `e2e/app.mjs`'s address search (links under `jjh111.github.io/MetaMedium/`
   are the old home's, not checked here).
3. **CI**: delete the `Web App Skeleton` job from `ci.yml`.
4. **`docs/`**: `git mv` the dated root documents into `docs/history/` (and `V1-SPEC.md`,
   `KEYFRAMES.md`, `PERF.md`, `QA-v1.md` into `docs/`), add `docs/history/SEED.md` naming the
   source repository, the commit, the drop list and where each dropped item still lives.
5. **`README.md` and `CLAUDE.md`, new**: the README as a front page; `CLAUDE.md` cut from 370 KB to a
   map of about 15 KB (what dyna.ink is, the repository map, the commands, the invariants, §6's kept
   names), with its architecture sections moved verbatim into `docs/architecture/`.
6. **What names what is left**: `HELP.md`'s pointer to `QA-v8.md`; `NOTICE`'s entries for paths left
   behind; `skills/dynaink-code/skill.md`'s Web App Skeleton lines; `.claude/launch.json`; remove
   `.nojekyll` (GitHub Pages only); `scripts/release.mjs`'s printed address.

The suite, as CI runs it:

```sh
(cd core && npm ci && npm run typecheck && npm test && npm run build:browser && npm run build:node \
  && cmp dist/dynaink-core.browser.js ../Demos/dynaink-core.browser.js && cmp dist/dynaink-core.node.mjs ../Demos/dynaink-core.node.mjs)
node Demos/build-surface.mjs --check && node scripts/build-app.mjs --check && node scripts/examples.mjs --check
node Demos/mcp-smoke.mjs && node Demos/mcp-client.smoke.mjs
node --test Demos/surface/*.test.mjs Demos/relay.test.mjs Demos/ink-png.test.mjs Demos/build-surface.test.mjs \
  Demos/core-bundle.test.mjs scripts/*.test.mjs stories/reader.test.mjs cloudflare/site.test.mjs
(cd cloudflare/relay && npm ci && npm test)          # with workerd
(cd dynaink-3d && npm ci && npm run typecheck && npm test && node mcp-smoke.mjs)
(cd e2e && npm ci) && node e2e/run.mjs && node e2e/run.mjs --browser webkit smoke pencil keep carry
```

A trial seed of the 6f541ef tree passed all of it on Chromium but the tests §5.2 names (the
audit's trial, in this cycle's scratch files).

## 6. Names that keep the old name

People's boards depend on these; the new repository keeps them verbatim, and its first unit is a
test that pins them (`RENAME-PLAN.md` §2 has the reasons):

- the IndexedDB databases `mm-boards`, `mm-assets`, `mm-find`, `mm-semantic`, every `mm-*`
  storage key, the service worker's `mm-app-` and `mm-shell-` caches;
- the log format id `metamedium-log`, the `.metamedium/` folder format, the `metamedium-version`
  meta fallback; the `mm` contract for programs; the `MM_*` environment variables;
- the carry protocol (`mm-carry*`, `?carry` / `?carryTo`, `boards.json`'s `dyna-boards`, the app
  at `/app/` on dyna.ink);
- the relay's Worker name `dyna-relay`, its Durable Object classes `Room` and `Limits` and their
  migration tags `v1` and `v2`, and its secret: change any of them and every room, and every key
  ever handed out, is lost.

## 7. John's Cloudflare steps

`cloudflare/README.md` has them in full; in order:

1. A Cloudflare account; add `dyna.ink` as a zone and switch the nameservers.
2. Open Workers & Pages once (it claims a `workers.dev` subdomain), and **Workers AI** once (it
   must be enabled on the account for the decider and the writer and reader).
3. An API token: Account · Cloudflare Pages · Edit, Account · Workers Scripts · Edit, and
   Account · Workers AI · Read (whether the binding needs the last is unverified).
4. A relay secret — 32 or more random characters, kept in a password manager; every room key
   is made from it.
5. In the **new** repository only: the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
   (and `MM_RELAY_SECRET`, or put the secret on the Worker in the dashboard).
6. Run *Deploy to Cloudflare*; bind `dyna.ink` to the Pages project and `relay.dyna.ink` to the
   Worker; `www` as a redirect to the apex, never a second Pages domain (each origin has its own
   storage, so a second one splits a person's boards).
7. The plan: the free plan's Durable Object and Workers AI allowances are unchecked for a
   public launch; Workers Paid is likely needed for real use.

## 8. The cutover, in order

1. The new repository's CI is green; its deploy skips (no secrets yet).
2. The old repository holds no Cloudflare secrets (it holds none today — keep it so).
3. The secrets go into the new repository (§7.5); *Deploy to Cloudflare* runs; check
   `dyna-ink.pages.dev` and the relay, then bind the domains.
4. In the **old** repository, one commit: N4 — `node scripts/n4.mjs --apply` (prepared this cycle;
   it lists and makes every change of address, and flips `NEW_HOME_NOTICE`) — and a README that
   points to the new repository. Its Pages stay on.
5. Carry boards by hand, on an iPad and a desktop, from the old address to dyna.ink.

## 9. The first units in the new repository

In order: the carry contract as a fixture of the old repository's built page (after the split the
sender is frozen old code, and today's `e2e/carry.mjs` plays both sides with one build); the
kept-names test (§6); a real System One reply recorded per question shape
(`scripts/record-systemone.mjs`) and the decider's reader narrowed to it; the decide bench that sets
each job's floor (the 0.99 is borrowed, not measured); A10 and A11 walked by hand on an iPad; then the
layout — `packages/core`, `packages/relay-protocol`, `apps/web`, `apps/hands`, `apps/relay`,
`apps/shard`, `site/` — in three or four units each green on the whole gate (about 400 references
to `Demos/` move), the site built from an allowlist with a map of the published addresses, and the
film's binaries off git before the next render.
