// Notes: the Markdown adapter (V1-SPEC IN1, `markdown.ts` — data only).
//
// A note becomes a text run holding its words as written, and what it points at and is about is collected on
// the document: its `[[links]]` (a target, an alias, a heading or block inside it, an embed), its web links and
// images, and its `#tags` (those in the text and those in the header). What a link BECOMES — a said `links-to`
// relation — is RN1's, and what a tag becomes — a kind offered to the person, never made without their yes — is
// KN1's. Nothing here relates one note to another: a vault is a folder of these documents.
//
// A tag is what a notes vault says it is: letters, numbers, `_`, `-` and `/` after a `#` that stands at the start
// of a line or after a space or an opening bracket, with at least one thing in it that is not a number (so
// `#12` is an issue, not a tag). Code is not read for either: not a fence, not an inline span.
//
// Read, not trusted (DATA-1): every pattern is bounded, so a line made of brackets cannot take quadratic time,
// and bytes that are not text are refused.

import {
  type IngestResult, type IngestOptions, type InkDocument, type InkLink, type IngestLimits, DEFAULT_LIMITS, accept, blankPage, refuse,
} from './source';

const MAX_LINKS = 50_000;
const MAX_TAGS = 5_000;

function decode(bytes: Uint8Array): string | null {
  let text: string;
  try { text = new TextDecoder('utf-8').decode(bytes); } catch { return null; }
  let bad = 0;
  const probe = Math.min(text.length, 20_000);
  for (let i = 0; i < probe; i++) { const c = text.charCodeAt(i); if (c === 0xfffd || c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12)) bad++; }
  return probe > 0 && bad / probe > 0.02 ? null : text;
}

const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, '').trim();
const cleanTag = (s: string) => unquote(s).replace(/^#+/, '').replace(/[-/]+$/, '');
const isTag = (t: string) => t.length > 0 && /[^\p{N}]/u.test(t);

interface Header {
  title?: string;
  created?: string;
  tags: string[];
  body: string;
}

/** A note’s header (the block of `key: value` lines between two `---` lines) and the text after it. */
function headerOf(text: string): Header {
  const m = /^---[ \t]*\n([\s\S]{0,20000}?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(text);
  if (!m) return { tags: [], body: text };
  const out: Header = { tags: [], body: text.slice(m[0].length) };
  let key = '';
  for (const line of m[1].split('\n')) {
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && key === 'tags') { out.tags.push(cleanTag(item[1])); continue; }
    const kv = /^([A-Za-z_][\w -]{0,40}?)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    key = kv[1].trim().toLowerCase();
    const value = kv[2].trim();
    if (key === 'tags' || key === 'tag') {
      key = 'tags';
      if (value.startsWith('[')) out.tags.push(...value.replace(/^\[|\]$/g, '').split(',').map(cleanTag));
      else if (value) out.tags.push(...value.split(/[\s,]+/).map(cleanTag));
    } else if (key === 'title') {
      out.title = unquote(value) || undefined;
    } else if ((key === 'created' || key === 'date' || key === 'created_at') && !out.created) {
      const v = unquote(value);
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) out.created = v;
    }
  }
  out.tags = out.tags.filter(isTag);
  return out;
}

