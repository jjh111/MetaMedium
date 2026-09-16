// ===== field (the reader) =====
// Provides: the field's QUERY, pure — readFieldCommand (what Enter will do, as a named
//   command record), and the two matchers it stands on (verbFor, libraryMatch), plus
//   the prefix pattern (FIELD_PREFIXES).
// Uses: NOTHING. This fragment names no closure variable, touches no DOM, and asks the
//   session nothing. Everything it needs arrives in a FieldContext record; everything it
//   decides leaves as a FieldReading record. That is the whole point of it
//   (DIRECTOR-REVIEW-2026-09-15, SEAM-1): 09-palette.js is now the adapter — it builds
//   the context, renders the rows, and runs the command. Because this fragment stands
//   alone it loads on its own in Node, which is how it is tested:
//     node --test Demos/surface/09-field.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// WHAT USED TO BE REACHED THROUGH THE CLOSURE, AND IS NOW A PARAMETER
//   session.getState().summon            → ctx.open, ctx.revising
//   paletteItems + coreItems(s)          → ctx.items (label/verbs/certain/why/disabled only)
//   agents                               → ctx.models (the joined models' names)
//   libraryEntries(session.getState())   → ctx.library
//   s.artifacts + definitionOf(s, id)    → ctx.definition
//   MM.parseBehaviour / MM.describeBehaviour / MM.wordOf → ctx.behaviour
//   targetOf(sum, text)                  → ctx.target()
// And what used to be produced BY the closure — noteUse, session.bless, session.behave,
// askModelsAbout, runAsk, runDraw, runPrompt, applyLibrary, offerModel, withWork,
// render, selectionMarks, MM.LOCAL_PARTICIPANT — is now named in the returned command
// and performed by the adapter. The reader decides; it no longer acts.

  /**
   * @typedef {Object} FieldItem  one offer, as the reader needs to see it
   * @property {string} key         unique among ctx.items; how a command names it again
   * @property {string} label       what the pill says
   * @property {string[]} [verbs]   the aliases that type to it
   * @property {boolean} [certain]  a reading of these marks (the top row), not an affordance
   * @property {string} [why]       the tooltip; the reader quotes it when the offer is disabled
   * @property {boolean} [disabled] offered, but not available on this selection
   *
   * @typedef {Object} FieldContext  everything the reader is allowed to know
   * @property {string} text          what has been typed, untrimmed
   * @property {boolean} open         a summon stands; with none there is nothing to read
   * @property {boolean} revising     the summon is ink over a live artifact
   * @property {FieldItem[]} items    every offer, ranked, the core verbs last
   * @property {string[]} models      the joined models, by name
   * @property {{id:string,name:string}[]} library  what the library holds
   * @property {{id:string,name:string}|null} definition  the definition in the loop, if one
   * @property {{described:string,unparsed:string[],value:*}|null} behaviour
   *           what the verb table read in `text` at that definition; `value` is opaque here
   *           and travels back out in the command untouched
   * @property {function(): ('page'|'program')} target
   *           what a brief would build. A THUNK on purpose: reading the drawing's genre
   *           costs a pass over the marks, and most keystrokes settle on a verb, a name or
   *           a prefix long before the brief. Called at most once, and only on the branch
   *           that needs it.
   *
   * @typedef {Object} FieldCommand  what Enter will do, named rather than closed over
   * @property {'take'|'name'|'ask-what'|'ask'|'draw'|'build'|'library'|'behave'|'need-model'} do
   *
   * @typedef {Object} FieldReading  the reader's whole answer
   * @property {string} kind        empty|default|name|what|ask|draw|brief|structure|verb|library|behaviour|blocked|page|run|program|new
   * @property {string} line        the sentence under the field: what Enter will do
   * @property {boolean} [quiet]    said, but not as a promise — Enter does nothing
   * @property {FieldCommand|null} command
   */

  /** The acts a typed prefix names. */
  const FIELD_PREFIXES = /^(ask|draw|page|run|program|new|name|what)\s*:\s*([\s\S]*)$/i;

  /**
   * Pure: every offer, visible or hidden, that the typed text names — by an alias or by
   * the start of its label.
   * @param {string} q
   * @param {FieldItem[]} items
   * @returns {FieldItem|null}
   */
  function verbFor(q, items) {
    const ql = (q || '').toLowerCase().trim();
    if (!ql) return null;
    const all = items || [];
    let hit = all.find((i) => (i.verbs || []).some((v) => v === ql));
    if (hit) return hit;
    hit = all.find((i) => (i.verbs || []).some((v) => v.startsWith(ql) && ql.length >= 2)) || all.find((i) => i.label.toLowerCase().startsWith(ql) && ql.length >= 2);
    return hit || null;
  }

  /**
   * Pure: the library entry a brief already answers, if any — by name, or by every word
   * of the name being in the brief.
   * @param {string} brief
   * @param {{id:string,name:string}[]} entries
   * @returns {{id:string,name:string}|null}
   */
  function libraryMatch(brief, entries) {
    const q = (brief || '').toLowerCase().trim();
    if (q.length < 2) return null;
    const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    for (const e of entries || []) {
      const name = e.name.toLowerCase();
      if (name === q) return e;
      const nw = name.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      if (nw.length && nw.every((w) => words.includes(w))) return e;
    }
    return null;
  }

  /**
   * Pure: one reader for the field. What was typed, and what stands, in; what Enter will
   * do, out. It reads in the order the hand expects to be understood — a prefix it spelled
   * out, then a verb this selection has, then a name the library knows, then words a
   * definition can be told, and only then the brief — so the cheap, certain readings win
   * over the one that asks a model.
   * @param {FieldContext} ctx
   * @returns {FieldReading}
   */
  function readFieldCommand(ctx) {
    const c = ctx || {};
    const text = (c.text || '').trim();
    const items = c.items || [];
    const models = c.models || [];
    const who = models.join(', ');
    const revising = !!c.revising;

    if (!c.open) return { kind: 'empty', line: '', command: null };

    // Nothing typed: Enter takes the leading reading, if these marks have one.
    if (!text) {
      const first = items.find((i) => i.certain);
      if (first) return { kind: 'default', line: '↵ ' + first.label + ' — ' + String(first.why || '').split(' — ').pop(), command: take(first) };
      return { kind: 'empty', line: '', quiet: true, command: null };
    }

    // A prefix spells the act out, so nothing has to be guessed.
    const m = FIELD_PREFIXES.exec(text);
    if (m) {
      const act = m[1].toLowerCase(), rest = m[2].trim();
      if (act === 'name') {
        return rest
          ? { kind: 'name', line: '↵ name it “' + rest + '”', command: { do: 'name', name: rest } }
          : { kind: 'name', line: '↵ name it… (type the name)', quiet: true, command: null };
      }
      if (act === 'what') return models.length ? { kind: 'what', line: '↵ ask ' + who + ' what this is', command: { do: 'ask-what' } } : needsModel('reading the group');
      if (!models.length) return needsModel(act === 'ask' ? 'a question' : act === 'draw' ? 'drawing' : 'building');
      if (!rest) return { kind: act, line: '↵ ' + act + ':… (say what)', quiet: true, command: null };
      if (act === 'ask') return { kind: 'ask', line: '↵ ask ' + who, command: { do: 'ask', text: rest } };
      if (act === 'draw') return { kind: 'draw', line: '↵ ' + who + ' draws', command: { do: 'draw', text: rest } };
      if (act === 'page') return { kind: 'brief', line: '↵ ' + who + ' builds a page', command: build(text, revising) };
      if (act === 'new') return { kind: 'brief', line: '↵ ' + who + ' writes it fresh', command: build(text, revising) };
      return { kind: 'brief', line: '↵ ' + who + ' writes a program', command: build(text, revising) };
    }

    // A verb this selection has.
    const verb = verbFor(text, items);
    if (verb && !verb.disabled) return { kind: 'verb', line: '↵ ' + verb.label, command: take(verb) };
    if (verb && verb.disabled) return { kind: 'verb', line: '↵ ' + verb.label + ' — ' + (verb.why || ''), quiet: true, command: null };

    // A name the library knows: the same program, here, and no model asked.
    const entry = !revising ? libraryMatch(text, c.library) : null;
    if (entry) return { kind: 'library', line: '↵ ' + entry.name + ' — from the library, no model asked', command: { do: 'library', id: entry.id } };

    // Words a definition can be told, by the verb table.
    const def = c.definition, beh = c.behaviour;
    if (def && beh && beh.value) {
      const tail = beh.unparsed && beh.unparsed.length
        ? (models.length ? ' · ' + who + ' reads “' + beh.unparsed.join(', ') + '”' : ' · could not read “' + beh.unparsed.join(', ') + '”')
        : '';
      return {
        kind: 'behaviour', line: '↵ ' + def.name + ': ' + beh.described + tail,
        command: { do: 'behave', definitionId: def.id, behaviour: beh.value, words: text, ask: !!(beh.unparsed && beh.unparsed.length && models.length) },
      };
    }

    // The brief. Tier 1 builds the structure of a page or a diagram at once, with no
    // words; tier 2 — a model — writes the words, and a program.
    if (revising) return models.length ? { kind: 'brief', line: '↵ ' + who + ' changes what the loop covers', command: build(text, true) } : needsModel('changing a page');
    if ((c.target ? c.target() : 'program') === 'page') {
      return models.length
        ? { kind: 'brief', line: '↵ the structure at once (tier 1), then ' + who + ' writes the words', command: build(text, false) }
        : { kind: 'structure', line: '↵ the structure, at once (tier 1) — join a model for the words', command: build(text, false) };
    }
    if (!models.length) return needsModel('writing a program');
    return { kind: 'brief', line: '↵ ' + who + ' writes a program', command: build(text, false) };

    function take(item) { return { do: 'take', key: item.key, index: items.indexOf(item) }; }
    function build(t, rev) { return { do: 'build', text: t, revising: !!rev }; }
    function needsModel(what) {
      return { kind: 'blocked', line: '↵ ' + what + ' needs a model — controls › models', quiet: true, command: { do: 'need-model', what: what } };
    }
  }
