// The specimen's golden (V1-SPEC KN3a). brand/colour-space.html carried the whole colour space as one module
// when John saw it on 2 October; core/src/colour/ is that module ported, and it must say what the specimen said:
// the same hues to 1e-6, the same hexes, the same sentences, the same patterns. fixtures/specimen.golden.json is
// the specimen run (test/make-golden.mjs): the seed John's three kinds and the spec's family, kin and opposites
// make, the page's own examples after it, a chain deeper than the two depths drawn, and seeded random boards.
//
// Where core knowingly differs the golden says so and this test holds only what is still the same:
//   - the specimen has five patterns and repeats the last without saying; core has eight and says. A board marked
//     `overflow` is held to its colours, and to its overflowing kinds taking a pattern the specimen had not;
//   - the specimen reported a colour's contrast before the byte was rounded; core reports what is drawn, so the
//     number may differ in the second decimal (never below 4.5 where the specimen's drawn colour was).
import { describe, it, expect, beforeAll } from 'vitest';
import GOLDEN from './fixtures/specimen.golden.json';
import { emptyLens, applyAct, kindsOf, type Lens, type KindAct } from './harmony';
import { colourOf, DEFAULT_PALETTE, OFFERED_SHARE, WORDS_CONTRAST, DEPTHS_DRAWN, type Ground } from './scale';
import { distinctness, channels, CHANNELS, LOOK_ALIKE, VISIONS, type KindChannel } from './access';
import { meaning } from './meaning';
import { readPhrase } from './test/phrases';

interface Row {
  name: string; hue: number; depth: number; source: string;
  hex: Record<Ground, { said: string; offered: string }>;
  channel: string;
  full?: GoldenKind;
}
interface GoldenKind {
  name: string; hue: number; depth: number; source: string; order: number; parent: string | null; anchor: string | null; offset: number; rel: string | null; word?: string;
  paper: { said: { hex: string; contrast: number; moved: number }; offered: { hex: string; contrast: number; moved: number } };
  dark: { said: { hex: string; contrast: number; moved: number }; offered: { hex: string; contrast: number; moved: number } };
  channel: { channel: string; alike: string | null; who: string[] };
}
type Scenario = (typeof GOLDEN.scenarios)[number];

/** A board’s kinds as one shape, whether the golden wrote them in full or as a row. */
function rowsOf(sc: Scenario): Row[] {
  return (sc.kinds as unknown[]).map(k => {
    if (Array.isArray(k)) {
      const [name, hue, depth, source, ps, po, ds, dof, channel] = k as [string, number, number, string, string, string, string, string, string];
      return { name, hue, depth, source, hex: { paper: { said: ps, offered: po }, dark: { said: ds, offered: dof } }, channel };
    }
    const f = k as GoldenKind;
    return { name: f.name, hue: f.hue, depth: f.depth, source: f.source, hex: { paper: { said: f.paper.said.hex, offered: f.paper.offered.hex }, dark: { said: f.dark.said.hex, offered: f.dark.offered.hex } }, channel: f.channel.channel, full: f };
  });
}

