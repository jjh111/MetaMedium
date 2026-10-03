// Render the soft-launch film to MP4: every frame is render(t) in a real browser, piped into ffmpeg.
//   node launch-video/render.mjs                       → launch-video/out/dynaink-soft-launch.mp4
//   node launch-video/render.mjs --fps 30 --from 40 --to 50 --out clip.mp4
//   node launch-video/render.mjs --stills 3,17,34       → launch-video/out/still-<t>.png
//   node launch-video/render.mjs --url dyna.ink         → the end card names that address
// Needs Playwright (the e2e's, or a global one) and ffmpeg on the PATH.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i < 0 ? dflt : args[i + 1]; };

async function loadPlaywright() {
  const tries = [join(here, '../e2e/package.json'), '/opt/node22/lib/node_modules/playwright/package.json'];
  for (const p of tries) { try { return createRequire(p)('playwright'); } catch {} }
  return import('playwright');
}
const { chromium } = await loadPlaywright();

const fps = Number(opt('fps', 30));
const outDir = join(here, 'out'); mkdirSync(outDir, { recursive: true });
const url = opt('url', '');
const page_url = pathToFileURL(join(here, 'index.html')).href + '?render=1' + (url ? '&url=' + encodeURIComponent(url) : '');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(page_url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
const duration = await page.evaluate(() => window.DURATION);
const faces = await page.evaluate(() => [...document.fonts].map(f => `${f.family} ${f.weight} ${f.status}`));
if (!faces.length || faces.some(f => !f.endsWith('loaded'))) throw new Error('fonts not loaded: ' + faces.join(', '));
const shot = () => page.screenshot({ type: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1920, height: 1080 } });

const stills = opt('stills', '');
if (stills) {
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: join(outDir, `still-${t}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log('still', t);
  }
  await browser.close(); process.exit();
}

const from = Number(opt('from', 0)), to = Number(opt('to', duration));
const out = resolve(opt('out', join(outDir, 'dynaink-soft-launch.mp4')));
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round((to - from) * fps); const started = Date.now();
for (let i = 0; i < frames; i++) {
  const t = from + i / fps;
  await page.evaluate(t => window.render(t), t);
  const buf = await shot();
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % (fps * 5) === 0) console.log(`t=${t.toFixed(1)}s  frame ${i}/${frames}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
await browser.close();
console.log('wrote', out);
