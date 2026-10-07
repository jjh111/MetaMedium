/* The scenario stories, read in the whitepaper (stories/README.md).
 *
 * Each story is a markdown file beside this one, its front matter saying what it is and where it
 * was first published. A scenario card names its story by `data-story`; its link still goes to the
 * Substack original, so with no script the card works as it always did. With one, the story opens
 * in place under the cards: fetched once, rendered by the small renderer below, and addressed as
 * #story-<slug> so a story can be linked to.
 *
 * The renderer is the subset the stories use — `##` sections, paragraphs, `-` lists, `---`,
 * **strong**, *em*, [links](…) — after escaping, so a file can never put markup in the page.
 * Pure, and exported for Node (stories/reader.test.mjs).
 */
(function (root) {
    'use strict';

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /** `---` lines at the top hold `key: value` lines; the rest is the body. */
    function parseStory(text) {
        const meta = {};
        let body = text.replace(/\r\n?/g, '\n');
        const m = body.match(/^---\n([\s\S]*?)\n---\n?/);
        if (m) {
            for (const line of m[1].split('\n')) {
                const i = line.indexOf(':');
                if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
            }
            body = body.slice(m[0].length);
        }
        return { meta, body };
    }

    function inline(s) {
        s = escapeHtml(s);
        s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        return s;
    }

    /** Markdown to HTML. `##` is set at `level` (the page's own hierarchy), never higher. */
    function renderStory(body, level) {
        const h = 'h' + (level || 4);
        const out = [];
        let para = [], list = null;
        const flushPara = () => { if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; };
        const flushList = () => { if (list) out.push('<ul>' + list.map(li => '<li>' + inline(li) + '</li>').join('') + '</ul>'); list = null; };
        for (const raw of body.split('\n')) {
            const line = raw.trim();
            if (!line) { flushPara(); flushList(); continue; }
            if (/^#{1,6}\s/.test(line)) {
                flushPara(); flushList();
                out.push('<' + h + '>' + inline(line.replace(/^#+\s*/, '')) + '</' + h + '>');
            } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
                flushPara(); flushList(); out.push('<hr>');
            } else if (/^[-*]\s/.test(line)) {
                flushPara();
                (list = list || []).push(line.replace(/^[-*]\s+/, ''));
            } else {
                flushList(); para.push(line);
            }
        }
        flushPara(); flushList();
        return out.join('\n');
    }

    function dateWords(iso) {
        const d = new Date(iso + 'T12:00:00Z');
        if (isNaN(d)) return iso || '';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    }

    const api = { escapeHtml, parseStory, renderStory, inline, dateWords };
    if (typeof module === 'object' && module.exports) { module.exports = api; return; }
    root.dynaStories = api;

    // ---- The page --------------------------------------------------------------------------
    const reader = document.getElementById('storyReader');
    const links = Array.from(document.querySelectorAll('[data-story]'));
    if (!reader || !links.length) return;
    const slugs = links.map(a => a.dataset.story);
    const cache = new Map();
    let open = null;

    function load(slug) {
        if (!cache.has(slug)) {
            cache.set(slug, fetch('stories/' + slug + '.md').then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            }).then(parseStory).catch(err => { cache.delete(slug); throw err; }));
        }
        return cache.get(slug);
    }

    function mark(slug) {
        for (const a of links) {
            const on = a.dataset.story === slug;
            a.setAttribute('aria-expanded', on ? 'true' : 'false');
            a.closest('.use-case')?.classList.toggle('reading', on);
        }
    }

    function close(focusCard) {
        const was = open;
        open = null;
        reader.hidden = true;
        reader.innerHTML = '';
        mark(null);
        if (location.hash.startsWith('#story-')) history.replaceState(null, '', location.pathname + location.search + '#scenarios');
        if (focusCard && was) links.find(a => a.dataset.story === was)?.focus();
    }

    async function show(slug, how) {
        const link = links.find(a => a.dataset.story === slug);
        if (!link) return;
        open = slug;
        mark(slug);
        reader.hidden = false;
        reader.setAttribute('aria-busy', 'true');
        reader.innerHTML = '<p class="story-wait">Opening the story…</p>';
        if (how !== 'arrival') history.replaceState(null, '', '#story-' + slug);
        let story;
        try { story = await load(slug); }
        catch (err) {
            if (open !== slug) return;
            reader.removeAttribute('aria-busy');
            reader.innerHTML = '<p class="story-wait">This story could not be opened here (' + escapeHtml(String(err.message || err)) +
                '). <a href="' + escapeHtml(link.href) + '" target="_blank" rel="noopener">Read it on Substack</a>.</p>';
            return;
        }
        if (open !== slug) return;
        const { meta, body } = story;
        const i = slugs.indexOf(slug);
        const prev = slugs[(i - 1 + slugs.length) % slugs.length], next = slugs[(i + 1) % slugs.length];
        const nameOf = (s) => links.find(a => a.dataset.story === s)?.closest('.use-case')?.querySelector('h4')?.textContent || s;
        reader.innerHTML =
            '<header class="story-head">' +
                '<p class="story-kicker">' + escapeHtml(meta.scenario || nameOf(slug)) + '</p>' +
                '<h3 id="story-title" tabindex="-1">' + escapeHtml(meta.title || '') + (meta.subtitle ? ': <span>' + escapeHtml(meta.subtitle) + '</span>' : '') + '</h3>' +
                '<p class="story-meta">A scenario, written as fiction · first published ' + escapeHtml(dateWords(meta.published)) +
                    (meta.original ? ' on <a href="' + escapeHtml(meta.original) + '" target="_blank" rel="noopener">Substack</a>' : '') +
                    (meta.note ? '<span class="story-note">' + escapeHtml(meta.note) + '</span>' : '') + '</p>' +
                '<button type="button" class="story-close" aria-label="Close the story">close ×</button>' +
            '</header>' +
            '<div class="story-body">' + renderStory(body, 4) + '</div>' +
            '<div class="story-nav" role="navigation" aria-label="More stories">' +
                '<button type="button" data-go="' + escapeHtml(prev) + '">← ' + escapeHtml(nameOf(prev)) + '</button>' +
                '<button type="button" data-go="' + escapeHtml(next) + '">' + escapeHtml(nameOf(next)) + ' →</button>' +
            '</div>';
        reader.removeAttribute('aria-busy');
        reader.setAttribute('aria-labelledby', 'story-title');
        // The focus first: focusing during a smooth scroll stops the scroll where it is.
        if (how === 'click' || how === 'nav') reader.querySelector('h3')?.focus({ preventScroll: true });
        // A card's click glides down to its story; anything else jumps ('auto' would follow the page's
        // own `scroll-behavior: smooth`, and a long glide back up a replaced story lands short).
        reader.scrollIntoView({ behavior: how === 'click' ? 'smooth' : 'instant', block: 'start' });
        // Arriving by a link, the figures above are still loading and move it down.
        if (how === 'arrival' && document.readyState !== 'complete') {
            window.addEventListener('load', () => { if (open === slug) reader.scrollIntoView({ behavior: 'instant', block: 'start' }); }, { once: true });
        }
        root.dynaCount?.('story/' + slug);
    }

    for (const a of links) {
        a.setAttribute('aria-controls', 'storyReader');
        a.setAttribute('aria-expanded', 'false');
        a.addEventListener('click', (e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;  // a new tab is the original's
            e.preventDefault();
            if (open === a.dataset.story) close(false); else show(a.dataset.story, 'click');
        });
    }
    reader.addEventListener('click', (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('story-close')) close(true);
        else if (t.dataset.go) show(t.dataset.go, 'nav');
    });
    reader.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(true); });

    function arrive() {
        const m = location.hash.match(/^#story-([a-z0-9-]+)$/);
        if (m && slugs.includes(m[1])) show(m[1], 'arrival');
    }
    window.addEventListener('hashchange', arrive);
    arrive();
})(typeof window !== 'undefined' ? window : globalThis);
