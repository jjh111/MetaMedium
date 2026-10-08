// The colour space's defaults are brand/tokens.css's (V1-SPEC KN3a, CLAUDE.md "Design System": tokens.css is the
// ONE home of every colour). Core cannot read CSS, so it takes a palette as a parameter and carries defaults;
// this test reads the tokens and fails the day a default and the file disagree, so the file stays the home and
// the defaults only follow it. A .mjs beside scale.test.ts because it reads the disk and core's typecheck carries
// no Node types.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PALETTE } from './scale';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(resolve(HERE, '../../../brand/tokens.css'), 'utf8');

/** The custom properties one rule declares, by name, lower case: from its selector to the brace that closes it. */
function declared(selector) {
  const open = CSS.indexOf('\n' + selector + ' {');
  if (open < 0) throw new Error(`brand/tokens.css has no rule for ${selector}`);
  const body = CSS.slice(CSS.indexOf('{', open) + 1, CSS.indexOf('\n}', open));
  const out = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().toLowerCase();
  return out;
}

const LIGHT = declared(':root');
const DARK = declared(':root[data-theme="dark"]');
const HEX = /^#[0-9a-f]{6}$/;

describe('the palette’s defaults and brand/tokens.css', () => {
  it('finds the tokens it reads, as six-digit hex', () => {
    for (const set of [LIGHT, DARK]) for (const name of ['--paper', '--stroke-hand']) expect(set[name], name).toMatch(HEX);
    for (const name of ['--sig-read', '--sig-high', '--sig-mid', '--sig-low', '--sig-model']) expect(LIGHT[name], name).toMatch(HEX);
  });

  it('are the two grounds and the hand’s ink on each: --paper and --stroke-hand, light and dark', () => {
    expect(DEFAULT_PALETTE.grounds.paper.ground).toBe(LIGHT['--paper']);
    expect(DEFAULT_PALETTE.grounds.paper.ink).toBe(LIGHT['--stroke-hand']);
    expect(DEFAULT_PALETTE.grounds.dark.ground).toBe(DARK['--paper']);
    expect(DEFAULT_PALETTE.grounds.dark.ink).toBe(DARK['--stroke-hand']);
  });

  it('are the chrome’s five signal colours, light: --sig-read, -high, -mid, -low and -model', () => {
    expect(DEFAULT_PALETTE.signals.map(s => [s.name, s.hex])).toEqual([
      ['read', LIGHT['--sig-read']],
      ['confident', LIGHT['--sig-high']],
      ['unsure', LIGHT['--sig-mid']],
      ['broken', LIGHT['--sig-low']],
      ['a model', LIGHT['--sig-model']],
    ]);
  });
});
