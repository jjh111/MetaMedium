// Generate a single self-contained page from session-engine.html by inlining
// the engine bundle. The font is already inlined as a data URI in the source.
//
//   node Demos/build-standalone.mjs <out.html> [--fragment]
//
// --fragment strips the document wrapper (doctype/html/head/body), for hosts
// that supply their own skeleton. Nothing generated here is committed — the
// repo demo stays the single source of truth.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
const asFragment = process.argv.includes('--fragment');
if (!out) {
  console.error('usage: node Demos/build-standalone.mjs <out.html> [--fragment]');
  process.exit(1);
}

let html = readFileSync(resolve(here, 'session-engine.html'), 'utf8');
const bundle = readFileSync(resolve(here, 'metamedium-core.browser.js'), 'utf8');

const tag = '<script src="metamedium-core.browser.js"></script>';
if (!html.includes(tag)) throw new Error('bundle script tag not found — did the demo change?');
// Guard: a literal </script> inside the bundle would close the tag early.
if (bundle.includes('</script>')) throw new Error('bundle contains a literal </script>');
html = html.replace(tag, '<script>\n' + bundle + '\n</script>');

if (asFragment) {
  const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
  html = `<title>${title}</title>\n${style}\n${body}`;
}

writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)}KB)${asFragment ? ' as fragment' : ''}`);
