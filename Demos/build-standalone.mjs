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
const surface = readFileSync(resolve(here, 'session-engine.js'), 'utf8');
const css = readFileSync(resolve(here, 'surface/surface.css'), 'utf8');

const inline = (tag, code, what) => {
  if (!html.includes(tag)) throw new Error(`${what} tag not found — did the demo change?`);
  // Guard: a literal </script> inside the code would close the tag early.
  if (code.includes('</script>')) throw new Error(`${what} contains a literal </script>`);
  html = html.replace(tag, '<script>\n' + code + '\n</script>');
};
inline('<script src="metamedium-core.browser.js"></script>', bundle, 'bundle');
inline('<script src="session-engine.js"></script>', surface, 'surface');
const link = '<link rel="stylesheet" href="surface/surface.css">';
if (!html.includes(link)) throw new Error('stylesheet link not found — did the demo change?');
html = html.replace(link, '<style>\n' + css + '</style>');

if (asFragment) {
  const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
  html = `<title>${title}</title>\n${style}\n${body}`;
}

writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)}KB)${asFragment ? ' as fragment' : ''}`);