const WIKI = /(!?)\[\[([^[\]\n]{0,512}?)\]\]/g;
const WEB = /(!?)\[([^\]\n]{0,300})\]\(\s{0,8}<?([^)\s>]{1,2048})>?(?:\s{1,8}(?:"[^"\n]{0,300}"|'[^'\n]{0,300}'))?\s{0,8}\)/g;
const TAG = /(^|[\s([{,;:!?"'])#([\p{L}\p{N}_/-]{1,200})/gu;
const CODE_SPAN = /``[^`\n]{0,2000}``|`[^`\n]{0,2000}`/g;

/** `s` with each range (in order, not overlapping) turned to spaces, built once. */
function blank(s: string, ranges: [number, number][]): string {
  if (ranges.length === 0) return s;
  let out = '';
  let at = 0;
  for (const [a, b] of ranges) { out += s.slice(at, a) + ' '.repeat(b - a); at = b; }
  return out + s.slice(at);
}

export function ingestMarkdown(bytes: Uint8Array, name: string, hash: string, opts: IngestOptions = {}): IngestResult {
  try {
    const limits: IngestLimits = { ...DEFAULT_LIMITS, ...opts.limits };
    if (bytes.length > limits.bytes) return refuse(`that note is ${(bytes.length / 1048576).toFixed(1)} MB — over the ${(limits.bytes / 1048576).toFixed(0)} MB limit on what is read`);
    const raw = decode(bytes);
    if (raw === null) return refuse('that file is not text, so it is not a note');
    const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const head = headerOf(text);
    const body = head.body.replace(/^\n+/, '').replace(/\s+$/, '');

    const links: InkLink[] = [];
    const seenLinks = new Set<string>();
    const tags: string[] = [];
    const seenTags = new Set<string>();
    const addTag = (t: string) => {
      const k = t.toLowerCase();
      if (!isTag(t) || seenTags.has(k) || tags.length >= MAX_TAGS) return;
      seenTags.add(k);
      tags.push(t);
    };
    for (const t of head.tags) addTag(t);

    let title = head.title;
    let fence: string | null = null;
    for (const line of body.split('\n')) {
      const f = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null; continue; }
      if (f) { fence = f[1]; continue; }
      if (!title) { const h = /^#[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line); if (h) title = h[1].trim(); }
      const code = line.replace(CODE_SPAN, (m) => ' '.repeat(m.length));
      const found: { at: number; link: InkLink }[] = [];
      const wikiRanges: [number, number][] = [];
      for (const m of code.matchAll(WIKI)) {
        const [left, ...alias] = m[2].split('|');
        const hash = left.indexOf('#');
        const target = (hash >= 0 ? left.slice(0, hash) : left).trim();
        if (!target) continue;
        const section = hash >= 0 ? left.slice(hash + 1).trim() : '';
        const label = alias.join('|').trim();
        found.push({ at: m.index ?? 0, link: { kind: 'wiki', target, ...(label ? { label } : {}), ...(section ? { section } : {}), ...(m[1] ? { embed: true } : {}) } });
        wikiRanges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
      }
      const afterWiki = blank(code, wikiRanges);
      const webRanges: [number, number][] = [];
      for (const m of afterWiki.matchAll(WEB)) {
        const label = m[2].trim();
        found.push({ at: m.index ?? 0, link: { kind: 'href', target: m[3], ...(label ? { label } : {}), ...(m[1] ? { embed: true } : {}) } });
        webRanges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
      }
      const rest = blank(afterWiki, webRanges);
      found.sort((a, b) => a.at - b.at);
      for (const { link } of found) {
        const key = [link.kind, link.embed ? 1 : 0, link.target, link.section ?? '', link.label ?? ''].join('\u0000');
        if (seenLinks.has(key) || links.length >= MAX_LINKS) continue;
        seenLinks.add(key);
        links.push(link);
      }
      for (const m of rest.matchAll(TAG)) addTag(m[2].replace(/[-/]+$/, ''));
    }

    const stem = (name.split(/[\\/]/).pop() ?? name).replace(/\.(?:md|markdown|mdown|txt|text)$/i, '');
    const dated = /^(\d{4}-\d{2}-\d{2})(?![\d])/.exec(stem);
    const created = head.created ?? (dated ? dated[1] : undefined);
    const page = blankPage(0, 0, 0);
    if (body) page.texts.push({ order: 0, text: body, x: 0, y: 0, format: 'markdown' });
    page.links = links;
    page.tags = tags;
    const words = (body.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
    const doc: InkDocument = {
      source: { hash, name, format: 'markdown', ...(created ? { created } : {}) },
      pages: [page],
      reading: {
        as: 'text',
        evidence: { words, links: links.length, tags: tags.length, characters: body.length },
        words: `a note of ${words.toLocaleString('en')} words, ${links.length === 1 ? '1 link' : links.length + ' links'} and ${tags.length === 1 ? '1 tag' : tags.length + ' tags'}`,
      },
      title: title || stem || undefined,
    };
    return accept(doc, []);
  } catch (err) {
    return refuse('this note could not be read: ' + (err instanceof Error ? err.message : String(err)));
  }
}
