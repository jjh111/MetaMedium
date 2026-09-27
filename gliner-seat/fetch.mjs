// fetch.mjs — put the model back.
//
// Nothing this experiment runs on is committed: the weights are hundreds of
// megabytes and they are someone else's (Apache-2.0, Fastino; the export is
// onnx-community's). This script fetches exactly what the numbers in
// results/ were measured on — PINNED to a commit of the export, and every
// large file checked against the sha256 the Hub's LFS pointer records — into
// models/, which .gitignore keeps out of git.
//
//   node fetch.mjs            the fp16 graph (614 MB) + tokenizer + the Python reference
//   node fetch.mjs --fp32     the fp32 graph as well (1.23 GB more)
//   node fetch.mjs --list     say what would be fetched, fetch nothing
//
// No account, no token: the repository is public and ungated. If it ever
// becomes gated, this stops and says so rather than asking for a credential.

import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, statSync, readFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const HERE = dirname(fileURLToPath(import.meta.url));

export const REPO = 'onnx-community/gliner2-multi-v1-agent-ONNX';
/** The export's commit on 25 Sep 2026 — what every number in results/ was measured on. */
export const REVISION = '2d0d8e4dbd6009a1d78e9b5d29ae91cd0e39a146';
export const MODEL_DIR = join(HERE, 'models', REPO.replace('/', '__'));

const SMALL = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'conversion/reference.json',
];
const FP16 = ['onnx/model_fp16.onnx', 'onnx/model_fp16.onnx_data'];
const FP32 = ['onnx/model.onnx', 'onnx/model.onnx_data'];

const args = new Set(process.argv.slice(2));

async function tree() {
  // The tree API gives each LFS file's sha256 — the check a download is held to.
  const out = new Map();
  for (const dir of ['', 'onnx', 'conversion']) {
    const url = `https://huggingface.co/api/models/${REPO}/tree/${REVISION}${dir ? '/' + dir : ''}`;
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) {
      throw new Error(`${REPO} now asks for an account (${res.status}). This experiment does not sign in; stopping.`);
    }
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    for (const entry of await res.json()) {
      if (entry.type === 'file') out.set(entry.path, { size: entry.size, sha256: entry.lfs?.oid ?? null });
    }
  }
  return out;
}

function sha256Of(path) {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

async function download(path, meta) {
  const dest = join(MODEL_DIR, path);
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest) && statSync(dest).size === meta.size) {
    if (!meta.sha256 || sha256Of(dest) === meta.sha256) {
      console.log(`  have  ${path} (${(meta.size / 1e6).toFixed(1)} MB)`);
      return;
    }
  }
  const url = `https://huggingface.co/${REPO}/resolve/${REVISION}/${path}`;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url} → ${res.status}`);
  const hash = createHash('sha256');
  let got = 0;
  let shown = 0;
  const started = Date.now();
  const tmp = dest + '.part';
  const counted = Readable.fromWeb(res.body).map((chunk) => {
    hash.update(chunk);
    got += chunk.length;
    if (got - shown > 50e6) {
      shown = got;
      process.stdout.write(`\r  fetch ${path} ${(got / 1e6).toFixed(0)} / ${(meta.size / 1e6).toFixed(0)} MB`);
    }
    return chunk;
  });
  await pipeline(counted, createWriteStream(tmp));
  const digest = hash.digest('hex');
  if (got !== meta.size) throw new Error(`${path}: got ${got} bytes, the Hub says ${meta.size}`);
  if (meta.sha256 && digest !== meta.sha256) throw new Error(`${path}: sha256 ${digest} ≠ ${meta.sha256}`);
  renameSync(tmp, dest);
  const s = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\r  got   ${path} (${(got / 1e6).toFixed(1)} MB in ${s} s${meta.sha256 ? ', sha256 ok' : ''})`);
}

async function main() {
  const want = [...SMALL, ...FP16, ...(args.has('--fp32') ? FP32 : [])];
  const files = await tree();
  let total = 0;
  for (const p of want) {
    const meta = files.get(p);
    if (!meta) throw new Error(`${p} is not in ${REPO}@${REVISION.slice(0, 7)}`);
    total += meta.size;
  }
  console.log(`${REPO}@${REVISION.slice(0, 7)} → ${MODEL_DIR}`);
  console.log(`${want.length} files, ${(total / 1e6).toFixed(0)} MB`);
  if (args.has('--list')) {
    for (const p of want) console.log(`  ${p} ${(files.get(p).size / 1e6).toFixed(1)} MB`);
    return;
  }
  for (const p of want) await download(p, files.get(p));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(String(e?.message ?? e));
    process.exit(1);
  });
}
