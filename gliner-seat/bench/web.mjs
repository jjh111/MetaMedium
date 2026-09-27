// web.mjs — the same protocol as bench/node.mjs, in a page (onnxruntime-web).
//
//   http://127.0.0.1:8030/bench/web.html?ep=webgpu            warm if the model is in Cache Storage
//   http://127.0.0.1:8030/bench/web.html?ep=webgpu&fresh=1    cold: the cache emptied first
//   …&ep=wasm   the CPU build (threads when the page is cross-origin isolated)
//   …&repeats=5 &tag=<name> &load-only=1
//
// "Cold" here means the page has nothing: the 614 MB of weights come over the
// wire (loopback from bench/serve.mjs, so no internet time is in the number)
// and are written to the origin-private file system; "warm" means a reload that
// finds them there. (Cache Storage was the first home tried: Chromium refused
// the 614 MB entry with "Unexpected internal error" at 17 GB of free quota.)
// Either way the session is built from nothing — graph optimisation, and on
// WebGPU the shaders — because a page keeps no compiled session between loads.
// The result is POSTed to /results/web-<ep>[-<tag>].json and kept on window.__result.
//   …&cleanup=1   empty this origin's stored model and stop.
//   …&hold=1      keep the session alive when done (for reading memory from outside).
//   …&store=none  fetch the weights every time, keep nothing.

import * as ort from '../node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs';
import { Tokenizer } from '../node_modules/@huggingface/tokenizers/dist/tokenizers.mjs';
import { createRunner } from '../runner.mjs';
import { runHarness, summarise } from './harness.mjs';

const params = new URLSearchParams(location.search);
const ep = params.get('ep') ?? 'webgpu';
const repeats = Number(params.get('repeats') ?? 5);
const fresh = params.has('fresh');
const loadOnly = params.has('load-only');
const tag = params.get('tag');
const MODEL = new URL('../models/onnx-community__gliner2-multi-v1-agent-ONNX/', import.meta.url).href;
const STORE = 'gliner-seat-model-v1';
const cleanup = params.has('cleanup');
// &store=none: fetch the weights every time and keep nothing (for a browser
// whose private file system is unavailable, as in an ephemeral WebKit context).
const noStore = params.get('store') === 'none';

const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
window.__log = [];
const log = (line) => {
  window.__log.push(line);
  logEl.textContent += line + '\n';
};
const status = (s) => {
  statusEl.textContent = s;
  window.__status = s;
  if (s !== 'failed') window.__step = s;
};

async function storeDir() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(STORE, { create: true });
}

/** The file's bytes from the origin-private file system, fetching and keeping them the first time. */
async function cached(url) {
  if (noStore) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), from: 'network' };
  }
  const dir = await storeDir();
  const name = url.slice(MODEL.length).replaceAll('/', '__');
  try {
    const handle = await dir.getFileHandle(name);
    const file = await handle.getFile();
    if (file.size > 0) return { bytes: new Uint8Array(await file.arrayBuffer()), from: 'opfs' };
  } catch {
    // not stored yet
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const handle = await dir.getFileHandle(name, { create: true });
  const w = await handle.createWritable();
  await w.write(bytes);
  await w.close();
  return { bytes, from: 'network' };
}

async function forget() {
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(STORE, { recursive: true }).catch(() => {});
  for (const key of await caches.keys()) await caches.delete(key);
}

async function memory() {
  const out = {};
  if (performance.memory) {
    out.jsHeapUsedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
    out.jsHeapTotalMB = Math.round(performance.memory.totalJSHeapSize / 1048576);
  }
  if (crossOriginIsolated && performance.measureUserAgentSpecificMemory) {
    try {
      const m = await Promise.race([
        performance.measureUserAgentSpecificMemory(),
        new Promise((_, no) => setTimeout(() => no(new Error('timed out')), 30000)),
      ]);
      out.uaSpecificMB = Math.round(m.bytes / 1048576);
    } catch (e) {
      out.uaSpecific = String(e.message ?? e);
    }
  }
  return out;
}

