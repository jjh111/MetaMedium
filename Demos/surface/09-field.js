// ===== field (the reader) =====
// Provides: the field's QUERY, pure — readFieldCommand (what Enter will do, as a named
//   command record), and the two matchers it stands on (verbFor, libraryMatch), plus
//   the prefix pattern (FIELD_PREFIXES), the sum (`= 24 ÷ 3`, read by readSum — DIRECTOR-PLAN-W2 M5)
//   notationWords (a notation's reading in the person's words, N1),
//   and typedWord (the word a typed text offers to name the selection with, or to label the
//   person's own ink with — V1-PLAN L2e), and
//   the words for another hand's marks a label will not go on (theirMarks, madeThese).
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
   * @property {boolean} [act]      an act Enter may take with nothing typed: an offer the row
   *                                 shows, or a reading whose taking acts rather than names (U1e)
   * @property {string} [enter]     what Enter does when this item leads, said in the line
   *                                 instead of "take it as the name" (W2: writing is read)
   * @property {*} [asks]           truthy when taking it asks a model: the line carries the dot
   * @property {string} [notation]  a reading of what the marks ARE as a diagram (a notation's id): a
   *                                 reading, but never a name — the line does not offer it as one (N1)
   *
   * @typedef {Object} FieldContext  everything the reader is allowed to know
   * @property {string} text          what has been typed, untrimmed
   * @property {boolean} open         a summon stands; with none there is nothing to read
   * @property {boolean} revising     the summon is ink over a live artifact
   * @property {FieldItem[]} items    every offer, ranked, the core verbs last
   * @property {string[]} models      the joined models, by name
   * @property {{id:string,name:string}[]} library  what the library holds
   * @property {{id:string,name:string}|null} definition  the definition in the loop, if one
   * @property {{mine:number,others:string[]}} [marks]
   *           the selection's ink: how many of its marks the person made, and who made each
   *           of the rest (a name per mark). A label goes on your own ink only; the reader
   *           says so before Enter. Absent means nothing is held to put a word on.
   * @property {{described:string,unparsed:string[],value:*}|null} behaviour
   *           what the verb table read in `text` at that definition; `value` is opaque here
   *           and travels back out in the command untouched
   * @property {function(): ('page'|'program')} target
   *           what a brief would build. A THUNK on purpose: reading the drawing's genre
   *           costs a pass over the marks, and most keystrokes settle on a verb, a name or
   *           a prefix long before the brief. Called at most once, and only on the branch
   *           that needs it.
   * @property {function(string): ({ok:true,words:string,result:string,also?:string}|{ok:false,reason:string})} [maths]
   *           what a sum typed after `=` comes to, read against the board's page by core
   *           (`evaluateTyped`): the words that would stand on the board and their result, or why
   *           not. A thunk too — the reader names nothing outside itself, and reads a sum only
   *           on the branch that needs one (M5).
   *
   * @typedef {Object} FieldCommand  what Enter will do, named rather than closed over
   * @property {'take'|'name'|'label'|'region'|'ask-what'|'ask'|'draw'|'build'|'library'|'behave'|'need-model'|'maths'} do
   *
   * @typedef {Object} FieldReading  the reader's whole answer
   * @property {string} kind        empty|default|name|label|what|ask|draw|brief|structure|verb|library|behaviour|blocked|page|run|program|new
   * @property {string} line        the sentence under the field: what Enter will do
   * @property {boolean} [quiet]    said, but not as a promise — Enter does nothing
   * @property {boolean} [model]    Enter asks a model: the line carries the dot
   * @property {FieldCommand|null} command
   */

  /** The acts a typed prefix names. */
  const FIELD_PREFIXES = /^(ask|draw|page|run|program|new|name|what|label|region)\s*:\s*([\s\S]*)$/i;
  /** The same acts typed bare, before their colon: a command half-typed, never a word to put on marks. */
  const PREFIX_WORDS = /^(ask|draw|page|run|program|new|name|what|label|region)$/i;
  /** A sum: `=` and what follows, spaced or not (`= 24 ÷ 3`, `=(39+6)/2`). */
  const SUM = /^=\s*([\s\S]*)$/;
  /** The longest word the row offers as a pill; a longer one is still taken by its prefix and Enter. */
  const WORD_MAX = 40;

  /**
   * Pure: who made the marks a label will not go on, in a few words. `others` holds one
   * name per mark, so the count is its length and each name is said once.
   * @param {string[]} others
   * @returns {{who:string,count:number}}
   */
  function makersOf(others) {
    const names = [];
    for (const n of others || []) if (names.indexOf(n) < 0) names.push(n);
    const who = names.length <= 1 ? (names[0] || 'another hand') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    return { who: who, count: (others || []).length };
  }
  /** Pure: "the mark fern made", "the 2 marks fern and qwen3 made" — the marks a label will not go on. */
  function theirMarks(others) {
    const m = makersOf(others);
    return (m.count === 1 ? 'the mark ' : 'the ' + m.count + ' marks ') + m.who + ' made';
  }
  /** Pure: "fern made this mark", "fern made these 3 marks" — when none of the held marks is yours. */
  function madeThese(others) {
    const m = makersOf(others);
    return m.who + (m.count === 1 ? ' made this mark' : ' made these ' + m.count + ' marks');
  }

  /**
   * Pure: a notation's reading, said in the person's words (V1-PLAN §3 Reading, N1). Core says a
   * reading in one line (`describeNotation`: "a UML class diagram 0.49 — three classes, one
   * composition"); the field shows its short name and number, the tooltip its sentence, and the
   * panel *is* the two joined by a colon. A person says "a class diagram", never "UML".
   * @param {string} described  `MM.describeNotation(reading)`
   * @returns {{name:string, conf:string, label:string, said:string, is:string}}
   */
  function notationWords(described) {
    const cut = String(described || '').indexOf(' — ');
    const head = (cut < 0 ? String(described || '') : described.slice(0, cut)).replace(/^(an?) UML /, '$1 ');
    const said = cut < 0 ? '' : described.slice(cut + 3);
    const m = /^(.*\S)\s+(\d(?:\.\d+)?)$/.exec(head);
    const name = m ? m[1] : head, conf = m ? m[2] : '';
    return { name: name, conf: conf, label: conf ? name + ' ' + conf : name, said: said, is: said ? name + ': ' + said : name };
  }

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

    // Nothing typed: Enter takes the likely act — the first act in the ranked order, which is
    // the top the context holds steady (U1e; V1-PLAN §2.2) — never a reading as a name. A
    // reading is taken as the name by tapping it, or by `name:`. It used to be Enter's: the
    // default act on a drawing was to rename it after a category (audit row 4).
    if (!text) {
      const act = items.find((i) => i.act && !i.disabled);
      if (act) {
        // A reading whose taking acts says what it does (writing: read it, W2; as text, here).
        const line = '↵ ' + (act.enter || (act.certain ? act.label + ' — ' + String(act.why || '').split(' — ').pop() : act.label));
        const out = { kind: 'default', line: line, command: take(act) };
        if (act.asks) out.model = true;
        return out;
      }
      // A notation's reading (a flowchart, a class diagram) is what the marks are, not a name to give them:
      // with only such readings the line says a tap uses one, not that it names anything (N1).
      if (items.some((i) => i.certain && !i.notation)) return { kind: 'empty', line: '↵ nothing yet — tap a reading to take it as the name', quiet: true, command: null };
      if (items.some((i) => i.certain)) return { kind: 'empty', line: '↵ nothing yet — tap a reading to use it', quiet: true, command: null };
      return { kind: 'empty', line: '', quiet: true, command: null };
    }

    // A sum: `=` says the rest is arithmetic, read by core against the page — no model, and
    // nothing to guess. The line says the result before Enter; Enter stands it on the board.
    const sum = SUM.exec(text);
    if (sum) return readSum(sum[1].trim(), c);

    // A prefix spells the act out, so nothing has to be guessed.
    const m = FIELD_PREFIXES.exec(text);
    if (m) {
      const act = m[1].toLowerCase(), rest = m[2].trim();
      if (act === 'name') {
        return rest
          ? { kind: 'name', line: '↵ name it “' + rest + '”', command: { do: 'name', name: rest } }
          : { kind: 'name', line: '↵ name it… (type the name)', quiet: true, command: null };
      }
      // A word on your own ink (V1-PLAN L2e). Not a name: it blesses nothing, makes
      // nothing and never asks a model. It goes on each held mark the person made; the
      // line says before Enter which marks it will not go on, and whose they are.
      if (act === 'label') return readLabel(rest, c.marks);
      // A named place on the board (PLAN-IPAD-NOTES I5): a region made round what is held, or of the rectangle that holds the rest. Makes nothing else; asks no model.
      if (act === 'region') return readRegion(rest, c.marks);
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

  /**
   * Pure: `= 24 ÷ 3`, read by the thunk the adapter gives (core's `evaluateTyped`). Says the
   * result before Enter and what Enter does with it — the words, result and all, stand on the
   * board as text — or, quietly, why it cannot: nothing typed yet, or a sum core could not read.
   * The smallest honest act: a text is words the hand can edit, and it is a line of the page,
   * so its own check follows the measurements it names.
   * @param {string} body
   * @param {FieldContext} c
   * @returns {FieldReading}
   */
  function readSum(body, c) {
    if (!body) return { kind: 'maths', line: '↵ = … type a sum, like = 24 ÷ 3', quiet: true, command: null };
    if (typeof c.maths !== 'function') return { kind: 'maths', line: '↵ = … the maths is not here', quiet: true, command: null };
    const r = c.maths(body);
    if (!r || !r.ok) return { kind: 'maths', line: '↵ = ' + ((r && r.reason) || 'cannot read that as a sum'), quiet: true, command: null };
    return {
      kind: 'maths',
      line: '↵ ' + r.words + ' — put it on the board as text' + (r.also ? ' · or ' + r.also : ''),
      command: { do: 'maths', words: r.words },
    };
  }

  /**
   * Pure: `label: word`, read against the held ink. Three answers, each said before Enter:
   * the word on each of your marks; on yours and not on another hand's (named); or on
   * none, said quietly — and Enter still runs, so the adapter says the refusal in the
   * status line rather than leaving it to a line the hand may not have read.
   * @param {string} word
   * @param {{mine:number,others:string[]}} [marks]
   * @returns {FieldReading}
   */
  function readLabel(word, marks) {
    const ink = marks || {};
    const mine = ink.mine || 0, others = ink.others || [];
    if (!word) return { kind: 'label', line: '↵ label it… (type the word)', quiet: true, command: null };
    if (!mine && !others.length) return { kind: 'label', line: '↵ label… — nothing held to put it on', quiet: true, command: null };
    const command = { do: 'label', text: word };
    if (!mine) return { kind: 'label', quiet: true, command: command, line: '↵ no label — ' + madeThese(others) + '; a label goes on your own ink' };
    const tail = others.length
      ? ' — on ' + (mine === 1 ? 'yours' : 'your ' + mine) + ', not ' + theirMarks(others)
      : mine > 1 ? ' — on each of your ' + mine + ' marks' : '';
    return { kind: 'label', line: '↵ label it “' + word + '”' + tail, command: command };
  }

  /**
   * Pure: `region: Monday`, read against what is held: a named rectangle that holds whatever stands inside
   * it. Said before Enter: what will be made, or quietly why not.
   * @param {string} name
   * @param {{mine:number,others:string[]}} [marks]
   * @returns {FieldReading}
   */
  function readRegion(name, marks) {
    const ink = marks || {};
    const held = (ink.mine || 0) + (ink.others || []).length;
    if (!name) return { kind: 'region', line: '↵ region: … type the place\'s name', quiet: true, command: null };
    if (!held) return { kind: 'region', line: '↵ region… — nothing held to stand it round', quiet: true, command: null };
    return { kind: 'region', line: '↵ make a region “' + name + '” — round what is held; what stands inside goes with it', command: { do: 'region', name: name } };
  }

  /**
   * Pure: the word a typed text offers to put on the selection — to NAME it (one thing, a
   * definition) or to LABEL the person's own ink with it (a word on each mark; nothing
   * made) — or null (V1-PLAN L2e). The row shows those two offers side by side; this only
   * decides whether there is a word, and which. Enter is still the reader's to decide.
   *   `name: w` / `label: w`  → w: the hand said what the word is for;
   *   a bare word or two       → the text, unless it is a verb, a library entry, words a
   *                              definition can be told, or a prefix typed before its colon;
   *   anything else            → null — a brief, a question, a drawing.
   * @param {FieldContext} ctx
   * @returns {{word:string, act:('name'|'label'|null)}|null}
   */
  function typedWord(ctx) {
    const c = ctx || {};
    const text = (c.text || '').trim();
    if (!c.open || c.revising || !text) return null;
    if (SUM.test(text)) return null; // a sum is arithmetic, never a word
    const ink = c.marks || {};
    if (!((ink.mine || 0) + (ink.others || []).length)) return null;
    const m = FIELD_PREFIXES.exec(text);
    if (m) {
      const act = m[1].toLowerCase(), rest = m[2].trim();
      if ((act !== 'name' && act !== 'label') || !rest || rest.length > WORD_MAX || /\n/.test(rest)) return null;
      return { word: rest, act: act };
    }
    if (text.length > WORD_MAX || /[:\n]/.test(text) || text.split(/\s+/).length > 2 || PREFIX_WORDS.test(text)) return null;
    if (verbFor(text, c.items)) return null;
    if (libraryMatch(text, c.library)) return null;
    if (c.definition && c.behaviour && c.behaviour.value) return null;
    return { word: text, act: null };
  }