describe('the specimen’s golden', () => {
  it('was run with the palette and the numbers core carries', () => {
    const { grounds, signals } = GOLDEN.palette;
    for (const g of ['paper', 'dark'] as const) {
      const mine = DEFAULT_PALETTE.grounds[g];
      expect({ ground: mine.ground, ink: mine.ink, L: [...mine.L], C: mine.C, toward: mine.toward }).toEqual(grounds[g]);
    }
    expect(DEFAULT_PALETTE.signals.map(s => ({ name: s.name, hex: s.hex }))).toEqual(signals.map(s => ({ name: s.name, hex: s.hex })));
    DEFAULT_PALETTE.signals.forEach((s, i) => expect(Math.abs(s.hue - signals[i].hue)).toBeLessThan(1e-9));
    const c = GOLDEN.constants;
    expect([OFFERED_SHARE, WORDS_CONTRAST, LOOK_ALIKE, DEPTHS_DRAWN]).toEqual([c.OFFERED, c.FLOOR, c.APART, c.DEPTHS]);
    expect([...CHANNELS].slice(0, c.CHANNELS.length)).toEqual(c.CHANNELS);
  });

  it('is many boards, and the seed first', () => {
    expect(GOLDEN.scenarios.length).toBeGreaterThanOrEqual(30);
    expect(GOLDEN.scenarios[0].name).toBe('seed');
    expect(GOLDEN.scenarios[0].acts.map(a => (a as { text: string }).text)).toEqual([
      "it's an idea · purple", "it's a task", "it's a note",
      'insight is a kind of idea', 'hunch is a kind of idea', 'question is kin to idea', 'assumption opposes evidence',
    ]);
  });

  for (const sc of GOLDEN.scenarios) {
    describe(sc.name, () => {
      const overflow = (sc as { overflow: string[] }).overflow;
      const lens: Lens = emptyLens();
      const said: string[] = [];
      let pairs: ReturnType<typeof distinctness>;
      let ch: Map<string, KindChannel>;
      let lines: string[];

      beforeAll(() => {
        for (const a of sc.acts as { act: KindAct }[]) said.push(applyAct(lens, a.act).said);
        pairs = distinctness(kindsOf(lens));
        ch = channels(kindsOf(lens), pairs);
        lines = meaning(lens, pairs);
      });

      it('reads the sentences the way the specimen read them', () => {
        for (const a of sc.acts as { text?: string; act: KindAct }[]) if (a.text !== undefined) expect(readPhrase(a.text), a.text).toEqual(a.act);
      });

      it('answers each act as the specimen did', () => {
        expect(said).toEqual((sc.acts as { answer: string }[]).map(a => a.answer));
      });

      it('holds each kind’s hue to 1e-6, and its depth and how it was chosen', () => {
        const ks = kindsOf(lens), rows = rowsOf(sc);
        expect(ks.map(k => k.name)).toEqual(rows.map(r => r.name));
        ks.forEach((k, i) => {
          expect(Math.abs(k.hue - rows[i].hue), `${k.name} hue ${k.hue} against ${rows[i].hue}`).toBeLessThan(1e-6);
          expect(k.depth, `${k.name} depth`).toBe(rows[i].depth);
          expect(k.source, `${k.name} source`).toBe(rows[i].source);
        });
      });

      it('draws each kind in the specimen’s hexes, said and offered, on both grounds', () => {
        const ks = kindsOf(lens), rows = rowsOf(sc);
        ks.forEach((k, i) => {
          for (const g of ['paper', 'dark'] as const) {
            expect(colourOf(k, g).hex, `${k.name} ${g} said`).toBe(rows[i].hex[g].said);
            expect(colourOf(k, g, 'offered').hex, `${k.name} ${g} offered`).toBe(rows[i].hex[g].offered);
          }
        });
      });

      it('reports the lightness moved to read as the specimen did, and a contrast within what a byte rounds', () => {
        const full = rowsOf(sc).filter(r => r.full);
        if (!full.length) return;
        for (const r of full) {
          const k = lens.kinds.get(r.name)!;
          for (const g of ['paper', 'dark'] as const) for (const cert of ['said', 'offered'] as const) {
            const mine = colourOf(k, g, cert), theirs = r.full![g][cert];
            expect(mine.moved, `${r.name} ${g} ${cert} moved`).toBe(theirs.moved);
            expect(Math.abs(mine.contrast - theirs.contrast), `${r.name} ${g} ${cert} contrast`).toBeLessThan(0.05);
            expect(mine.contrast).toBeGreaterThanOrEqual(WORDS_CONTRAST);
          }
        }
      });

      if (overflow.length) {
        it('where the specimen ran out of patterns, gives the first kind it repeated a pattern past its five and repeats none', () => {
          // The kinds after the first only ran out in the specimen because the first repeated one: with a pattern of its own it leaves them room.
          expect(CHANNELS.indexOf(ch.get(overflow[0])!.channel), `${overflow[0]} takes a pattern past the specimen’s five`).toBeGreaterThanOrEqual(5);
          for (const k of kindsOf(lens)) expect(ch.get(k.name)!.repeats, k.name).toBe(false);
        });
      } else {
        it('puts the second channels where the specimen put them, with whom each looks alike to', () => {
          const rows = rowsOf(sc);
          for (const r of rows) {
            const mine = ch.get(r.name)!;
            expect(mine.channel, `${r.name} pattern`).toBe(r.channel);
            if (r.full) {
              expect(mine.alike, `${r.name} beside`).toBe(r.full.channel.alike);
              expect(mine.who, `${r.name} who`).toEqual(r.full.channel.who);
            }
          }
        });

        it('says what the colours mean in the specimen’s words', () => {
          expect(lines).toEqual((sc as { meaning: string[] }).meaning);
        });
      }

      if ((sc as { pairs?: unknown[] }).pairs) {
        it('measures every pair under every way of seeing as the specimen did', () => {
          const golden = (sc as unknown as { pairs: { a: string; b: string; by: Record<string, number>; min: number }[] }).pairs;
          expect(pairs.map(p => [p.a, p.b])).toEqual(golden.map(p => [p.a, p.b]));
          pairs.forEach((p, i) => {
            for (const v of VISIONS) expect(Math.abs(p.by[v] - golden[i].by[v]), `${p.a}/${p.b} ${v}`).toBeLessThan(1e-9);
            expect(Math.abs(p.min - golden[i].min)).toBeLessThan(1e-9);
          });
        });
      }
    });
  }
});
