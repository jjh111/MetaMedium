// Generate a single self-contained page from session-engine.html by inlining
// the engine bundle. The font is already inlined as a data URI in the source.
//
//   node Demos/build-standalone.mjs <out.html> [--fragment]
//
// --fragment strips the document wrapper (doctype/html/head/body), for hosts
// that supply their own skeleton. Nothing generated here is committed — the
// repo demo stays the single source of truth. `standalone(dir)` is the same
// build as a function, over any copy of Demos/: the release script
// (scripts/release.mjs) builds the file it attaches to a release with it.

import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** The page in `dir` (a Demos/ folder) with its engine, its surface and its style inlined. */
export function standalone(dir = here, { fragment = false } = {}) {
  let html = readFileSync(resolve(dir, 'session-engine.html'), 'utf8');
  const bundle = readFileSync(resolve(dir, 'dynaink-core.browser.js'), 'utf8');
  const surface = readFileSync(resolve(dir, 'session-engine.js'), 'utf8');
  const css = readFileSync(resolve(dir, 'surface/surface.css'), 'utf8');

  const inline = (tag, code, what) => {
    if (!html.includes(tag)) throw new Error(`${what} tag not found — did the demo change?`);
    // Guard: a literal </script> inside the code would close the tag early.
    if (code.includes('</script>')) throw new Error(`${what} contains a literal </script>`);
    // A function, so a `$` in the code is never read as a replacement pattern.
    html = html.replace(tag, () => '<script>\n' + code + '\n</script>');
  };
  inline('<script src="dynaink-core.browser.js"></script>', bundle, 'bundle');
  inline('<script src="session-engine.js"></script>', surface, 'surface');
  const link = '<link rel="stylesheet" href="surface/surface.css">';
  if (!html.includes(link)) throw new Error('stylesheet link not found — did the demo change?');
  html = html.replace(link, () => '<style>\n' + css + '</style>');

  if (fragment) {
    const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
    const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
    const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
    html = `<title>${title}</title>\n${style}\n${body}`;
  }
  return html;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const out = process.argv[2];
  const asFragment = process.argv.includes('--fragment');
  if (!out) {
    console.error('usage: node Demos/build-standalone.mjs <out.html> [--fragment]');
    process.exit(1);
  }
  const html = standalone(here, { fragment: asFragment });
  writeFileSync(out, html);
  console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)}KB)${asFragment ? ' as fragment' : ''}`);
}