async function main() {
  const result = {
    measured: new Date().toISOString(),
    userAgent: navigator.userAgent,
    crossOriginIsolated,
    hardwareConcurrency: navigator.hardwareConcurrency,
    runtime: { package: 'onnxruntime-web', version: ort.env.versions?.web, ep },
  };
  if (ep === 'webgpu') {
    if (!navigator.gpu) throw new Error('navigator.gpu is missing — this browser has no WebGPU');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU: no adapter');
    const info = adapter.info ?? {};
    result.gpu = { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description, shaderF16: adapter.features.has('shader-f16') };
    log(`WebGPU adapter: ${JSON.stringify(result.gpu)}`);
  }
  if (cleanup) {
    await forget();
    const e = await navigator.storage.estimate();
    log(`this origin's stored model is gone; ${Math.round(e.usage / 1048576)} MB still used`);
    status('cleaned up');
    return;
  }
  if (fresh) {
    await forget();
    log('stored model emptied: this is a cold load');
  }

  status('fetching the model…');
  if (!noStore && !(await navigator.storage.getDirectory().then((d) => d.getFileHandle('probe', { create: true })).then((h) => typeof h.createWritable === 'function'))) {
    throw new Error('this browser\'s origin-private file system has no createWritable');
  }
  const t0 = performance.now();
  let graph = await cached(MODEL + 'onnx/model_fp16.onnx');
  let data = await cached(MODEL + 'onnx/model_fp16.onnx_data');
  const tokJson = await cached(MODEL + 'tokenizer.json');
  const tokCfg = await cached(MODEL + 'tokenizer_config.json');
  const t1 = performance.now();
  const decoder = new TextDecoder();
  const tokenizer = new Tokenizer(JSON.parse(decoder.decode(tokJson.bytes)), JSON.parse(decoder.decode(tokCfg.bytes)));
  const t2 = performance.now();
  status('building the session…');
  const session = await ort.InferenceSession.create(graph.bytes, {
    executionProviders: [ep],
    externalData: [{ path: 'model_fp16.onnx_data', data: data.bytes }],
    graphOptimizationLevel: 'all',
  });
  const t3 = performance.now();
  // The session has its own copy now (wasm heap or GPU buffers); a seat keeps
  // no second one in the JS heap.
  const from = { graph: graph.from, data: data.from };
  graph = data = null;
  const runner = createRunner({ ort, session, tokenizer, name: `gliner2-multi-v1 fp16 · onnxruntime-web ${ort.env.versions?.web ?? ''} · ${ep}` });
  const KINDS = ['measurement name', 'quantity', 'unit', 'garment or part name', 'operation'].map((name) => ({ name }));
  const first = await runner.extract('A. Bust 36', KINDS, { threshold: 0.5 });
  const t4 = performance.now();
  result.load = {
    kind: noStore
      ? 'cold (weights over loopback, not kept)'
      : from.graph === 'network' || from.data === 'network'
        ? 'cold (weights over loopback, written to OPFS)'
        : 'warm (weights read from OPFS)',
    fetchMs: t1 - t0,
    tokenizerMs: t2 - t1,
    sessionMs: t3 - t2,
    firstCallMs: t4 - t3,
    toFirstAnswerMs: t4 - t0,
    found: first.spans.map((s) => `${s.text}:${s.label}`),
    wasmThreads: ep === 'wasm' ? ort.env.wasm.numThreads : undefined,
  };
  log(`load: ${JSON.stringify(result.load)}`);
  await new Promise((r) => setTimeout(r, 3000)); // let the dropped bytes be collected
  result.memoryAfterLoad = await memory();
  log(`memory after load: ${JSON.stringify(result.memoryAfterLoad)}`);

  if (!loadOnly) {
    status('asking every fixture item…');
    const read = async (f) => (await fetch(new URL(`../fixtures/${f}`, import.meta.url))).json();
    const fixtures = await Promise.all(['apron.sample.json', 'tunic.sample.json', 'briefs.json', 'castle-sketch.brief.json'].map(read));
    const { types } = await read('labels.json');
    result.harness = await runHarness({ runner, fixtures, types, repeats, onProgress: (l) => status(l) });
    result.memoryAfterAll = await memory();
    log(summarise(result.harness));
  }

  const name = `web-${ep}${tag ? `-${tag}` : ''}${loadOnly ? '-load' : ''}`;
  await fetch(`/results/${name}.json`, { method: 'POST', body: JSON.stringify(result, null, 2) });
  window.__result = result;
  status(`done → results/${name}.json`);
  // With &hold=1 the session stays alive, so the tab's memory can be read from
  // outside (bench/web-memory.sh) with the model still in it.
  if (params.has('hold')) window.__session = session;
  else await session.release();
}

main().catch((e) => {
  const msg = `${e?.name ?? 'Error'} while ${window.__step ?? 'starting'}: ${e?.message || String(e)}${e?.stack ? `\n${e.stack}` : ''}`;
  log(`FAILED: ${msg}`);
  window.__error = msg;
  status('failed');
});
