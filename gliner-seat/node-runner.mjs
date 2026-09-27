// node-runner.mjs — load the graph in a Node process (onnxruntime-node).
//
// The "small local process beside the relay" path. Reads the files `fetch.mjs`
// put in models/; never fetches anything itself.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as ort from 'onnxruntime-node';
import { Tokenizer } from '@huggingface/tokenizers';
import { createRunner } from './runner.mjs';
import { MODEL_DIR } from './fetch.mjs';

export const GRAPHS = {
  fp16: 'onnx/model_fp16.onnx',
  fp32: 'onnx/model.onnx',
};

export function loadTokenizer(dir = MODEL_DIR) {
  const json = JSON.parse(readFileSync(join(dir, 'tokenizer.json'), 'utf8'));
  const config = JSON.parse(readFileSync(join(dir, 'tokenizer_config.json'), 'utf8'));
  return new Tokenizer(json, config);
}

/**
 * @param {{ dtype?: 'fp16' | 'fp32', ep?: 'cpu' | 'coreml', threads?: number, dir?: string }} [o]
 */
export async function loadNodeRunner(o = {}) {
  const dtype = o.dtype ?? 'fp16';
  const ep = o.ep ?? 'cpu';
  const dir = o.dir ?? MODEL_DIR;
  const path = join(dir, GRAPHS[dtype]);
  if (!existsSync(path)) throw new Error(`${path} is missing — run \`node fetch.mjs${dtype === 'fp32' ? ' --fp32' : ''}\` first`);
  const t0 = performance.now();
  const tokenizer = loadTokenizer(dir);
  const t1 = performance.now();
  const options = {
    executionProviders: ep === 'coreml' ? [{ name: 'coreml' }, 'cpu'] : ['cpu'],
    graphOptimizationLevel: 'all',
    // The CPU provider has no fp16 kernel to constant-fold a few fused Gemm
    // nodes and says so once per node; it inserts casts and runs them anyway.
    logSeverityLevel: 3,
  };
  if (o.threads) options.intraOpNumThreads = o.threads;
  const session = await ort.InferenceSession.create(path, options);
  const t2 = performance.now();
  const runner = createRunner({ ort, session, tokenizer, name: `gliner2-multi-v1 ${dtype} · onnxruntime-node ${ort.env.versions?.node ?? ''} · ${ep}` });
  return { runner, session, tokenizer, ms: { tokenizer: t1 - t0, session: t2 - t1 } };
}
