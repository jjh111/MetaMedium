import { describe, it, expect } from 'vitest';
import { KINDS, kindOf, rowOf } from './kinds';
import { addressablesOf, functionsOf, keysOf, headingsOf, elementsOf, matchBrace } from './address';

describe('kinds', () => {
  it('is a closed table where every kind has a renderer and an addressing scheme', () => {
    for (const k of KINDS) { expect(k.renderer).toBeTruthy(); expect(k.addressing).toBeTruthy(); }
    expect(kindOf('a/b/page.HTML')?.kind).toBe('html');
    expect(kindOf('notes.md')?.kind).toBe('md');
    expect(kindOf('Makefile')).toBeUndefined();
    expect(rowOf('json').addressing).toBe('keys');
  });
});

describe('addressing', () => {
  it('js: top-level functions, arrows and classes, with braces inside strings and templates left alone', () => {
    const src = `import x from 'y';
export function steer(a, b) {
  const s = "not } a brace";
  return \`\${a}} \${b}\`;
}

const helper = (n) => {
  return { n };
};

class Thing {
  go() { return 1; }
}
function steer() {}
`;
    const f = functionsOf(src);
    expect(f.map((x) => x.id)).toEqual(['fn:steer', 'fn:helper', 'fn:Thing', 'fn:steer#2']);
    expect(src.slice(f[0].start, f[0].end)).toMatch(/^export function steer[\s\S]*\n\}$/);
    expect(src.slice(f[2].start, f[2].end)).toMatch(/^class Thing[\s\S]*\n\}$/);
    expect(matchBrace('{ "a}" }', 0)).toBe(8);
  });

  it('json: keys with dotted paths into nested objects, at their offsets', () => {
    const src = `{
  "name": "tank",
  "seed": 7,
  "world": { "width": 800, "walls": [1, 2] },
  "list": [ { "x": 1 } ]
}`;
    const k = keysOf(src);
    expect(k.map((x) => x.id)).toEqual(['key:name', 'key:seed', 'key:world', 'key:world.width', 'key:world.walls', 'key:list']);
    const world = k.find((x) => x.id === 'key:world')!;
    expect(src.slice(world.start, world.end)).toBe('"world": { "width": 800, "walls": [1, 2] }');
    expect(keysOf('not json')).toEqual([]);
  });

  it('md: sections from a heading to the next of its level or higher', () => {
    const src = `# Title

intro

## One

a

### One point one

b

## Two

c
`;
    const h = headingsOf(src);
    expect(h.map((x) => x.id)).toEqual(['h:title', 'h:one', 'h:one-point-one', 'h:two']);
    expect(src.slice(h[1].start, h[1].end)).toBe('## One\n\na\n\n### One point one\n\nb\n\n');
    expect(h[2].depth).toBe(2);
  });

  it('svg: the elements directly inside the root, by id when they have one', () => {
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
  <!-- <rect/> in a comment -->
  <rect id="frame" x="0" y="0" width="10" height="10"/>
  <g><circle cx="5" cy="5" r="2"/><circle cx="1" cy="1" r="1"/></g>
  <path d="M0 0L1 1"/>
</svg>`;
    const e = elementsOf(src);
    expect(e.map((x) => x.id)).toEqual(['el:frame', 'el:g#1', 'el:path#1']);
    expect(src.slice(e[1].start, e[1].end)).toBe('<g><circle cx="5" cy="5" r="2"/><circle cx="1" cy="1" r="1"/></g>');
  });

  it('ids are stable across an edit that does not reorder', () => {
    const a = functionsOf('function one() {}\nfunction two() {}\n');
    const b = functionsOf('function one() {\n  // longer now\n}\nfunction two() {}\n');
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(addressablesOf('png', '')).toEqual([]);
  });
});
