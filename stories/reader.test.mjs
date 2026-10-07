// The scenario stories: the renderer, each file, and the whitepaper's cards that name them.
// node --test stories/reader.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { parseStory, renderStory, inline } = require('./reader.js');
const page = readFileSync(join(here, '..', 'index.html'), 'utf8');
const files = readdirSync(here).filter(f => f.endsWith('.md') && f !== 'README.md');

test('front matter is read and taken off the body', () => {
    const { meta, body } = parseStory('---\ntitle: A Day\nsubtitle: B: C\n---\n\n## One\n\nText.\n');
    assert.deepEqual(meta, { title: 'A Day', subtitle: 'B: C' });
    assert.equal(body.trim(), '## One\n\nText.');
});

test('the subset renders, sections at the level asked for', () => {
    const html = renderStory('## Morning\n\nShe **draws** a *box*\nand an arrow.\n\n- one\n- two\n\n---\n\nEnd.', 4);
    assert.equal(html, [
        '<h4>Morning</h4>',
        '<p>She <strong>draws</strong> a <em>box</em> and an arrow.</p>',
        '<ul><li>one</li><li>two</li></ul>',
        '<hr>',
        '<p>End.</p>',
    ].join('\n'));
});

test('markup in a file is text, and only http links are links', () => {
    assert.equal(inline('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(inline('[x](javascript:alert(1))'), '[x](javascript:alert(1))');
    assert.equal(inline('[x](https://a.b/c)'), '<a href="https://a.b/c" target="_blank" rel="noopener">x</a>');
    assert.match(inline('[x](https://a.b/"onmouseover=y)'), /href="https:\/\/a\.b\/&quot;onmouseover=y"/);
});

test('every story has its front matter, says dyna.ink, and a card names it', () => {
    assert.equal(files.length, 4);
    for (const f of files) {
        const slug = f.replace(/\.md$/, '');
        const { meta, body } = parseStory(readFileSync(join(here, f), 'utf8'));
        for (const k of ['title', 'subtitle', 'scenario', 'published', 'original', 'note']) assert.ok(meta[k], `${f}: ${k}`);
        assert.equal(meta.title, 'A Day With dyna.ink', f);
        assert.match(meta.original, /^https:\/\/johnhanacek\.substack\.com\/p\//, f);
        assert.ok(!/MetaMedium/.test(body), `${f}: the old name in the text`);
        assert.ok(body.split(/\s+/).length > 500, `${f}: the whole story`);
        const card = page.match(new RegExp(`<h4>([^<]+)</h4>(?:(?!<h4>)[\\s\\S])*?data-story="${slug}"`));
        assert.ok(card, `${f}: no card names it`);
        assert.equal(card[1], meta.scenario, `${f}: its card is "${card[1]}"`);
        assert.ok(page.includes(`href="${meta.original}"`), `${f}: the card links its original`);
    }
});

test('the page has the reader the cards open into', () => {
    assert.match(page, /<article class="story-reader" id="storyReader" hidden/);
    assert.match(page, /<script src="stories\/reader\.js" defer><\/script>/);
});
