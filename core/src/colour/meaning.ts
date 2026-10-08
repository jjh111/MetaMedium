// What the colours on a board mean, in words (V1-SPEC KN3a). Because relations between kinds are kept in the hues,
// the engine can say them back: *ideas and insights are one family; assumption and evidence are drawn as opposites*.
// This is the reading the lens pane shows and Claude's look reads, derived from the lens and the palette and never
// logged. The sentences are the specimen's own, in the order it said them: families, then each relation, then the
// kinds that stand apart, then a colour the person gave that stands by one the chrome keeps, then the second
// channels. A relation that was said but whose colours do not show it is said as that, never as true.
//
// One line is new. The specimen gave the last pattern to every kind it had run out for and said it as it said any
// other; here a kind that had to repeat a pattern says so, and says that beside the kind it looks alike to it cannot
// be told apart by colour or by pattern. Said plainly, as the spec asks: nothing is refused and lightness is not spent.
import { hueDistance } from './oklch';
import { distinctness, channels, CHANNELS, type KindPair } from './access';
import { DEFAULT_PALETTE } from './scale';
import type { Palette } from './scale';
import { kindsOf, type Lens } from './harmony';

/** Kin whose hues stand this near read as kin, and opposites this far apart as opposites. */
const KIN_READS = 50;
const OPPOSITES_READ = 140;
/** A colour the person gave stands by one the chrome keeps when its hue is this near. */
const SIGNAL_NEAR = 14;

const list = (xs: readonly string[]): string => xs.join(', ').replace(/, ([^,]*)$/, ' and $1');

/** The sentences the board says about its colours. Empty when there are no kinds. */
export function meaning(lens: Lens, pairs?: readonly KindPair[], palette: Palette = DEFAULT_PALETTE): string[] {
  const ks = kindsOf(lens);
  const measured = pairs ?? distinctness(ks, palette);
  const lines: string[] = [];

  const rootOf = (k: (typeof ks)[number]): string => {
    const seen = new Set<string>();
    while (k.parent && !seen.has(k.name)) { seen.add(k.name); k = lens.kinds.get(k.parent) || k; }
    return k.name;
  };
  for (const root of ks.filter(k => !k.parent)) {
    const fam = ks.filter(k => k.parent && rootOf(k) === root.name).sort((x, y) => x.depth - y.depth || x.order - y.order);
    if (!fam.length) continue;
    const own = fam.filter(k => k.source === 'said').map(k => `${k.name} keeps your ${k.word}`);
    lines.push(`${list([root.name, ...fam.map(k => k.name)])} are one family: ${root.name}'s hue, each kind below it a step toward the ground` + (own.length ? ` (${list(own)})` : ''));
  }

  for (const r of lens.rels) {
    const A = lens.kinds.get(r.a), B = lens.kinds.get(r.b);
    if (!A || !B) continue;
    const d = Math.round(hueDistance(A.hue, B.hue));
    if (r.rel === 'kin') lines.push(d <= KIN_READS ? `${r.a} stands beside ${r.b}, ${d}° along the wheel: kin` : `${r.a} and ${r.b} are said to be kin, but your colours stand ${d}° apart`);
    else lines.push(d >= OPPOSITES_READ ? `${r.a} and ${r.b} are drawn as opposites, ${d}° apart` : `${r.a} and ${r.b} are said to oppose, but your colours stand ${d}° apart`);
  }

  const tied = new Set<string>();
  for (const k of ks) if (k.parent) { tied.add(k.name); tied.add(k.parent); }
  for (const r of lens.rels) { tied.add(r.a); tied.add(r.b); }
  const alone = ks.filter(k => !tied.has(k.name));
  if (alone.length && ks.length > 1) lines.push(`${list(alone.map(k => k.name))} ${alone.length > 1 ? 'stand' : 'stands'} apart from the rest`);

  for (const k of ks) {
    const s = palette.signals.find(x => hueDistance(x.hue, k.hue) < SIGNAL_NEAR);
    if (s && k.source === 'said') lines.push(`${k.name}'s ${k.word} stands near the chrome's colour for ${s.name}: on the ink it means ${k.name}, and the chrome's colours never touch the ink`);
  }

  const ch = channels(ks, measured, palette);
  for (const k of ks) {
    const c = ch.get(k.name)!;
    if (c.repeats) {
      lines.push(`${k.name} is drawn ${c.channel}, which a kind it looks alike to already holds: all ${CHANNELS.length} patterns are in use, so beside ${c.alike} it looks alike in colour and in pattern to ${list(c.who)}`);
    } else if (c.channel !== 'solid') {
      lines.push(`${k.name} is drawn ${c.channel}: beside ${c.alike} it looks alike to ${list(c.who)}`);
    }
  }
  return lines;
}
