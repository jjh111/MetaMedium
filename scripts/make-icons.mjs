// Make the app's icons: PNGs, from the one glyph the manifest has always drawn as an SVG.
//
//   node scripts/make-icons.mjs
//
// PLAN-IPAD-NOTES I3. iOS ignores a manifest's SVG icon and takes the page's `apple-touch-icon`
// for the Home Screen, which must be a PNG (180 × 180); Android and Chromium want PNGs of 192 and
// 512 and a maskable one. Four files land in Demos/icons/, committed, and named by the page, the
// manifest and both service workers:
//
//   apple-touch-icon.png    180 × 180, full bleed — iOS rounds it itself, and a transparent corner would be black
//   icon-192.png            192 × 192, the rounded tile
//   icon-512.png            512 × 512, the rounded tile
//   icon-maskable-512.png   512 × 512, full bleed with the glyph kept inside the maskable safe zone
//
// The picture is the tile the SVG in the manifest was: the canvas's ground, a pen's zigzag in the
// old ink gold. It is rasterised by Chromium (Playwright, which e2e/ already installs — no image
// library is added to the repo). The ground is the surface's own dark token, read from
// Demos/surface/surface.css, so it cannot drift from the page it opens.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'Demos', 'icons');

/** The surface's dark ground, from the stylesheet that defines it. */
function darkGround() {
  const css = readFileSync(join(root, 'Demos', 'surface', 'surface.css'), 'utf8');
  const m = /:root\[data-theme="dark"\]\s*\{[^}]*?--ground:\s*(#[0-9a-fA-F]{3,8})/.exec(css);
  if (!m) throw new Error('no dark --ground in surface.css');
  return m[1];
}
const GOLD = '#c9a84c';
/** The glyph, in the 192-unit square the manifest's SVG used. */
const GLYPH = 'M40 132 L68 60 L96 132 L124 60 L152 132';

/** One icon as SVG. `round`: the tile's corners (the manifest's rx 36); `inset`: the glyph's scale about the centre. */
export function iconSvg({ ground, round, inset }) {
  const rx = round ? ' rx="36"' : '';
  const g = inset === 1 ? '' : ` transform="translate(96 96) scale(${inset}) translate(-96 -96)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="100%" height="100%">`
    + `<rect width="192" height="192"${rx} fill="${ground}"/>`
    + `<path d="${GLYPH}" fill="none" stroke="${GOLD}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"${g}/></svg>`;
}

export const ICONS = [
  { file: 'apple-touch-icon.png', size: 180, round: false, inset: 1 },
  { file: 'icon-192.png', size: 192, round: true, inset: 1 },
  { file: 'icon-512.png', size: 512, round: true, inset: 1 },
  { file: 'icon-maskable-512.png', size: 512, round: false, inset: 0.86 },
];

async function main() {
  const { chromium } = createRequire(join(root, 'e2e', 'package.json'))('playwright');
  const ground = darkGround();
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const ic of ICONS) {
      const page = await browser.newPage({ viewport: { width: ic.size, height: ic.size }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${iconSvg({ ground, round: ic.round, inset: ic.inset })}`);
      const png = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: ic.size, height: ic.size } });
      writeFileSync(join(OUT, ic.file), png);
      await page.close();
      console.log(`wrote Demos/icons/${ic.file} (${ic.size} × ${ic.size}, ${png.length} bytes)`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((err) => { console.error(err); process.exit(1); });
