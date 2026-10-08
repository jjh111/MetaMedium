// The character references of XML and HTML text: the five named ones, `&nbsp;`, and numeric ones in decimal
// and hexadecimal. One home for the code that reads a page's words for Find (`extract.ts`) and the tokenizer that
// reads an SVG's attributes and text for the ink adapter (`ingest/xml.ts`).
//
// Anything else that looks like a reference is left as it was written: an unknown name is not an error in a
// file someone sent, and nothing here expands an entity a document declares for itself.

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    const r = ENTITIES[e.toLowerCase()];
    return r === undefined ? m : r;
  });
}
