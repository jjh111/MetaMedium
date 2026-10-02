// Cut a release of dyna.ink, here. It never pushes.
//
//   node scripts/release.mjs <version>                 # cut it: one commit, one annotated tag
//   node scripts/release.mjs <version> --dry-run       # print everything, change nothing
//   node scripts/release.mjs <version> --since <ref>   # the changelog's section starts at <ref>
//
// Run it in the repository to release, on the commit to release (V1-PLAN.md
// §7 and §9 R7). In order, it:
//
//   1. refuses a tree that is not clean — untracked files included — and a
//      version that is not greater than the last: VERSION's, or any release
//      tag's (`v` and a version: `v0.2.0`, `v1.0.0-rc.1` — the day-one tag
//      `v1.0-day1` is not one);
//   2. writes CHANGELOG.md a section from the subjects of the commits since
//      the previous release tag (merges left out), grouped by the unit each
//      names — `R7: …`, `R4d red: …`, `Docs for R4b: …`, `… (R4c)`;
//   3. bumps VERSION and runs scripts/build-app.mjs, which stamps it into the
//      page and both service workers — their caches are named for it, so a
//      release is a new worker with a new cache — and makes app/ again;
//   4. builds the standalone single file (Demos/build-standalone.mjs) into
//      dist/release/dynaink-<version>.html, the file a GitHub release
//      carries, and refuses if anything key-shaped is in it or in the section;
//   5. commits ("Release <version>") and makes an annotated tag, v<version>,
//      whose message is "dyna.ink <version>" and the section — and says what
//      to push, and the GitHub release to make, titled "dyna.ink <version>".
//      It pushes nothing: publishing is the director's, on John's instruction.
//
// The name is dyna.ink's from 0.2.0 (RENAME-PLAN N3b). 0.1.0, the last
// MetaMedium, was tagged "MetaMedium 0.1.0" and shipped metamedium-0.1.0.html;
// its changelog section and its tag stay as they were cut.
//
// --dry-run does all of that in memory and prints it: the checks, the
// section, the files, the standalone file's size, the commands. It exits 1 if
// the real run would refuse, and writes nothing either way.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { VERSION_PATTERN, readVersion, stampPage, make, write } from './build-app.mjs';
import { standalone } from '../Demos/build-standalone.mjs';

/** The product's name, as a release says it (RENAME-PLAN §1): the release's title and its tag's first line. */
const NAME = 'dyna.ink';

// ===== versions ======================================================================

/** A version's parts, or null: MAJOR.MINOR.PATCH with an optional pre-release (`scripts/build-app.mjs`'s pattern). */
export function parseVersion(s) {
  const m = VERSION_PATTERN.exec(String(s));
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ? m[4].split('.') : [] };
}

/** Semver's precedence: < 0, 0 or > 0. A pre-release comes before its release; numbers compare as numbers. */
export function compareVersions(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) throw new Error(`not a version: ${!x ? a : b}`);
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  const num = (s) => /^\d+$/.test(s);
  for (let i = 0; i < Math.min(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i], q = y.pre[i];
    if (p === q) continue;
    if (num(p) && num(q)) return Number(p) < Number(q) ? -1 : 1;
    if (num(p) !== num(q)) return num(p) ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return x.pre.length === y.pre.length ? 0 : x.pre.length < y.pre.length ? -1 : 1;
}

/** The next version by `part` — major, minor or patch — its pre-release dropped. */
export function bumpVersion(v, part) {
  const x = parseVersion(v);
  if (!x) throw new Error(`not a version: ${v}`);
  if (part === 'major') return `${x.major + 1}.0.0`;
  if (part === 'minor') return `${x.major}.${x.minor + 1}.0`;
  return `${x.major}.${x.minor}.${x.patch + 1}`;
}

/** The version a tag releases, or null: a release tag is `v` and a version. */
export function releaseTagVersion(tag) {
  const m = /^v(.+)$/.exec(String(tag));
  return m && parseVersion(m[1]) ? m[1] : null;
}

