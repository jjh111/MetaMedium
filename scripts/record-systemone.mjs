#!/usr/bin/env node
// Record one real reply per question shape from Cloudflare's System One models — a choice, a score and a noul from
// Clef-flash, a choice with a picture from Clef-omni, and a text and a list field from Clairic — into
// core/src/llm/fixtures/systemone-replies.json, beside the hand-written spellings, so the decider's reader
// (core/src/llm/decide-systemone.ts) can be narrowed to the spelling that really comes back. John runs it once; it is
// not in CI and never runs in the gate.
//
//   node scripts/record-systemone.mjs --relay https://relay.dyna.ink        # through dyna.ink's relay
//   node scripts/record-systemone.mjs --rest                               # Cloudflare's own API, with your token
//   node scripts/record-systemone.mjs --rest --dry-run                     # print what would be sent, send nothing
//
// Through the relay, a room's key is used when one is in the environment (MM_RELAY_KEY, with MM_ROOM naming its room —
// the key the MCP hand uses); without one the request says it comes from dyna.ink's page, as the app's would.
// Through the REST API the account and the token are read from the environment ONLY — CLOUDFLARE_ACCOUNT_ID and
// CLOUDFLARE_API_TOKEN (a token with Workers AI read access) — never from an argument, and the token is never
// printed, written or repeated in a sentence. Each call is billed to that account (a handful of small calls).
//
// The requests are built by core's own wire (the committed Node bundle's `buildSystemOne`), so what is recorded is
// what the page sends. Each reply is written as it came, with when and through what, and core's reader is asked to
// read it: the script says, per shape, whether it read and what it noted.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIXTURES = path.join(root, 'core/src/llm/fixtures/systemone-replies.json');
const MM = await import(pathToFileURL(path.join(root, 'Demos/dynaink-core.node.mjs')).href);
const { DECIDE_MODELS, EXTRACT_MODELS } = await import(pathToFileURL(path.join(root, 'Demos/decide-protocol.mjs')).href);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dry = flag('--dry-run');
const relay = value('--relay');
const rest = flag('--rest');
if (!!relay === rest) {
  console.error('say how to ask: --relay <address of a relay> or --rest (Cloudflare’s API, the account and token from the environment)');
  process.exit(2);
}
if (args.some((a) => /^(--token|--key)/.test(a))) {
  console.error('a token or a key is read from the environment only (CLOUDFLARE_API_TOKEN, MM_RELAY_KEY) — never from an argument, where a shell history keeps it');
  process.exit(2);
}

/** A picture small enough to send: a 1×1 white PNG. */
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

const molecule = MM.choice('which', 'which of these is the group of marks?', [
  { id: 'molecule', text: 'molecule — this board’s definition, the first of two named here, drawn as five marks (three circles, two lines)' },
  { id: 'compound', text: 'compound — this board’s definition, the second of two named here; written beside it: “salt”' },
]);
const finish = MM.score('finish', 'how finished does this drawing look?', ['a rough sketch', 'a tidy drawing', 'a finished diagram']);
const isBox = MM.noul('box', 'the marks asked about include a box');
const STATE = { text: 'The marks asked about: five marks — three circles, two lines.\nWritten on them: “water”.\nWritten beside them: nothing.' };

/** The shapes to record: a name, the model, and the body core's wire builds for it. */
const SHAPES = [
  { name: 'recorded-choice', model: 'clef-flash', questions: [molecule] },
  { name: 'recorded-score', model: 'clef-flash', questions: [finish] },
  { name: 'recorded-noul', model: 'clef-flash', questions: [isBox] },
  { name: 'recorded-batch', model: 'clef-flash', questions: [molecule, finish, isBox] },
  { name: 'recorded-omni-image', model: 'clef-omni', questions: [molecule], images: [{ mime: 'image/png', dataUrl: PIXEL }] },
].map((s) => ({ ...s, req: MM.buildSystemOne(s.questions, { ...STATE, ...(s.images ? { images: s.images } : {}) }, { model: s.model, sees: !!s.images }) }));
const CLAIRIC = {
  name: 'recorded-clairic',
  body: { model: 'clairic', state: 'Waist 28 in, hip 38 in. Add ½ in seam allowance. Bodice front: cut 2.', fields: { measurement_names: { type: 'list', instructions: 'the names of the measurements written', items: { type: 'text' } }, piece: { type: 'text', instructions: 'the name of the pattern piece' } } },
};

