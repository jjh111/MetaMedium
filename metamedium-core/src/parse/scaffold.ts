// Building the page from the parse, and letting the model write only the words.
//
// The first version asked a model for a complete fragment with every region
// absolutely positioned at exact pixel coordinates. A real local model, given
// that prompt, returned four correctly-labelled divs and NO POSITIONING AT ALL
// — good copy, right regions, and ink that would not line up with any of it.
// That is MVP.md risk #2 arriving exactly as predicted, and it is not a prompt
// problem: pixel-accurate layout is the thing models are worst at, and it is
// the thing the engine already knows for certain.
//
// So the split follows the strength of each party. The ENGINE owns structure —
// it parses the drawing into a flow tree and emits the containers, because it
// measured them. The MODEL owns content — copy, semantics, colour — because it
// is good at that and the drawing says nothing about it. The doodle outlining
// the div stops being a request and becomes an invariant.
//
// The scaffold is flexbox with proportional growth, not absolute positioning:
// exact at the size it was drawn, and still real code that reflows.

import type { Layout, LayoutNode } from './layout';

export interface RegionContent {
  /** Inner HTML for the region. */
  html: string;
  /** Semantic element to wrap it in — header, main, aside, footer, section… */
  tag?: string;
  /** Inline style for the region box itself (background, padding, colour). */
  style?: string;
}

export interface Theme {
  background?: string;
  color?: string;
  accent?: string;
  fontFamily?: string;
}

const SAFE_TAGS = new Set([
  'div', 'section', 'header', 'footer', 'main', 'aside', 'nav', 'article', 'figure', 'form',
]);

const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Inline style values are attribute content; a stray quote must not escape it. */
const styleAttr = (s: string) => esc(s).replace(/\n/g, ' ');

function renderNode(node: LayoutNode, content: Record<string, RegionContent>, depth: number): string {
  const pad = '  '.repeat(depth);
  const own = node.region ? content[node.id] : undefined;
  const tag = own?.tag && SAFE_TAGS.has(own.tag) ? own.tag : 'div';

  // Growth is proportional to the size the human drew. With `flex-basis: 0` the
  // free space splits by these ratios, which reproduces the drawing exactly at
  // its drawn size and keeps reflowing above and below it.
  const box: string[] = [];
  if (depth === 1) box.push('flex:1 1 auto');
  else if (depth > 1) {
    // `min-width`/`min-height` must be zeroed on every flex ITEM, not only on
    // containers. Their default is `auto`, which means an item refuses to
    // shrink below its content — so one region with a long list in it silently
    // pushes its siblings out of place.
    box.push(`flex:${node.grow ?? 1} 1 0`, 'min-width:0', 'min-height:0');
  }
  if (node.marginBefore) {
    box.push(node.parentFlow === 'row' ? `margin-left:${node.marginBefore}px` : `margin-top:${node.marginBefore}px`);
  }

  // THE REGION BOX IS PURE GEOMETRY. Anything the model styles goes on an inner
  // element, and that separation is load-bearing rather than tidiness: with
  // `box-sizing: border-box`, a `flex-basis: 0` item cannot be smaller than its
  // own padding and border, so a region the model padded by 20px starts 42px
  // ahead of the ones it did not and every sibling shifts. That is precisely
  // how the first real page drifted — 42 + 76 = 118 where the drawing said 90.
  // Keeping padding inside means the ink still outlines the box exactly, and
  // the content is inset within it, which is what padding should have meant.
  const fill: string[] = ['box-sizing:border-box', 'width:100%', 'height:100%'];
  if (node.flow === 'row' || node.flow === 'column') {
    fill.push('display:flex', `flex-direction:${node.flow === 'row' ? 'row' : 'column'}`);
  } else if (node.flow === 'stack') {
    fill.push('position:relative');
  }
  if (own?.style) fill.push(own.style);

  const attrs =
    (node.region ? ` data-region="${node.id}"` : '') +
    (box.length ? ` style="${styleAttr(box.join(';'))}"` : '');

  const inner = node.children.length && node.flow !== 'leaf'
    ? '\n' + node.children.map((c) => renderNode(c, content, depth + 2)).join('\n') + '\n' + pad + '  '
    : (own?.html ?? '');

  // A group with no region of its own needs no wrapper — its box IS its layout.
  if (!node.region) {
    const merged = box.concat(fill.filter((f) => !/^(box-sizing|width|height):/.test(f)));
    return `${pad}<div${merged.length ? ` style="${styleAttr(merged.join(';'))}"` : ''}>${
      node.children.length ? '\n' + node.children.map((c) => renderNode(c, content, depth + 1)).join('\n') + `\n${pad}` : ''
    }</div>`;
  }

  return (
    `${pad}<${tag}${attrs}>\n` +
    `${pad}  <div style="${styleAttr(fill.join(';'))}">${inner}</div>\n` +
    `${pad}</${tag}>`
  );
}

