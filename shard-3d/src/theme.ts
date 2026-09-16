// ===== theme =====
// Colours come from brand/tokens.css and nowhere else (CLAUDE.md, Design
// System: "don't restate a hex here — that is how three palettes happened").
// index.html links the stylesheet; this reads the computed variables at boot
// and again whenever the theme is stamped, so the canvas and the chrome can
// never disagree.

export type ThemeName = 'light' | 'dark' | 'system';

/** Every token the space draws with. Names are the token names, minus `--`. */
export interface Colours {
  paper: string;
  paperLt: string;
  paperDk: string;
  ink: string;
  ink3: string;
  ink4: string;
  teal: string;
  rule: string;
  grid: string;
  strokeHand: string;
  strokeGhost: string;
  strokeOffer: string;
  sigRead: string;
  sigHeld: string;
}

function tok(cs: CSSStyleDeclaration, name: string): string {
  return cs.getPropertyValue(name).trim() || '#000000';
}

export function readColours(): Colours {
  const cs = getComputedStyle(document.documentElement);
  return {
    paper: tok(cs, '--paper'),
    paperLt: tok(cs, '--paper-lt'),
    paperDk: tok(cs, '--paper-dk'),
    ink: tok(cs, '--ink'),
    ink3: tok(cs, '--ink-3'),
    ink4: tok(cs, '--ink-4'),
    teal: tok(cs, '--teal'),
    rule: tok(cs, '--rule'),
    grid: tok(cs, '--dia-faint'),
    strokeHand: tok(cs, '--stroke-hand'),
    strokeGhost: tok(cs, '--stroke-ghost'),
    strokeOffer: tok(cs, '--stroke-offer'),
    sigRead: tok(cs, '--sig-read'),
    sigHeld: tok(cs, '--sig-held'),
  };
}

const KEY = 'shard3d.theme';

/**
 * The theme this device is on. `?theme=` wins when it is there, the way the
 * whitepaper shares a surface (CLAUDE.md, Design System) — a link can then say
 * which one it meant, which is also how a screenshot of the light paper is
 * taken on a machine set to dark.
 */
export function storedTheme(): ThemeName {
  const asked = new URLSearchParams(location.search).get('theme');
  if (asked === 'light' || asked === 'dark' || asked === 'system') return asked;
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

/**
 * Light and dark are the same tokens inverted, and the PAGE stamps one of the
 * two — *system* follows the OS until the tile says otherwise.
 *
 * tokens.css defines dark under `[data-theme="dark"]` only, with no
 * `prefers-color-scheme` block: stamping nothing for *system* would render
 * light on a dark machine while the tile said `sys · dark`, which is the
 * chrome lying about its own state.
 */
export function applyTheme(t: ThemeName): void {
  localStorage.setItem(KEY, t);
  document.documentElement.setAttribute('data-theme', effectiveTheme(t));
}

export function effectiveTheme(t: ThemeName): 'light' | 'dark' {
  if (t !== 'system') return t;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
