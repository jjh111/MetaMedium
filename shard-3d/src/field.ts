// ===== field =====
// One input, one reader (§7, and SURFACE-v9 §6 ported).
//
// Everything typed goes through `readField`, which returns WHAT ENTER WILL DO
// and says it under the text as it is typed. The reader is pure and knows
// nothing about the DOM: it is handed the verbs this selection has, with the
// reason each one is or is not afforded, and it matches text against them.
// That is the shape the reference surface's field has, ported rather than
// forked — and it is why a verb that needs a mark nobody has drawn yet says
// so in the reading line instead of guessing a depth.
//
// P2's verbs are the tier 1 ones: extrude, revolve, remove, undo, and `name:`.
// P3 adds the rest of tier 1: cut, boss, mirror, dup. P4 adds the two the diff
// affords — *Add it* and *Take it off* — which are tier 1 like the rest and
// carry no dot. `regen`, `make 3d` and `turn into` arrive with their packages.

import { pill } from './ui';
import { describePhrase, isUnread, readPhrase, type PhraseReading, type PhraseScope } from './verbs';

export type FieldVerb =
  | 'extrude'
  | 'revolve'
  | 'cut'
  | 'boss'
  | 'add'
  | 'takeoff'
  | 'mirror'
  | 'dup'
  | 'remove'
  | 'regen'
  | 'take'
  // P6: the library. `place` stands a definition where a profile was drawn
  // again; `reject` is *Not a mug* — the correction that makes a wrong match
  // stay corrected.
  | 'place'
  | 'reject'
  | 'undo';

/** A verb as the surface offers it: whether this selection has it, and why. */
export interface VerbOffer {
  verb: FieldVerb;
  /** What the pill says. */
  label: string;
  enabled: boolean;
  /** The reason, afforded or not — the pill's tooltip, and the reading line when it is not. */
  why: string;
  run: () => void;
}

/** The ways each verb is said. One table, so an alias is added here and nowhere else. */
export const ALIASES: Record<FieldVerb, string[]> = {
  extrude: ['extrude', 'grow', 'stand it up'],
  revolve: ['revolve', 'turn', 'lathe', 'spin'],
  cut: ['cut', 'cut a hole', 'hole', 'bore', 'drill', 'pocket'],
  boss: ['boss', 'raise a boss', 'raise', 'emboss', 'pad', 'stand it proud'],
  // P4: the diff resolved. Said the way a hand says it about a drawing, not
  // about a solid — *add it* is about the material the profile asked for.
  add: ['add it', 'add', 'add the missing', 'fill it in', 'make it match'],
  takeoff: ['take it off', 'take off', 'remove the extra', 'trim it', 'shave it'],
  mirror: ['mirror', 'reflect', 'flip it'],
  dup: ['dup', 'duplicate', 'copy', 'another'],
  remove: ['remove', 'erase', 'delete', 'drop'],
  // P5: the two the generator seat affords. `regen` carries a dot — it asks a
  // model — and `take` does not, because taking a version is the human's own act.
  regen: ['regen', 'regenerate', 'again', 'try again', 'redo'],
  take: ['take it', 'take', 'keep it', 'keep', 'accept'],
  // P6: both tier 1. Placing is arithmetic on two outlines; correcting is the
  // hand saying what a thing is not, which no model is asked about either.
  place: ['place', 'place it', 'put it', 'stamp', 'another one'],
  reject: ['not it', 'not that', 'no', 'wrong'],
  undo: ['undo', 'back'],
};

export interface FieldReading {
  kind: 'empty' | 'verb' | 'name' | 'blocked' | 'unknown' | 'phrase' | 'definition' | 'brief';
  line: string;
  /** Null when Enter would do nothing — the line says why. */
  run: (() => void) | null;
  /** True when the line is a standing hint rather than an offer. */
  quiet?: boolean;
  verb?: FieldVerb;
  /** True when Enter would ask a model — what the dot on a pill means, said in words. */
  asks?: boolean;
}

