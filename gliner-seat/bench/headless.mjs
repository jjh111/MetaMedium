// headless.mjs — the browser bench in engines this machine already has.
//
// The pane runs its page hidden, and a hidden renderer may be given less of
// the CPU; WebKit is Safari's engine and the iPad's (V1-PLAN A10). Playwright's
// Chromium for Testing and WebKit, at the revisions the repo's e2e pins
// (playwright 1.63.0), are already in ~/Library/Caches/ms-playwright; this
// drives bench/web.html in them with a page that is in front. It downloads
// no browser: if a revision is missing it stops.
//
//   node bench/serve.mjs &                       (the page's server)
//   node bench/headless.mjs --browser chromium --ep wasm
//   node bench/headless.mjs --browser webkit --ep webgpu --load-only

import { chromium, webkit } from 'playwright-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
const which = flag('--browser', 'chromium');
const ep = flag('--ep', 'wasm');
const repeats = flag('--repeats', '5');
const loadOnly = argv.includes('--load-only');
const port = flag('--port', '8030');
const store = flag('--store', undefined);

const engine = which === 'webkit' ? webkit : chromium;
if (!existsSync(engine.executablePath())) {
  console.error(`${which} is not in the Playwright cache (${engine.executablePath()}); this bench does not download browsers`);
  process.exit(1);
}
const browser = await engine.launch(
  which === 'webkit' ? { headless: true } : { channel: 'chromium', headless: true, args: ['--enable-unsafe-webgpu'] }
);
const page = await browser.newPage();
page.on('pageerror', (e) => console.error(`page error: ${e.message}`));
const url = `http://127.0.0.1:${port}/bench/web.html?ep=${ep}&repeats=${repeats}&tag=${which}${loadOnly ? '&load-only=1' : ''}${store ? `&store=${store}` : ''}`;
console.log(`${which} ${browser.version()} → ${url}`);
await page.goto(url);
await page.waitForFunction(() => window.__status === 'failed' || String(window.__status).startsWith('done'), null, { timeout: 20 * 60e3 });
const out = await page.evaluate(() => ({ status: window.__status, log: window.__log, error: window.__error, hidden: document.hidden }));
for (const line of out.log) console.log(line);
console.log(`status: ${out.status}${out.error ? ` — ${out.error}` : ''} (page hidden: ${out.hidden})`);
await browser.close();
