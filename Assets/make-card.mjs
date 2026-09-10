// Regenerate the social card from the whitepaper's own hero.
//
//   node Assets/make-card.mjs [out.png]        # default: Assets/thumb-metamedium-v5.png
//
// The card is not a mock-up of the product: it is index.html's hero, driven by
// synthetic pointer input so the engine really reads the marks it shows. A box
// and a circle are drawn with a hand's wobble, the box comes back as
// "Rectangle · W × H" with the measurement that says so, and the two crossings
// are marked. What you get is a picture of the thesis rather than a logotype on
// a field.
//
// Reproducible where it counts: the wobble runs off a fixed seed, the page's
// own Math.random is seeded, the ambient dots are settled, and the page is
// stepped in Chrome's VIRTUAL time — so the composition and the reading come
// out the same every run. The BYTES do not: the corner glyphs turn a fixed
// step per frame, and how many frames Chrome paints is the one thing virtual
// time does not pin down. Two runs differ by a few degrees of ornament in the
// corners. Don't read a changed hash as a changed hero; look at the picture.
//
// Needs Chrome (set CHROME= to override the path) and, for the 2x downsample,
// macOS `sips`. Without sips you get the 2400x1260 render, which still works.
//
// AFTER REGENERATING: if the picture changed, give it a NEW filename and update
// the four tags in index.html and 404.html. Scrapers cache by URL, so reusing
// the old path keeps the old picture in circulation for days.

import { readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const page = join(root, 'index.html');
const out = resolve(process.argv[2] || join(here, 'thumb-metamedium-v5.png'));
// Written into the repo, not a temp dir: the hero needs its fonts and its own
// relative assets, so the capture page has to sit where index.html sits.
const staging = join(root, '.card-build.html');

const CHROME = process.env.CHROME
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// 1200x630 is the large-card size every scraper understands. Rendered at 2x and
// downsampled, because thin light type on a dark ground is where a soft resize
// shows first.
const W = 1200, H = 630, SCALE = 2;
// Virtual milliseconds. The circle is drawn first so its label has faded by the
// capture; the rectangle follows, and its reading is what the card says out loud.
const BUDGET = 3900;

// The hero scatters ambient dots with Math.random, so two runs of the same
// page are not the same picture. Seeding it at the top of the document — before
// the hero's own script runs — makes the capture reproducible, which is what
// lets a diff on the PNG mean "the hero changed" rather than "dots moved".
const SEED_RANDOM = `
<script>
(function () {
  var s = 123456789;
  Math.random = function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
})();
</script>
`;

const INJECT = `
<style id="cardMode">
  /* Affordances for a reader who can click have no job in a still picture. */
  .scroll-indicator, .hero-hint, nav { display: none !important; }
  .hero::after { display: none !important; }   /* the fade into the paper below */
  .hero { min-height: 100vh !important; }
  html, body { overflow: hidden !important; }
</style>
<script>
(function () {
  var cv = document.getElementById('heroCanvas');
  function ev(type, x, y) {
    cv.dispatchEvent(new MouseEvent(type, {
      clientX: x, clientY: y, bubbles: true, cancelable: true, view: window
    }));
  }
  // A fixed seed, so the same hand draws the same wobble every run.
  var seed = 11;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  function jit(a) { return (rnd() - 0.5) * a; }

  function strokeAlong(pts, step, wob) {
    ev('mousedown', pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i-1][0], ay = pts[i-1][1], bx = pts[i][0], by = pts[i][1];
      var n = Math.max(2, Math.round(Math.hypot(bx-ax, by-ay) / step));
      for (var k = 1; k <= n; k++) {
        var t = k / n;
        ev('mousemove', ax + (bx-ax)*t + jit(wob), ay + (by-ay)*t + jit(wob));
      }
    }
    ev('mouseup', pts[pts.length-1][0], pts[pts.length-1][1]);
  }

  var W = window.innerWidth, H = window.innerHeight;

  // Proportions, not pixels, so the composition holds at any capture size.
  // Both shape CENTRES sit clear of the centred type, because a label is drawn
  // at its shape's centre — put a centre behind the wordmark and the reading
  // lands on top of it.
  function box() {
    var x0 = W*0.44, x1 = W*0.82, y0 = -H*0.05, y1 = H*0.30;
    strokeAlong([[x0,y0],[x1,y0+jit(5)],[x1+jit(4),y1],[x0+jit(4),y1+jit(4)],[x0,y0+jit(6)]], 9, 1.6);
  }
  function circle() {
    var cx = W*0.80, cy = H*0.60, r = H*0.46, pts = [], N = 72;
    for (var i = 0; i <= N; i++) {
      var a = -Math.PI/2 + (i/N) * Math.PI*2;
      pts.push([cx + Math.cos(a)*r + jit(2.4), cy + Math.sin(a)*r + jit(2.4)]);
    }
    strokeAlong(pts, 12, 1.2);
  }

  // The ambient dots drift by a fixed step PER FRAME, not per elapsed time, so
  // where they sit depends on how many frames Chrome happened to paint — the
  // one thing virtual time does not pin down. Their seeded starting positions
  // are enough; settling them is what makes the capture reproducible.
  function settle() {
    if (typeof ambientParticles !== 'undefined') {
      ambientParticles.forEach(function (p) { p.vx = 0; p.vy = 0; });
    }
  }
  settle();
  setTimeout(settle, 100);

  setTimeout(circle, 150);
  setTimeout(box, 2300);
  setTimeout(function () { cv.dispatchEvent(new MouseEvent('mouseleave', {bubbles: true})); }, 2800);
})();
</script>
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!existsSync(CHROME)) {
    console.error(`No Chrome at ${CHROME}. Set CHROME=/path/to/chrome and retry.`);
    process.exit(1);
  }

  const src = readFileSync(page, 'utf8');
  if (!src.includes('<head>') || !src.includes('</body>') || !src.includes('id="heroCanvas"')) {
    console.error('index.html has no </body> or no #heroCanvas — the hero moved; update this script.');
    process.exit(1);
  }
  writeFileSync(
    staging,
    src.replace('<head>', '<head>' + SEED_RANDOM)
       .replace('</body>', INJECT + '\n</body>'),
    'utf8',
  );

  try {
    rmSync(out, { force: true });
    const profile = join(root, '.card-build-profile');
    rmSync(profile, { recursive: true, force: true });

    const chrome = spawn(CHROME, [
      '--headless', '--disable-gpu', '--hide-scrollbars',
      '--no-first-run', '--no-default-browser-check',
      `--force-device-scale-factor=${SCALE}`,
      `--window-size=${W},${H}`,
      `--virtual-time-budget=${BUDGET}`,
      `--screenshot=${out}`,
      `--user-data-dir=${profile}`,
      `file://${staging}`,
    ], { stdio: 'ignore' });

    // Chrome writes the screenshot and then lingers, so wait for the file
    // rather than for the process, and stop it once the bytes are on disk.
    let ok = false;
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      if (existsSync(out) && statSync(out).size > 0) { await sleep(1000); ok = true; break; }
    }
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });

    if (!ok) {
      console.error('Chrome produced no screenshot within 60s.');
      process.exit(1);
    }

    const sips = spawnSync('sips', ['--resampleWidth', String(W), out], { stdio: 'ignore' });
    if (sips.status !== 0) {
      console.warn(`sips unavailable — leaving the ${W * SCALE}x${H * SCALE} render as it is.`);
    }
    const kb = (statSync(out).size / 1024).toFixed(0);
    console.log(`wrote ${out} (${kb}KB)`);
    console.log('If the picture changed: rename it and update og:image / twitter:image');
    console.log('in index.html and 404.html — scrapers cache by URL.');
  } finally {
    rmSync(staging, { force: true });
  }
}

main();
