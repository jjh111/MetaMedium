# The scenario stories

Four short pieces of fiction, one for each scenario card in the whitepaper's *Scenarios* section (`index.html`,
`#scenarios`). Each card's *Read the story ↓* opens its story in place under the cards; `#story-<slug>` links to one.

| File | Scenario | First published |
|---|---|---|
| `jake-vs-calculus.md` | Visual Learning | [Substack, 6 Dec 2025](https://johnhanacek.substack.com/p/a-day-with-metamedium-62d) |
| `bridge-builders.md` | Asymmetric Collaboration | [Substack, 6 Dec 2025](https://johnhanacek.substack.com/p/a-day-with-metamedium-96c) |
| `water-tank-project.md` | Rapid Prototyping | [Substack, 6 Dec 2025](https://johnhanacek.substack.com/p/a-day-with-metamedium) |
| `skyrmion-breakthrough.md` | Scientific Collaboration | [Substack, 6 Dec 2025](https://johnhanacek.substack.com/p/a-day-with-metamedium-147) |

**The text is the Substack text**, taken from Substack's public post API on 7 Oct 2026 and set as markdown. Three
changes, and only these: the product's name is dyna.ink where it was MetaMedium (lowercase *metamedium*, Kay's idea,
stays as written); the header image (the old whitepaper's hero) and the link back to the old whitepaper are left out,
because the reader is on the whitepaper; and one missing space is put back (*MetaMedium doesn't judge*, Bridge
Builders). The Substack posts stay as published, under their own title, *A Day With MetaMedium*, and each file's
front matter says so.

**These files are the source now.** Edit a story here; the page reads it when the card is opened.

- Front matter: `title`, `subtitle`, `scenario` (the card's heading), `published`, `original` (the Substack
  address), `note`.
- Body: the subset `reader.js` renders — `##` sections (set as the page's `h4`), paragraphs, `-` lists, `---`,
  `**strong**`, `*em*`, `[links](https://…)`. Anything else is shown as its text; HTML is escaped, never rendered.
- A card names its story by `data-story="<slug>"`, and its link stays the Substack original, so the card still works
  with no script and a modified click opens the original in a new tab.

`node --test stories/reader.test.mjs` holds the renderer, each file's front matter and the cards that name them.
