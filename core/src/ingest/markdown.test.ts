// Notes (V1-SPEC IN1): a note becomes a text run, and its links and tags are collected as data. What a link or a
// tag becomes — a relation, a kind — is RN1's and KN1's, and is not decided here.

import { describe, it, expect } from 'vitest';
import { ingestMarkdown } from './markdown';
import { sha256Hex } from './sha256';
import { VAULT } from './fixtures/vault';
import type { InkDocument, IngestResult } from './source';

const enc = (s: string) => new TextEncoder().encode(s);
const read = (text: string, name = 'note.md'): IngestResult => {
  const bytes = enc(text);
  return ingestMarkdown(bytes, name, sha256Hex(bytes));
};
const doc = (text: string, name?: string): InkDocument => {
  const r = read(text, name);
  if (!r.ok) throw new Error('refused: ' + r.reason);
  return r.doc;
};
const vault = (): Map<string, InkDocument> => new Map(VAULT.map((n) => [n.name, doc(n.text, n.name)]));

describe('a note', () => {
  it('is one text run holding its words as written, on a page with no size', () => {
    const d = doc('# Hello\n\nSome *words* here.\n');
    expect(d.source.format).toBe('markdown');
    expect(d.pages).toHaveLength(1);
    expect([d.pages[0].width, d.pages[0].height]).toEqual([0, 0]);
    expect(d.pages[0].strokes).toHaveLength(0);
    expect(d.pages[0].texts).toEqual([{ order: 0, text: '# Hello\n\nSome *words* here.', x: 0, y: 0, format: 'markdown' }]);
    expect(d.reading.as).toBe('text');
    expect(d.source.hash).toBe(sha256Hex(enc('# Hello\n\nSome *words* here.\n')));
  });

  it('is named by its first heading, else its header, else its file', () => {
    expect(doc('intro\n\n# The Title\n\nbody').title).toBe('The Title');
    expect(doc('---\ntitle: From the header\n---\n# Heading\n').title).toBe('From the header');
    expect(doc('just words', 'Seed starting.md').title).toBe('Seed starting');
    expect(doc('```\n# not a heading\n```\n\nwords', 'x.md').title).toBe('x');
  });

  it('keeps its header out of its text and its dates as the source gave them', () => {
    const d = doc('---\ncreated: 2026-03-14\ntags: [a]\n---\n\nbody text');
    expect(d.pages[0].texts[0].text).toBe('body text');
    expect(d.source.created).toBe('2026-03-14');
  });

  it('a day’s note is dated by its name when it says nothing else', () => {
    expect(doc('words', '2026-10-02.md').source.created).toBe('2026-10-02');
    expect(doc('---\ndate: 2026-01-01\n---\nwords', '2026-10-02.md').source.created).toBe('2026-01-01');
    expect(doc('words', 'plain.md').source.created).toBeUndefined();
  });

  it('reads Windows line ends and a byte order mark as the same note', () => {
    const d = doc('﻿# T\r\n\r\nline [[A]]\r\n');
    expect(d.pages[0].texts[0].text).toBe('# T\n\nline [[A]]');
    expect(d.pages[0].links).toEqual([{ kind: 'wiki', target: 'A' }]);
  });
});

describe('[[links]] are collected', () => {
  it('a target, an alias, a heading or block inside it, and an embed', () => {
    const d = doc('See [[Tomatoes]], [[Seed starting|starting seeds]], [[Compost#Turning]], [[Notes#^abc|that block]] and ![[Plot map]].');
    expect(d.pages[0].links).toEqual([
      { kind: 'wiki', target: 'Tomatoes' },
      { kind: 'wiki', target: 'Seed starting', label: 'starting seeds' },
      { kind: 'wiki', target: 'Compost', section: 'Turning' },
      { kind: 'wiki', target: 'Notes', section: '^abc', label: 'that block' },
      { kind: 'wiki', target: 'Plot map', embed: true },
    ]);
  });

  it('a link inside code is not a link, and the same link twice is one', () => {
    const d = doc('[[A]] and [[A]] and `[[B]]`\n\n```\n[[C]]\n```\n\n    - [[D]] in a nested list\n');
    expect(d.pages[0].links.map((l) => l.target)).toEqual(['A', 'D']);
  });

  it('web links and images are kept as addresses', () => {
    const d = doc('Read [the page](https://example.com/x "title") and see ![a map](maps/plot.png).');
    expect(d.pages[0].links).toEqual([
      { kind: 'href', target: 'https://example.com/x', label: 'the page' },
      { kind: 'href', target: 'maps/plot.png', label: 'a map', embed: true },
    ]);
  });

  it('empty and unfinished brackets are not links', () => {
    expect(doc('[[]] and [[ ]] and [[unfinished and [ ] and ]( )').pages[0].links).toEqual([]);
  });
});