/** A name the library or the tree already holds — what a typed word completes from. */
export interface KnownName {
  name: string;
  /** *a definition, based on castle* — or *a step of castle*. */
  what: string;
  run(): void;
}

export interface FieldContext {
  verbs: VerbOffer[];
  /** Whether there is something to name, and what naming it does. */
  nameable: { what: string; run: (name: string) => void } | null;
  /** P5: the names in play — a typed word completes from these before any model is asked. */
  names?: KnownName[];
  /** P5: the verb table over names, with the names and the taught sayings handed in. */
  phrases?: { scope: PhraseScope; run(r: PhraseReading): void; ask(text: string): void; model: string | null };
  /**
   * P5: a brief goes to a model. `model` is null when none has joined, and then
   * Enter opens the pane rather than doing nothing — the escalation, made
   * visible, exactly as the canvas does it.
   */
  brief?: {
    model: string | null;
    run(text: string): void;
    openPane(): void;
    /**
     * G0: what a brief would find to fill — something already standing, the
     * drawing stood up first, or nothing at all. It is what the reading line
     * says before Enter, and it comes from `log.standFor()`, the one seam G1
     * widens to the sketch hull.
     */
    standing?: 'stands' | 'will-stand' | 'nothing';
  };
}

const NAME_PREFIX = /^(name)\s*:\s*(.*)$/i;

function verbFor(text: string, verbs: VerbOffer[]): VerbOffer | undefined {
  const t = text.trim().toLowerCase();
  return verbs.find((v) => v.label.toLowerCase() === t || ALIASES[v.verb].includes(t));
}

/**
 * What Enter will do. Never a guess: a verb the selection does not afford
 * comes back quiet, with the reason, and Enter does nothing.
 */
export function readField(text: string, ctx: FieldContext): FieldReading {
  const t = (text ?? '').trim();

  if (!t) {
    const first = ctx.verbs.find((v) => v.enabled);
    if (first) return { kind: 'verb', verb: first.verb, line: `↵ ${first.label} — ${first.why}`, run: first.run };
    const blocked = ctx.verbs.find((v) => !v.enabled);
    return {
      kind: 'empty',
      line: blocked ? blocked.why : 'draw a profile, then a line off its edge',
      run: null,
      quiet: true,
    };
  }

  const m = NAME_PREFIX.exec(t);
  if (m) {
    const rest = m[2].trim();
    if (!ctx.nameable) return { kind: 'blocked', line: 'nothing selected to name — tap a solid first', run: null, quiet: true };
    if (!rest) return { kind: 'name', line: '↵ name it… (type the name)', run: null, quiet: true };
    return {
      kind: 'name',
      line: `↵ name ${ctx.nameable.what} “${rest}” — yours, held in the log`,
      run: () => ctx.nameable!.run(rest),
    };
  }

  const verb = verbFor(t, ctx.verbs);
  if (verb && verb.enabled) return { kind: 'verb', verb: verb.verb, line: `↵ ${verb.label} — ${verb.why}`, run: verb.run };
  if (verb) return { kind: 'verb', verb: verb.verb, line: `${verb.label} — ${verb.why}`, run: null, quiet: true };

  // ---- P5, in the order a phrase becomes less specific ----------------------
  //
  // A NAME the library knows completes before any model is asked (§2.6 rule 3,
  // and v9 S5's `{"reuse": …}`); then the VERB TABLE over names, which is tier
  // 1 and instant; then the BRIEF, which is the only thing here that asks.

  const known = ctx.names?.find((n) => n.name.toLowerCase() === t.toLowerCase());
  if (known) {
    return {
      kind: 'definition',
      line: `↵ ${known.name} — ${known.what}`,
      run: known.run,
    };
  }

  if (ctx.phrases) {
    const r = readPhrase(t, ctx.phrases.scope);
    if (r && !isUnread(r)) {
      return {
        kind: 'phrase',
        line: `↵ ${describePhrase(r)} — ${r.reasoning}`,
        run: () => ctx.phrases!.run(r),
        ...(r.verb === 'regen' ? { asks: true } : {}),
      };
    }
    if (r) {
      // What the table cannot read is RETURNED, not dropped: the offer is to
      // ask a model which of the shard's own verbs it was, once, and to hold
      // the answer as a way of saying that verb.
      const model = ctx.phrases.model;
      return {
        kind: 'phrase',
        line: model
          ? `↵ ask ${model} what “${r.unread}” means — ${r.reasoning}`
          : `no model has joined, so “${r.unread}” cannot be asked about — ${r.reasoning}`,
        run: model ? () => ctx.phrases!.ask(r.unread) : null,
        asks: true,
        quiet: !model,
      };
    }
  }

  if (ctx.brief) {
    const model = ctx.brief.model;
    // G0: the line says WHICH of the three a brief will be, before Enter is
    // pressed — filling what already stands, standing the drawing up first, or
    // coming back with what is missing. The shard knows all three already; the
    // hand used to find out afterwards, from a sentence that then faded.
    const standing = ctx.brief.standing ?? 'stands';
    return {
      kind: 'brief',
      line: model
        ? standing === 'stands'
          ? `↵ a brief → asks ${model} — the massing is the extent and the reply is clipped to it`
          : standing === 'will-stand'
            ? `↵ a brief → asks ${model} — the massing stands first, and the reply is clipped to it`
            : `↵ a brief → asks ${model} — nothing stands to fill; it will say what is missing`
        : 'no model has joined — ↵ opens the model pane, and a brief needs one',
      run: model ? () => ctx.brief!.run(t) : () => ctx.brief!.openPane(),
      asks: true,
    };
  }

  return {
    kind: 'unknown',
    line: `nothing here reads “${t}” — try ${ctx.verbs.map((v) => v.label.toLowerCase()).join(', ')}, or name: …`,
    run: null,
    quiet: true,
  };
}