/**
 * Annotate the tree with the flex values the renderer needs. Kept separate from
 * `parseLayout` so the parse stays a description of the drawing rather than of
 * a web page — another surface could render the same tree very differently.
 */
export function prepare(node: LayoutNode, parentFlow: LayoutNode['flow'] = 'leaf'): LayoutNode {
  const main = (n: LayoutNode) => (parentFlow === 'row' ? n.rect.w : n.rect.h);
  const kids = node.children.map((c, i) => {
    const prepared = prepare({ ...c }, node.flow);
    prepared.parentFlow = node.flow;
    prepared.grow = Math.max(1, Math.round(main(c)));
    if (i > 0 && node.flow !== 'stack') {
      const prev = node.children[i - 1];
      prepared.marginBefore =
        node.flow === 'row'
          ? Math.max(0, Math.round(c.rect.x - (prev.rect.x + prev.rect.w)))
          : Math.max(0, Math.round(c.rect.y - (prev.rect.y + prev.rect.h)));
    }
    return prepared;
  });
  // Growth uses the CHILD'S extent along the PARENT'S axis, so recompute here
  // now that we know which axis this node lays its children out on.
  for (const k of kids) {
    k.grow = Math.max(1, Math.round(node.flow === 'row' ? k.rect.w : k.rect.h));
  }
  return { ...node, children: kids };
}

/** The finished artifact: a style block and the scaffold, filled with content. */
export function buildScaffold(
  layout: Layout,
  content: Record<string, RegionContent>,
  theme: Theme = {}
): string {
  const root = prepare(layout.root);
  const body = renderNode({ ...root, parentFlow: 'leaf' }, content, 1);
  const t = {
    background: theme.background ?? '#ffffff',
    color: theme.color ?? '#16161a',
    fontFamily: theme.fontFamily ?? "system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
  return [
    '<style>',
    `  .mm-frame { width:100%; height:100%; display:flex; flex-direction:column;`,
    `    background:${styleAttr(t.background)}; color:${styleAttr(t.color)};`,
    `    font-family:${styleAttr(t.fontFamily)}; overflow:hidden; }`,
    '  .mm-frame *, .mm-frame *::before, .mm-frame *::after { box-sizing:border-box; }',
    '  .mm-frame [data-region] { overflow:hidden; }',
    '  .mm-frame [data-region] > * { max-width:100%; }',
    '  .mm-frame h1, .mm-frame h2, .mm-frame h3, .mm-frame p { margin:0 0 0.4em; }',
    '  .mm-frame :last-child { margin-bottom:0; }',
    '</style>',
    '<div class="mm-frame">',
    body,
    '</div>',
  ].join('\n');
}

/**
 * Does this code keep the promise the drawing made?
 *
 * Run on anything a model produced freely. A page that quietly drops a region
 * renders as ink outlining nothing, which is the silent drift the whole
 * scaffold approach exists to prevent — so it is reported, never assumed.
 */
export function validateRegions(code: string, expected: string[]): { ok: boolean; missing: string[]; duplicated: string[] } {
  const found = [...code.matchAll(/data-region\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const counts = new Map<string, number>();
  for (const f of found) counts.set(f, (counts.get(f) ?? 0) + 1);
  const missing = expected.filter((e) => !counts.has(e));
  const duplicated = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  return { ok: missing.length === 0 && duplicated.length === 0, missing, duplicated };
}