/** One call: the reply body as it came, or why there is none. Never a token in what is said. */
async function ask(route, body) {
  if (relay) {
    const headers = { 'content-type': 'application/json' };
    if (process.env.MM_RELAY_KEY && process.env.MM_ROOM) { headers.authorization = 'Bearer ' + process.env.MM_RELAY_KEY; headers['x-dyna-room'] = process.env.MM_ROOM; }
    else headers.origin = 'https://dyna.ink';
    const res = await fetch(relay.replace(/\/+$/, '') + '/' + route, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: safeJson(text), via: 'relay ' + new URL(relay).host };
  }
  const account = process.env.CLOUDFLARE_ACCOUNT_ID, token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be in the environment');
  const models = route === 'extract' ? EXTRACT_MODELS : DECIDE_MODELS;
  const { model, ...input } = body;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${models[model].id}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(input),
  });
  const text = (await res.text()).split(token).join('(the token)');
  const json = safeJson(text);
  // The REST API wraps the model's answer: { result, success, errors }. The reader reads what the relay returns — the model's own answer.
  return { status: res.status, body: json && typeof json === 'object' && 'result' in json ? json.result : json, raw: json, via: 'Cloudflare REST API' };
}
function safeJson(text) { try { return JSON.parse(text); } catch { return { notJson: text.slice(0, 400) }; } }

const fixtures = JSON.parse(readFileSync(FIXTURES, 'utf8'));
let wrote = 0;
for (const s of SHAPES) {
  if (dry) { console.log(`${s.name} · ${s.model}\n${JSON.stringify(s.req.body, null, 1)}\n`); continue; }
  let got;
  try { got = await ask('decide', s.req.body); } catch (e) { console.log(`${s.name}: not asked — ${e.message}`); continue; }
  const read = got.status === 200 ? MM.readSystemOne(got.body, s.req, s.questions) : null;
  fixtures[s.name] = { _recorded: { at: new Date().toISOString(), via: got.via, model: s.model, status: got.status, read: read ? (read.ok ? { answers: read.answers.length, of: s.questions.length, notes: read.notes } : { error: read.error }) : null }, status: got.status, body: got.body, ...(got.raw && got.raw !== got.body ? { envelope: { success: got.raw.success, errors: got.raw.errors } } : {}) };
  wrote++;
  console.log(`${s.name}: HTTP ${got.status} — ` + (read ? (read.ok ? `read ${read.answers.length} of ${s.questions.length}` + (read.notes.length ? ' · ' + read.notes.join(' · ') : '') : 'not read: ' + read.error) : JSON.stringify(got.body).slice(0, 200)));
}
if (dry) console.log(`${CLAIRIC.name} · clairic\n${JSON.stringify(CLAIRIC.body, null, 1)}`);
else {
  try {
    const got = await ask('extract', CLAIRIC.body);
    fixtures[CLAIRIC.name] = { _recorded: { at: new Date().toISOString(), via: got.via, model: 'clairic', status: got.status }, status: got.status, body: got.body };
    wrote++;
    console.log(`${CLAIRIC.name}: HTTP ${got.status} — ${JSON.stringify(got.body).slice(0, 200)}`);
  } catch (e) { console.log(`${CLAIRIC.name}: not asked — ${e.message}`); }
}
if (wrote) {
  writeFileSync(FIXTURES, JSON.stringify(fixtures, null, 2) + '\n');
  console.log(`\nwrote ${wrote} recorded ${wrote === 1 ? 'reply' : 'replies'} into ${path.relative(root, FIXTURES)} — the reader's tolerance can now be narrowed to the spelling that came back (decide-systemone.ts).`);
}
