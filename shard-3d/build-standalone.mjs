// One file, openable from anywhere (SHARD-3D-PLAN §7: "a standalone build …
// so the demo opens from one file on a phone").
//
//   node build-standalone.mjs            → dist/shard-3d.html
//   node build-standalone.mjs out.html   → somewhere else
//
// `Demos/build-standalone.mjs` inlines a hand-written demo's two script tags;
// this one has to run Vite first, because the shard is a module graph over
// three.js and the engine's source rather than a file. So: build, then inline
// every asset Vite emitted — the JS as one inline module and the CSS as one
// style block — and write the result beside them.
//
// **The font link stays external.** `brand/tokens.css` pulls IBM Plex Mono from
// Google's CDN with an `@import`, which Vite leaves alone; the page renders in
// the fallback stack without it, so the file works offline and looks right
// online. Inlining a font as a data URI would treble the size for a face the
// tokens already name a fallback for.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const out = resolve(here, process.argv[2] ?? 'dist/shard-3d.html');

// 1 · build. `npm run build` typechecks first, which is the point of using it.
console.log('vite build…');
execFileSync('npm', ['run', 'build'], { cwd: here, stdio: 'inherit' });

let html = readFileSync(join(dist, 'index.html'), 'utf8');

/**
 * A literal `</script>` inside the code would close the tag early.
 *
 * In valid JavaScript the sequence can only occur inside a string or a regular
 * expression, and `<\/script>` means exactly the same thing in both — so the
 * escape is safe and changes nothing about what runs. Guarding without
 * escaping would mean the build simply failed the first time three.js shipped
 * a shader chunk with a tag in it.
 */
const safe = (code) => code.replace(/<\/script/gi, '<\\/script');

let js = 0;
let css = 0;

// 2 · inline every asset the build emitted, in place of its tag.
const assets = readdirSync(join(dist, 'assets')).filter((f) => statSync(join(dist, 'assets', f)).isFile());
for (const file of assets) {
  const body = readFileSync(join(dist, 'assets', file), 'utf8');
  const script = new RegExp(`<script[^>]*src="[^"]*${file}"[^>]*></script>`);
  const link = new RegExp(`<link[^>]*href="[^"]*${file}"[^>]*>`);
  // A FUNCTION, not a string: `String.replace` reads `$&`, `` $` `` and `$1` in
  // a replacement string, and a minified bundle is full of them — the first
  // run put the whole `<script src=…>` tag back in the middle of three.js,
  // because the bundle contains `$&` and that means "the text you matched".
  if (file.endsWith('.js') && script.test(html)) {
    const inline = `<script type="module">\n${safe(body)}\n</script>`;
    html = html.replace(script, () => inline);
    js += body.length;
    continue;
  }
  if (file.endsWith('.css') && link.test(html)) {
    const inline = `<style>\n${body}\n</style>`;
    html = html.replace(link, () => inline);
    css += body.length;
    continue;
  }
  throw new Error(`${file} was emitted and nothing in index.html references it — a standalone file cannot carry it`);
}

// 3 · nothing may be left pointing at a file that will not travel with it.
const left = html.match(/(?:src|href)="(?!https?:|data:|#)[^"]*"/g);
if (left) throw new Error(`the page still references ${left.join(', ')} — that would not open from one file`);
if (!js) throw new Error('no script was inlined — did the build emit nothing?');

writeFileSync(out, html);
console.log(
  `wrote ${out} (${(html.length / 1024).toFixed(0)}KB: ${(js / 1024).toFixed(0)}KB of script, ` +
    `${(css / 1024).toFixed(0)}KB of style, ${assets.length} asset${assets.length === 1 ? '' : 's'} inlined)`
);
