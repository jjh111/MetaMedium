// node.mjs — the Node measurements: loads, memory, latency, precision and recall.
//
//   node bench/node.mjs                      fp16 graph, CPU provider
//   node bench/node.mjs --ep coreml          the CoreML provider (falls back to CPU per node)
//   node bench/node.mjs --threads 4          a process that leaves the rest of the machine alone
//   node bench/node.mjs --dtype fp32         the fp32 graph, when fetched
//   options: --repeats 5 --cold 3 --warm 3 --skip-load
//
// Loads run in fresh child processes (bench/load.mjs): "disk-cold" reads a
// copy of the model written with the OS cache off (bench/nocache-copy.py), so
// the weights come off the SSD as after a reboot; "cache-warm" is a fresh
// process with the files already in the OS cache, as on a restart. The rest runs
// in this process. Everything lands in results/node-<dtype>-<ep>[-t<n>].json.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { loadNodeRunner, GRAPHS } from '../node-runner.mjs';
import { MODEL_DIR, REPO, REVISION } from '../fetch.mjs';
import { runHarness, summarise, quantile } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const dtype = flag('--dtype', 'fp16');
const ep = flag('--ep', 'cpu');
const threads = flag('--threads', undefined) ? Number(flag('--threads')) : undefined;
const repeats = Number(flag('--repeats', 5));
const coldRuns = Number(flag('--cold', 3));
const warmRuns = Number(flag('--warm', 3));
const skipLoad = argv.includes('--skip-load');
const tag = `node-${dtype}-${ep}${threads ? `-t${threads}` : ''}`;

const mb = (bytes) => Math.round(bytes / 1048576);
const say = (line) => console.log(line);

function loadOnce(dir) {
  const args = [join(HERE, 'load.mjs'), '--dtype', dtype, '--ep', ep];
  if (dir) args.push('--dir', dir);
  if (threads) args.push('--threads', String(threads));
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 1 << 20 });
  if (r.status !== 0) throw new Error(`load.mjs failed: ${r.stderr}`);
  const line = r.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  return JSON.parse(line);
}

function nocacheCopy(dest) {
  const graph = join(MODEL_DIR, GRAPHS[dtype]);
  const onnx = [graph, graph.replace(/\.onnx$/, '.onnx_data')];
  const tok = ['tokenizer.json', 'tokenizer_config.json'].map((f) => join(MODEL_DIR, f));
  for (const [to, files] of [[join(dest, 'onnx'), onnx], [dest, tok]]) {
    const r = spawnSync('python3', [join(HERE, 'nocache-copy.py'), to, ...files], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`nocache-copy failed: ${r.stderr}`);
  }
}

function timedRead(path) {
  const fd = openSync(path, 'r');
  const buf = Buffer.allocUnsafe(8 << 20);
  const t0 = performance.now();
  let n = 0;
  let got;
  while ((got = readSync(fd, buf, 0, buf.length, null)) > 0) n += got;
  const t = performance.now() - t0;
  closeSync(fd);
  return { ms: t, mbPerS: Math.round(n / 1048576 / (t / 1000)) };
}

const summaryOf = (runs, key) => {
  const v = runs.map((r) => r[key]);
  return { median: quantile(v, 0.5), min: Math.min(...v), max: Math.max(...v) };
};

const result = {
  measured: new Date().toISOString(),
  machine: {
    cpu: os.cpus()[0]?.model,
    cores: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / 1073741824),
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    node: process.version,
  },
  model: { export: `${REPO}@${REVISION.slice(0, 7)}`, graph: GRAPHS[dtype], dtype, sizeMB: mb(statSync(join(MODEL_DIR, GRAPHS[dtype].replace(/\.onnx$/, '.onnx_data'))).size) },
  runtime: { package: 'onnxruntime-node', ep, threads: threads ?? 'default' },
};

if (!skipLoad) {
  const scratch = join(ROOT, 'models', '.cold');
  // Does the trick hold? A first read of a no-cache copy should run at disk
  // speed and a second read at memory speed.
  rmSync(scratch, { recursive: true, force: true });
  nocacheCopy(join(scratch, 'probe'));
  const data = join(scratch, 'probe', GRAPHS[dtype].replace(/\.onnx$/, '.onnx_data'));
  const first = timedRead(data);
  const second = timedRead(data);
  result.cacheProbe = { firstRead: first, secondRead: second };
  say(`cache probe: first read ${first.mbPerS} MB/s, second ${second.mbPerS} MB/s`);
  rmSync(scratch, { recursive: true, force: true });

  const cold = [];
  for (let k = 0; k < coldRuns; k++) {
    const dir = join(scratch, `run${k}`);
    nocacheCopy(dir);
    cold.push(loadOnce(dir));
    rmSync(dir, { recursive: true, force: true });
    say(`disk-cold load ${k + 1}: ${JSON.stringify(cold.at(-1))}`);
  }
  rmSync(scratch, { recursive: true, force: true });
  loadOnce(); // make sure the real files are in the cache
  const warm = [];
  for (let k = 0; k < warmRuns; k++) {
    warm.push(loadOnce());
    say(`cache-warm load ${k + 1}: ${JSON.stringify(warm.at(-1))}`);
  }
  result.loads = {
    diskCold: { runs: cold, toFirstAnswerMs: summaryOf(cold, 'toFirstAnswerMs'), sessionMs: summaryOf(cold, 'sessionMs'), maxRssMB: summaryOf(cold, 'maxRssMB') },
    cacheWarm: { runs: warm, toFirstAnswerMs: summaryOf(warm, 'toFirstAnswerMs'), sessionMs: summaryOf(warm, 'sessionMs'), maxRssMB: summaryOf(warm, 'maxRssMB') },
  };
}

// libuv reports maxRSS in kilobytes on every platform, macOS included.
const memory = () => ({ rssMB: mb(process.memoryUsage().rss), maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024) });
const before = memory();
const { runner } = await loadNodeRunner({ dtype, ep, threads });
const afterLoad = memory();
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'fixtures', f), 'utf8'));
const fixtures = ['apron.sample.json', 'tunic.sample.json', 'briefs.json', 'castle-sketch.brief.json'].map(read);
const { types } = read('labels.json');
const harness = await runHarness({ runner, fixtures, types, repeats, memory, onProgress: () => {} });
result.memory = { beforeLoad: before, afterLoad, afterFirstCall: harness.memoryAfterFirstCall, afterAll: harness.memoryAfterAll };
result.harness = harness;

mkdirSync(join(ROOT, 'results'), { recursive: true });
const out = join(ROOT, 'results', `${tag}.json`);
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
say('');
say(summarise(harness));
say(`memory: rss ${afterLoad.rssMB} MB after load, peak ${result.memory.afterAll.maxRssMB} MB`);
if (result.loads) {
  const c = result.loads.diskCold.toFirstAnswerMs;
  const w = result.loads.cacheWarm.toFirstAnswerMs;
  say(`load to first answer: disk-cold median ${Math.round(c.median)} ms (${Math.round(c.min)}–${Math.round(c.max)}), cache-warm median ${Math.round(w.median)} ms (${Math.round(w.min)}–${Math.round(w.max)})`);
}
say(`→ ${out}`);