// ---- the field on screen ----------------------------------------------------

export interface Field {
  el: HTMLElement;
  /** Redraw the reading line and the pills against the context as it stands. */
  render(ctx: FieldContext): void;
  focus(): void;
  value(): string;
}

/**
 * The field lives at the foot of the panel for now, not at the pen tip: the
 * pen tip needs the selection's screen position, which is P1's business, and
 * a field that follows a solid around is not what P2 is proving. The READER
 * above is the part that will not move.
 */
export function createField(host: HTMLElement, onChange: () => void): Field {
  host.classList.add('field');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fieldInput';
  input.placeholder = 'a verb, or name: …';
  input.autocomplete = 'off';
  const line = document.createElement('div');
  line.className = 'fieldLine';
  const pills = document.createElement('div');
  pills.className = 'fieldPills';
  host.append(input, line, pills);

  let ctx: FieldContext = { verbs: [], nameable: null };

  input.addEventListener('input', () => onChange());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const r = readField(input.value, ctx);
      if (r.run) {
        input.value = '';
        r.run();
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Escape') {
      input.value = '';
      input.blur();
      onChange();
      return;
    }
    e.stopPropagation(); // the space's own keys are not for the field
  });

  function render(next: FieldContext) {
    ctx = next;
    const r = readField(input.value, ctx);
    line.textContent = r.line;
    line.classList.toggle('quiet', !!r.quiet);
    pills.innerHTML = '';
    for (const v of ctx.verbs) {
      pills.appendChild(
        pill(v.label, {
          why: v.why,
          disabled: !v.enabled,
          // A pill that asks a model carries a dot. `regen` is the only verb
          // here that does; everything else is tier 1 and instant.
          model: v.verb === 'regen',
          onclick: v.enabled ? () => { input.value = ''; v.run(); } : undefined,
        })
      );
    }
  }

  return { el: host, render, focus: () => input.focus(), value: () => input.value };
}