describe('#tags are collected', () => {
  const tags = (text: string) => doc(text).pages[0].tags;
  it('words after a hash, nested ones whole, in the order they appear, once each whatever the case', () => {
    expect(tags('A #idea and #project/alpha, then #Idea again, and (#later) too.')).toEqual(['idea', 'project/alpha', 'later']);
  });
  it('a number after a hash is a number, a heading is a heading, a letter before it makes it no tag, an address’s fragment is not one', () => {
    expect(tags('Issue #12, ## Heading, C#, page.html#top and http://x.test/#frag')).toEqual([]);
    expect(tags('#2026 and #y2026')).toEqual(['y2026']);
  });
  it('code is not read for tags', () => {
    expect(tags('`#a` and\n\n```js\n#b\n```\n\n~~~\n#c\n~~~\n#d')).toEqual(['d']);
  });
  it('the header’s tags, written as a list, in brackets or in a line, join the text’s', () => {
    expect(tags('---\ntags: [x, y]\n---\n#z')).toEqual(['x', 'y', 'z']);
    expect(tags('---\ntags:\n  - x\n  - y\n---\n')).toEqual(['x', 'y']);
    expect(tags('---\ntags: x, y z\n---\n')).toEqual(['x', 'y', 'z']);
    expect(tags('---\ntags: "#x"\n---\n')).toEqual(['x']);
  });
});

describe('a vault’s links and tags are collected', () => {
  it('every note is a document, with its links, its tags and its title', () => {
    const v = vault();
    expect(v.size).toBe(VAULT.length);
    expect(v.get('Garden.md')!.pages[0].links.map((l) => l.target)).toEqual(['Tomatoes', 'Seed starting', 'Compost', 'Beans', 'Plot map']);
    expect(v.get('Garden.md')!.pages[0].links.find((l) => l.target === 'Plot map')!.embed).toBe(true);
    expect(v.get('Tomatoes.md')!.pages[0].tags).toEqual(['garden', 'fruit', 'fruit/tomato']);
    expect(v.get('Tomatoes.md')!.pages[0].links.map((l) => l.target)).toEqual(['Seed starting', 'Compost']);
    expect(v.get('Seed starting.md')!.pages[0].tags).toEqual(['garden', 'spring']);
    expect(v.get('Compost.md')!.pages[0].tags).toEqual(['garden', 'Spring']);
    expect(v.get('Plot map.md')!.pages[0].links).toEqual([]);
    expect(v.get('2026-10-02.md')!.source.created).toBe('2026-10-02');
    expect(v.get('2026-10-02.md')!.pages[0].tags).toEqual(['log']);
  });

  it('together they say who links to whom, which links go nowhere, and which tags gather which notes', () => {
    const v = vault();
    const names = new Map([...v.keys()].map((k) => [k.replace(/\.md$/, '').toLowerCase(), k]));
    const linksTo = new Map<string, string[]>();
    const dangling: string[] = [];
    const byTag = new Map<string, string[]>();
    for (const [file, d] of v) {
      const out = new Set<string>();
      for (const l of d.pages[0].links) {
        if (l.kind !== 'wiki') continue;
        const dest = names.get(l.target.toLowerCase());
        if (dest) out.add(dest); else dangling.push(`${file} → ${l.target}`);
      }
      linksTo.set(file, [...out]);
      for (const t of d.pages[0].tags) {
        const key = t.toLowerCase();
        byTag.set(key, [...(byTag.get(key) ?? []), file]);
      }
    }
    expect(linksTo.get('Garden.md')).toEqual(['Tomatoes.md', 'Seed starting.md', 'Compost.md', 'Plot map.md']);
    expect(linksTo.get('Seed starting.md')).toEqual(['Garden.md', 'Tomatoes.md']);
    expect(dangling).toEqual(['Garden.md → Beans']);
    expect(byTag.get('garden')).toEqual(['Garden.md', 'Tomatoes.md', 'Seed starting.md', 'Compost.md']);
    expect(byTag.get('spring')).toEqual(['Seed starting.md', 'Compost.md']);
  });
});

describe('what is not a note is refused, and nothing throws', () => {
  it('bytes that are not text', () => {
    const bytes = new Uint8Array(300);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 53 + 7) & 255;
    const r = ingestMarkdown(bytes, 'x.md', sha256Hex(bytes));
    expect(r.ok).toBe(false);
  });
  it('an empty note is a note with nothing in it', () => {
    const d = doc('', 'empty.md');
    expect(d.pages[0].texts).toEqual([]);
    expect(d.title).toBe('empty');
  });
  it('a header that never closes is part of the text, not a failure', () => {
    expect(doc('---\ntitle: x\nno end').pages[0].texts[0].text).toContain('title: x');
  });
  it('a line of fifty thousand links is read in a moment, and the links are the ones that are different', () => {
    const t0 = Date.now();
    const d = doc(Array.from({ length: 50000 }, (_, i) => `[[n${i % 1000}]] #t${i % 10}`).join(' '));
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(d.pages[0].links).toHaveLength(1000);
    expect(d.pages[0].tags).toHaveLength(10);
  });
  it('a very long line of brackets and hashes is read in a moment', () => {
    const t0 = Date.now();
    doc('[[a'.repeat(50000) + ' #t'.repeat(50000) + '[](' .repeat(20000));
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});