// ===== the changelog ===================================================================

// A unit as the plans name them: R7, R4d, L2i, B1, U1a — or a review's package: QA-1, STATE-1, WP-11.
const UNIT = /\b([A-Z]{1,3}\d{1,2}[a-z]?|[A-Z]{2,6}-\d{1,2})\b(?![ -](?:plan|PLAN)\b)/g;
// Names shaped like a unit that are not one.
const NOT_UNITS = new Set(['UTF-8', 'UTF-16', 'SHA-1', 'MD5', 'MP3', 'MP4', 'ES5', 'ES6', 'CSS3']);

function firstUnit(text) {
  const re = new RegExp(UNIT.source, 'g');
  let m;
  while ((m = re.exec(text))) if (!NOT_UNITS.has(m[1])) return m[1];
  return null;
}

/**
 * The unit a commit belongs to: the first unit named before its subject's
 * colon, else the first named anywhere in it — else null. "V1 plan" and
 * "V1-PLAN" name the plan, not the unit V1.
 */
export function unitOf(subject) {
  const s = String(subject || '');
  const colon = s.indexOf(': ');
  return (colon > 0 && firstUnit(s.slice(0, colon))) || firstUnit(s);
}

/** A unit's name as parts, so R4d comes before R7 and R7 before R10. */
function unitKey(u) {
  const m = /^([A-Z]+-?)(\d+)([a-z]?)$/.exec(u);
  return m ? [m[1], Number(m[2]), m[3]] : [u, 0, ''];
}
function byUnit(a, b) {
  const x = unitKey(a), y = unitKey(b);
  if (x[0] !== y[0]) return x[0] < y[0] ? -1 : 1;
  if (x[1] !== y[1]) return x[1] - y[1];
  return x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0;
}

/** Commits grouped by unit, units in their names' own order, what names none last (unit null); each group oldest first as given. */
export function groupByUnit(commits) {
  const groups = new Map();
  for (const c of commits) {
    const u = unitOf(c.subject);
    if (!groups.has(u)) groups.set(u, []);
    groups.get(u).push(c);
  }
  const named = [...groups.keys()].filter((u) => u !== null).sort(byUnit);
  const out = named.map((unit) => ({ unit, commits: groups.get(unit) }));
  if (groups.has(null)) out.push({ unit: null, commits: groups.get(null) });
  return out;
}

/**
 * A release's section of CHANGELOG.md. `base`: `{ tag }` for the previous
 * release, `{ ref }` for where --since said, or null for the beginning.
 */
export function changelogSection({ version, date, base, commits }) {
  const from = base ? `Since ${base.tag || base.ref}` : 'From the beginning';
  const n = commits.length;
  const lines = [`## ${version} — ${date}`, ''];
  if (!n) {
    lines.push(`${from}: no commits.`, '');
    return lines.join('\n');
  }
  lines.push(`${from}: ${n} commit${n === 1 ? '' : 's'}, merges left out, grouped by the unit each names (\`V1-PLAN.md\` §9).`, '');
  for (const g of groupByUnit(commits)) {
    lines.push(`### ${g.unit || 'Other'}`, '');
    for (const c of g.commits) lines.push(`- ${c.subject} (\`${c.hash}\`)`);
    lines.push('');
  }
  return lines.join('\n');
}

