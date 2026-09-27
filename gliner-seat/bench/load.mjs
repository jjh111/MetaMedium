// load.mjs — one load, from nothing, in a fresh process; prints one JSON line.
//
// Run by bench/node.mjs, several times, so every load starts in a process
// that has never seen the model: import (the native binding), tokenizer,
// session (graph optimisation and kernel choice), and the first answer.
//
//   node bench/load.mjs --dtype fp16 --ep cpu [--dir <model dir>] [--threads n]

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};

const t0 = performance.now();
const { loadNodeRunner } = await import('../node-runner.mjs');
const t1 = performance.now();
const { runner, ms } = await loadNodeRunner({
  dtype: flag('--dtype', 'fp16'),
  ep: flag('--ep', 'cpu'),
  dir: flag('--dir', undefined),
  threads: flag('--threads', undefined) ? Number(flag('--threads')) : undefined,
});
const t2 = performance.now();
const KINDS = ['measurement name', 'quantity', 'unit', 'garment or part name', 'operation'].map((name) => ({ name }));
const answer = await runner.extract('A. Bust 36', KINDS, { threshold: 0.5 });
const t3 = performance.now();

const mb = (bytes) => Math.round(bytes / 1048576);
console.log(
  JSON.stringify({
    importMs: t1 - t0,
    tokenizerMs: ms.tokenizer,
    sessionMs: ms.session,
    firstCallMs: t3 - t2,
    toFirstAnswerMs: t3 - t0,
    rssMB: mb(process.memoryUsage().rss),
    // libuv normalises ru_maxrss to kilobytes on every platform, macOS included.
    maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024),
    found: answer.spans.map((s) => `${s.text}:${s.label}`),
  })
);
