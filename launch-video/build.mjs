// Inlines film.js and synth.js into index.html, so the film's page is one file that plays wherever it is opened —
// a preview of the file alone, a host that serves it alone — and never asks for a script it may not be given.
//
//   node launch-video/build.mjs           → index.html, its two blocks written from film.js and synth.js
//   node launch-video/build.mjs --check   → exit 1 when index.html is not what film.js and synth.js make (CI)
//
// film.js and synth.js stay the sources: the board's program (scripts/examples.mjs) reads film.js, sound.mjs reads synth.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');

export function build(page = read('index.html')) {
  let out = page;
  for (const [id, file] of [['film', 'film.js'], ['synth', 'synth.js']]) {
    const src = read(file);
    if (/<\/script/i.test(src)) throw new Error(`${file} says </script, which would end the block it is inlined into`);
    const re = new RegExp(`(<script id="${id}"[^>]*>)[\\s\\S]*?(</script>)`);
    if (!re.test(out)) throw new Error(`index.html has no <script id="${id}"> block`);
    out = out.replace(re, (_, a, b) => `${a}\n/* ${file}, inlined by build.mjs — edit ${file}, then run it */\n${src.trimEnd()}\n${b}`);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const page = read('index.html'), made = build(page);
  if (process.argv.includes('--check')) {
    if (made !== page) { console.error('launch-video/index.html is not what film.js and synth.js make — run node launch-video/build.mjs'); process.exit(1); }
    console.log('launch-video/index.html: in sync with film.js and synth.js');
  } else { writeFileSync(join(here, 'index.html'), made); console.log('launch-video/index.html written'); }
}