/** CHANGELOG.md with `section` under its header and above the release before it; the "no release yet" line goes. */
export function insertSection(text, section) {
  const body = section.replace(/\s*$/, '\n');
  let t = String(text || '');
  if (!t.trim()) return '# Changelog\n\n' + body;
  t = t.replace(/^_No release has been cut yet\._\n?/m, '').replace(/\n{3,}/g, '\n\n');
  const at = t.search(/^## /m);
  if (at >= 0) return t.slice(0, at) + body + '\n' + t.slice(at);
  return t.replace(/\s*$/, '\n\n') + body;
}

// ===== keys ============================================================================

const KEY_SHAPES = [
  ['an Anthropic key', /sk-ant-[A-Za-z0-9_-]{20,}/g],
  ['an OpenRouter key', /sk-or-v1-[A-Za-z0-9]{20,}/g],
  ['an OpenAI key', /\bsk-(?!ant-|or-)(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ['a GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g],
  ['a GitHub token', /\bgithub_pat_[A-Za-z0-9_]{30,}/g],
  ['an AWS key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['a Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ['a Google key', /\bAIza[0-9A-Za-z_-]{35}/g],
];

/** Where something key-shaped stands in `text`: its kind and line — never the thing itself. */
export function keyShapesIn(text) {
  const s = String(text || '');
  const found = [];
  for (const [kind, re] of KEY_SHAPES) {
    for (const m of s.matchAll(new RegExp(re.source, 'g'))) found.push({ kind, line: s.slice(0, m.index).split('\n').length });
  }
  return found;
}

// ===== the repository ==================================================================

function git(repo, args, { allowFail = false } = {}) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  if (r.status !== 0 && !allowFail) throw new Error(`git ${args.join(' ')} failed: ${(r.stderr || '').trim()}`);
  return allowFail ? r : r.stdout.replace(/\n$/, '');
}

/** VERSION, the release tags, and the last release — whichever of them is greatest. */
export function releaseState(repo) {
  const version = readVersion(repo);
  const tags = git(repo, ['tag', '-l']).split('\n').filter(Boolean)
    .map((tag) => ({ tag, version: releaseTagVersion(tag) })).filter((t) => t.version);
  let last = { version, from: 'VERSION' };
  for (const t of tags) if (compareVersions(t.version, last.version) > 0) last = { version: t.version, from: `tag ${t.tag}` };
  return { version, tags, last };
}

/** The previous release: the greatest release tag HEAD descends from, or null. */
function previousRelease(repo, tags) {
  let best = null;
  for (const t of tags) {
    if (git(repo, ['merge-base', '--is-ancestor', t.tag, 'HEAD'], { allowFail: true }).status !== 0) continue;
    if (!best || compareVersions(t.version, best.version) > 0) best = t;
  }
  return best ? { tag: best.tag, hash: git(repo, ['rev-parse', `${best.tag}^{commit}`]) } : null;
}

function commitsSince(repo, base) {
  const out = git(repo, ['log', '--no-merges', '--reverse', '--format=%h%x09%s', base ? `${base.hash}..HEAD` : 'HEAD']);
  return out.split('\n').filter(Boolean).map((l) => { const i = l.indexOf('\t'); return { hash: l.slice(0, i), subject: l.slice(i + 1) }; });
}

const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const kb = (s) => `${Math.round(Buffer.byteLength(s) / 1024)} KB`;

/** Where Pages serves the app, when the remote is on GitHub. */
function pagesApp(remote) {
  const m = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote || '');
  return m ? `https://${m[1].toLowerCase()}.github.io/${m[2]}/app/` : null;
}

// ===== the release =======================================================================

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node scripts/release.mjs <version> [--dry-run] [--since <ref>]');
  process.exit(2);
}

function main(argv) {
  const args = [...argv];
  const take = (flag) => { const i = args.indexOf(flag); if (i < 0) return false; args.splice(i, 1); return true; };
  const option = (flag) => {
    const i = args.findIndex((a) => a === flag || a.startsWith(flag + '='));
    if (i < 0) return null;
    const v = args[i].includes('=') ? args[i].slice(flag.length + 1) : args[i + 1];
    args.splice(i, args[i].includes('=') ? 1 : 2);
    if (!v) usage(`${flag} needs a ref`);
    return v;
  };
  const dryRun = take('--dry-run');
  const since = option('--since');
  const unknown = args.find((a) => a.startsWith('-'));
  if (unknown) usage(`unknown option ${unknown}`);
  if (args.length !== 1) usage(args.length ? 'one version at a time' : 'which version?');
  const version = args[0];
  if (!parseVersion(version)) usage(`"${version}" is not a version: MAJOR.MINOR.PATCH with an optional pre-release (0.2.0, 1.0.0-rc.1), no leading v`);

  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd(), encoding: 'utf8' });
  if (top.status !== 0) { console.error('not in a git repository — run it in the repository to release'); process.exit(1); }
  const repo = top.stdout.trim();

  // ---- 1. What the real run would refuse ---------------------------------------------------
  const refusals = [];
  const status = git(repo, ['status', '--porcelain']);
  if (status) {
    const lines = status.split('\n');
    refusals.push(`the tree is not clean — commit or stash first:\n${lines.slice(0, 12).map((l) => '    ' + l).join('\n')}${lines.length > 12 ? `\n    … and ${lines.length - 12} more` : ''}`);
  }
  let state = null;
  try { state = releaseState(repo); } catch (err) { refusals.push(String(err.message || err)); }
  if (state && compareVersions(version, state.last.version) <= 0) {
    refusals.push(`${version} is not greater than the last release, ${state.last.version} (${state.last.from})`);
  }
  let base = null;
  if (since) {
    const r = git(repo, ['rev-parse', '--verify', '--quiet', `${since}^{commit}`], { allowFail: true });
    if (r.status !== 0) refusals.push(`--since ${since} names no commit`);
    else base = { ref: since, hash: r.stdout.trim() };
  } else if (state) {
    base = previousRelease(repo, state.tags);
  }
  const commits = refusals.some((r) => r.startsWith('--since')) ? [] : commitsSince(repo, base);
  const section = changelogSection({ version, date: today(), base, commits });

  let files = [], html = '', changelog = '';
  try {
    files = make(repo, { version });
    changelog = insertSection(existsSync(join(repo, 'CHANGELOG.md')) ? readFileSync(join(repo, 'CHANGELOG.md'), 'utf8') : '', section);
    html = stampPage(standalone(join(repo, 'Demos')), version);
  } catch (err) {
    refusals.push(`the release cannot be made: ${err.message || err}`);
  }
  const out = `dist/release/dynaink-${version}.html`;
  for (const [where, text] of [[out, html], ['the changelog section', section]]) {
    for (const f of keyShapesIn(text)) refusals.push(`something shaped like ${f.kind} is in ${where}, line ${f.line} — a release never ships a key; find it and take it out`);
  }

  const remote = git(repo, ['remote', 'get-url', 'origin'], { allowFail: true });
  const pushTo = remote.status === 0 ? remote.stdout.trim() : '<remote>';
  const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = git(repo, ['rev-parse', '--short', 'HEAD']);
  const app = pagesApp(pushTo);
  const writes = ['VERSION', 'CHANGELOG.md', ...files.filter((f) => f.changed && f.path !== 'VERSION').map((f) => f.path)];
  const publish = [
    `  git push ${pushTo} ${branch === 'HEAD' ? 'HEAD:master' : branch}`,
    `  git push ${pushTo} v${version}`,
    `  gh release create v${version} ${out} --title "${NAME} ${version}" --notes-from-tag`,
    ...(branch !== 'master' ? [`  (this is ${branch === 'HEAD' ? 'a detached HEAD' : branch}, not master — Pages publishes master)`] : []),
    ...(app ? [`Pages then serves it at ${app}, and its help pane says ${version}.`] : []),
  ].join('\n');

  if (dryRun) {
    console.log(`${NAME} ${version} — a dry run: nothing is written, committed, tagged or pushed\n`);
    console.log(`  tree      ${status ? 'NOT clean' : 'clean'} · ${branch} at ${head}`);
    if (state) console.log(`  version   ${state.version} → ${version} (the last release: ${state.last.version}, ${state.last.from})`);
    console.log(`  section   ${base ? `since ${base.tag || base.ref}` : 'from the beginning'}: ${commits.length} commit${commits.length === 1 ? '' : 's'}, merges left out`);
    console.log(`  writes    ${writes.join(' · ')}`);
    console.log(`  caches    mm-app-${version} at /app/, mm-shell-${version} at the old address`);
    if (html) console.log(`  builds    ${out} — ${kb(html)}${keyShapesIn(html).length ? '' : ', nothing key-shaped in it'} (not committed)`);
    console.log(`  commits   "Release ${version}", then tags v${version} (annotated, the section as its message)\n`);
    console.log('CHANGELOG.md gains, above the release before it:\n');
    console.log(section);
    console.log(`To publish, after the real run (the director, on John's instruction):\n${publish}`);
    if (refusals.length) {
      console.error(`\nthe real run would refuse:\n${refusals.map((r) => '  - ' + r).join('\n')}`);
      process.exit(1);
    }
    return;
  }

  if (refusals.length) {
    console.error(`release ${version} refused:\n${refusals.map((r) => '  - ' + r).join('\n')}`);
    process.exit(1);
  }

  // ---- 2–5. Write, build, commit, tag -------------------------------------------------------
  const tracked = new Set(git(repo, ['ls-files', '--', ...writes]).split('\n').filter(Boolean));
  const undo = () => {
    git(repo, ['reset', '-q', '--', ...writes], { allowFail: true });
    const back = writes.filter((p) => tracked.has(p));
    if (back.length) git(repo, ['checkout', '--', ...back], { allowFail: true });
    for (const p of writes) if (!tracked.has(p)) rmSync(join(repo, p), { force: true });
    rmSync(join(repo, out), { force: true });
  };
  try {
    writeFileSync(join(repo, 'VERSION'), version + '\n');
    write(repo, files);
    writeFileSync(join(repo, 'CHANGELOG.md'), changelog);
    const built = stampPage(standalone(join(repo, 'Demos')), version);
    if (keyShapesIn(built).length) throw new Error(`something key-shaped is in ${out}`);
    mkdirSync(dirname(join(repo, out)), { recursive: true });
    writeFileSync(join(repo, out), built);
    git(repo, ['add', '--', ...writes]);
    git(repo, ['commit', '-q', '-m', `Release ${version}`, '-m',
      `VERSION, CHANGELOG.md's section for ${version}, and the version stamped into the page and both service\n` +
      `workers' caches (scripts/release.mjs). The standalone file, ${out}, is built beside it and not committed.`]);
  } catch (err) {
    undo();
    console.error(`release ${version} refused, and the tree put back as it was: ${err.message || err}`);
    process.exit(1);
  }
  const commit = git(repo, ['rev-parse', '--short', 'HEAD']);
  const note = mkdtempSync(join(tmpdir(), 'mm-release-tag-'));
  try {
    writeFileSync(join(note, 'message'), `${NAME} ${version}\n\n${section.replace(/^## [^\n]*\n\n/, '')}`);
    const t = git(repo, ['tag', '-a', `v${version}`, '--cleanup=whitespace', '-F', join(note, 'message')], { allowFail: true });
    if (t.status !== 0) {
      console.error(`committed ${commit} "Release ${version}", but the tag was refused: ${(t.stderr || '').trim()}\n` +
        `tag it by hand: git tag -a v${version} -m "${NAME} ${version}"`);
      process.exit(1);
    }
  } finally {
    rmSync(note, { recursive: true, force: true });
  }
  console.log(`Released ${NAME} ${version} here — nothing has been pushed.\n`);
  console.log(`  commit  ${commit} Release ${version}`);
  console.log(`  tag     v${version} (annotated; its message is the changelog's section)`);
  console.log(`  file    ${out} (${kb(html)}), not committed\n`);
  console.log(`To publish (the director, on John's instruction):\n${publish}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2));
