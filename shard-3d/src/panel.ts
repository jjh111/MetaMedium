// ===== panel =====
// What the shard says about a mark, in the four places a sentence may live
// (SURFACE-v9 §6.2, as far as P0 has them): the bar, the panel under it, and
// the status line. Nothing here explains the system; it reports on a mark.
//
// The rows, in the reference surface's own words: *mark*, *plane*, *reading*,
// *maths*, *measured*. The plane row is this shard's addition and it says the
// plane, its source, and WHY — a read plane is a reading like any other, and
// invariant 2 says every reading says why.
//
// **UI-2: the thing before its telemetry.** The panel used to open on mark
// ids, point counts, normals and fingerprints, and the thing you had actually
// selected was a screenful down. Those are the right numbers and the wrong
// order: a number is evidence FOR a claim, and the claim goes first. So the
// panel now LEADS with a compact semantic summary — what this is, what it
// could be, where it came from, what the next deliberate act would do, and
// what it becomes — and every measurement that was here stays here, one
// disclosure down under *why / measurements*. Nothing was discarded and no
// alternative was hidden; the order changed.

import { fingerprintOf, type Point } from 'metamedium-core';
import type { Diff, DiffRegion } from './diff';
import type { Log, Mark, ProfileOfSolid, Solid } from './log';
import type { Honours } from './brief';
import type { ProfileMatch } from './library';
import { depthsOf, describeStep, rootOf } from './op';
import { poseAngle, type Plane, type Pose } from './plane';
import { candidateNote } from './planarity';
import type { Sel } from './selection';
import { chip, esc, eyebrow, row, sep } from './ui';

export interface Panel {
  show(id: string | null, sel?: Sel | null): void;
  say(sentence: string): void;
  /** The standing hint when nothing has just happened. */
  stand(sentence: string): void;
  subject(): string | null;
}

/**
 * UI-2: who made a thing, TYPED — not guessed from a name and never assumed.
 *
 * `engine` is tier 1: the canvas answered and nothing waited. `model` is a
 * tier 2 proposal, attributed and unblessed until the hand takes it. `hand` is
 * the human's own act. The panel used to print *a model proposed it* for every
 * version the hand had not taken, so an engine-placed mug read `held · the
 * engine` and then claimed a model call that never happened. The three are
 * decided at the wiring, where the participant ids actually are.
 */
export type Origin = 'engine' | 'model' | 'hand';

/** Whose the newest version of a solid is. */
export interface VersionFacts {
  /** What to call them: *the engine*, *qwen3:8b*, *you*. */
  by: string;
  /** Whether the hand has taken it — the definitions are held. */
  taken: boolean;
  origin: Origin;
}

/** A definition, with the ancestry of the version it was taken from. */
export interface DefinitionFacts {
  name: string;
  basedOn: string;
  why: string;
  /** Who wrote the version this definition was taken out of. */
  by?: string;
  origin?: Origin;
}

/** UI-2: what Enter would do — the field's leading offer, said in the panel. */
export interface NextAct {
  label: string;
  why: string;
  enabled: boolean;
  /** True when it would ask a model. */
  asks?: boolean;
}

export interface PanelOptions {
  /** P5: how much of the drawing the selected body actually contains, per plane. */
  honours?(solidId: string): Honours | null;
  /** P5: whose the newest version is, and whether the hand has taken it. */
  version?(solidId: string): VersionFacts | null;
  /** P5: the definitions the library holds. */
  definitions?(): DefinitionFacts[];
  /** UI-2: who drew a mark — the hand, a model, or the engine. */
  author?(markId: string): { by: string; origin: Origin } | null;
  /** UI-2: the field's leading offer for what stands selected, in words. */
  next?(): NextAct | null;
  /** P6: what the library says a mark's outline could be, ranked. */
  matches?(markId: string): ProfileMatch[];
  /** Whether a mark's own view has been left, so the panel can say *faint from here*. */
  faded(id: string): boolean;
  /** Why a solid's derivation did not come off — the CSG seam's own words, or null. */
  broken?(id: string): string | null;
  /** P4: every plane a profile of this solid was drawn on, with the diff on it. */
  diffs?(solidId: string): { profile: ProfileOfSolid; diff: Diff }[];
  /** P4: outline a region where it lies while its chip is hovered, or take it away. */
  onRegion?(at: { plane: Plane; outline: Point[] } | null): void;
}

export function createPanel(host: HTMLElement, statusEl: HTMLElement, log: Log, o: PanelOptions): Panel {
  let current: string | null = null;
  let standing = 'tap a tile, then draw';

  function show(id: string | null, sel: Sel | null = null) {
    current = id;
    const mark = id ? log.markOf(id) : null;
    const solidRow = renderSolid(log, sel, o);

    // The evidence, exactly as it was — every row, every number, every reason.
    // It moved; nothing about it changed.
    const evidence = mark
      ? renderMark(mark, log, o.faded(mark.id)) + renderLibrary(mark.id) + solidRow
      : eyebrow('mark') +
        '<div class="empty">' + esc(log.marks().length ? 'hover a mark, or draw another' : 'nothing drawn yet') + '</div>' +
        solidRow;

    host.innerHTML =
      renderSummary(log, sel, mark, o) +
      '<details class="evidence"' + (evidenceOpen() ? ' open' : '') + '>' +
      '<summary>why / measurements</summary>' +
      '<div class="evidenceBody"></div>' +
      '</details>';

    const details = host.querySelector('details.evidence') as HTMLDetailsElement | null;
    const body = host.querySelector('.evidenceBody') as HTMLElement | null;
    if (body) {
      body.innerHTML = evidence;
      // The diff's region chips carry listeners, so they are built as elements
      // and appended — inside the disclosure, with the rest of the evidence.
      renderMatches(body, sel);
    }
    // Remembered per device, like the reference surface's *details ▾*: a hand
    // that wants the numbers wants them on the next mark too.
    if (details) details.addEventListener('toggle', () => setEvidenceOpen(details.open));
  }

  /**
   * P6: what the LIBRARY says this outline could be, under the shape readings
   * and in the engine's name.
   *
   * A definition's profiles are the outlines it was made from, so an outline
   * drawn again is matched against them — plurally, ranked, each with the
   * measurements it was scored on (invariant 2). It is tier 1: no model is
   * asked and nothing waits.
   */
  function renderLibrary(markId: string): string {
    const matches = o.matches?.(markId) ?? [];
    if (!matches.length) return '';
    let html = sep + eyebrow('could be', `${matches.length} in the library`);
    for (const m of matches) {
      html += row(
        m.name,
        m.score.toFixed(2),
        `${m.whole ? 'the whole of it' : `a part of ${m.basedOn}`}, matched against its profile ${m.profile.markId}: ${m.reasoning}`
      );
    }
    html += '<div class="why">' + esc(
      'the engine, tier 1 — a definition carries the fingerprints of the outlines it was made from, and this ' +
      'outline was measured against them. Take one and it is placed here, scaled to fit; *Not a …* says it is not, ' +
      'and the correction is held in the log'
    ) + '</div>';
    return html;
  }

  /**
   * *matches the drawing* — the diff, for every plane a profile of the selected
   * solid was drawn on (§4).
   *
   * This is `validateRegions` made visible: the promise that the thing matches
   * the drawing, checked and said out loud with a number and with the regions
   * that make it up. Each region is a CHIP, and hovering one outlines it where
   * it lies — a number is a claim, and the board has to be able to point at
   * what it is a claim about.
   */
  function renderMatches(el: HTMLElement, sel: Sel | null) {
    if (!sel || !o.diffs) return;
    const solid = sel.kind === 'solid' ? log.solidOf(sel.id) : log.solidFor(sel.id);
    if (!solid) return;
    const rows = o.diffs(solid.id);
    if (!rows.length) return;
    const head = document.createElement('div');
    head.innerHTML =
      sep + eyebrow('matches the drawing', `${rows.length} view${rows.length === 1 ? '' : 's'}`);
    el.appendChild(head);

    for (const r of rows) {
      const block = document.createElement('div');
      block.innerHTML =
        row(r.profile.view, `${(r.diff.coverage * 100).toFixed(0)}%`, r.diff.sentence) +
        row(
          'read from',
          r.diff.from === 'clean' ? 'the clean form' : 'the ink as drawn',
          r.diff.reasoning
        );
      el.appendChild(block);
      const box = document.createElement('div');
      box.className = 'fieldPills';
      const regions = [...r.diff.missing, ...r.diff.extra];
      if (!regions.length) {
        box.appendChild(
          chip('nothing missing · nothing extra', {
            why: `every square unit the ${r.profile.view} profile asks for is in the body, and the body has nothing the profile does not`,
          })
        );
      }
      for (const region of regions) box.appendChild(regionChip(r.profile, region));
      el.appendChild(box);
    }
  }

  function regionChip(profile: ProfileOfSolid, region: DiffRegion): HTMLElement {
    const c = chip(`${region.kind} · ${region.area.toFixed(2)} u² ${region.where}`, {
      cls: region.kind === 'missing' ? 'regionMissing' : 'regionExtra',
      why:
        region.kind === 'missing'
          ? `the ${profile.view} profile covers this and the body does not — *Add it* runs it through the body along that plane's normal`
          : `the body covers this and the ${profile.view} profile does not — *Take it off* cuts it out`,
    });
    if (o.onRegion) {
      c.addEventListener('mouseenter', () => o.onRegion!({ plane: profile.plane, outline: region.outline }));
      c.addEventListener('mouseleave', () => o.onRegion!(null));
      c.addEventListener('focus', () => o.onRegion!({ plane: profile.plane, outline: region.outline }));
      c.addEventListener('blur', () => o.onRegion!(null));
    }
    return c;
  }

  // *Pinned views* used to stand here. They moved to the navigation gizmo in
  // the corner (`navgizmo.ts`), beside *home* and the projection: every way of
  // moving the camera in one place. `pinnedViews` below is still read off the
  // log here, because that is where the log is read.

  // A said sentence gives way to the standing one after a moment, so the line
  // is never stale about what the board is. Scheduled by the saying, not by a
  // background interval — a timer that ticks forever when nothing has happened
  // is the kind of thing that keeps a page from ever going idle.
  let fade: ReturnType<typeof setTimeout> | null = null;

  function say(sentence: string) {
    statusEl.textContent = sentence;
    statusEl.classList.add('said');
    if (fade) clearTimeout(fade);
    fade = setTimeout(() => {
      fade = null;
      statusEl.classList.remove('said');
      statusEl.textContent = standing;
    }, 6000);
  }

  function stand(sentence: string) {
    standing = sentence;
    if (!statusEl.classList.contains('said')) statusEl.textContent = standing;
  }

  return { show, say, stand, subject: () => current };
}

// ---- UI-2: the summary, and the disclosure the evidence lives behind -------

const EVIDENCE_KEY = 'shard.evidence';

/** Whether the hand keeps the numbers open. A device preference, like *details ▾*. */
function evidenceOpen(): boolean {
  try {
    return localStorage.getItem(EVIDENCE_KEY) === 'open';
  } catch {
    return false; // a private window, or blocked site data: shut, and the panel still works
  }
}

function setEvidenceOpen(open: boolean) {
  try {
    localStorage.setItem(EVIDENCE_KEY, open ? 'open' : 'shut');
  } catch {
    /* nothing to remember it with — the disclosure still opens */
  }
}

const num = (n: number) => n.toFixed(2);

/**
 * **The summary**: what this is, what it could be, where it came from, what
 * the next deliberate act would do — then what it becomes.
 *
 * Five short rows, above everything, so that selecting a placed mug says
 * *mug*, *placed from mug, a definition qwen3:8b proposed and you took*, and
 * *↵ Cut a hole* before a single normal or point count. The subject is what
 * stands SELECTED when something does, and what is under the pointer when
 * nothing does — a hover is a question about a mark, and it is answered here
 * in the same shape.
 */
function renderSummary(log: Log, sel: Sel | null, hovered: Mark | null, o: PanelOptions): string {
  const solid = sel ? (sel.kind === 'solid' ? log.solidOf(sel.id) : log.solidFor(sel.id)) : null;
  const mark = sel?.kind === 'mark' ? log.markOf(sel.id) : hovered;

  if (!solid && !mark) {
    return (
      '<div class="summary">' +
      eyebrow('selected', 'nothing') +
      '<div class="empty">' +
      esc(
        log.marks().length
          ? 'tap a mark or a solid, or hover one — this row says what it is before it says what it measures'
          : 'choose a plane and draw a closed shape; a line off its edge stands it up'
      ) +
      '</div></div>'
    );
  }

  let html = '<div class="summary">' + eyebrow('selected', solid ? `solid · ${solid.id}` : `mark · ${mark!.id}`);

  // ---- what this is --------------------------------------------------------
  if (solid) {
    html += row(
      'what',
      solid.name,
      solid.named === 'human'
        ? 'yours — typed in the field'
        : "the engine's word for what it made, not a name anyone gave it"
    );
    if (solid.broken) {
      html += row('broken', 'this tree could not be read', solid.broken);
    }
  } else if (mark) {
    const top = mark.readings[0];
    html += row(
      'what',
      top ? `${top.label} ${num(top.weight || 0)}` : 'ink',
      top ? top.reasoning : 'the shape rung placed nothing here — it is still ink, and it is still on the board'
    );
  }

  // ---- what it could be ----------------------------------------------------
  const could: string[] = [];
  const whyCould: string[] = [];
  if (mark && !solid) {
    for (const r of mark.readings.slice(1, 4)) could.push(`${r.label} ${num(r.weight || 0)}`);
  }
  // The library's word for an outline, ranked — a name is a stronger candidate
  // than a shape, so it leads. A match that only repeats the name this thing
  // already carries is not an alternative, and is left out.
  const matchOn = solid
    ? solid.memberIds.map((id) => o.matches?.(id) ?? []).find((m) => m.length) ?? []
    : mark
      ? o.matches?.(mark.id) ?? []
      : [];
  for (const m of matchOn.slice(0, 3)) {
    if (solid && m.name === solid.name) continue;
    could.unshift(`${m.name} ${num(m.score)}`);
    whyCould.push(`${m.name}: ${m.reasoning}`);
  }
  if (could.length) {
    html += row(
      'could be',
      could.join(' · '),
      whyCould.length
        ? `the library, tier 1 — ${whyCould.join('; ')}`
        : 'every reading the shape rung held, ranked; nothing won by silencing the others'
    );
  }

  // ---- where it came from --------------------------------------------------
  const from = solid ? provenanceOf(solid, o) : mark ? authorOfMark(mark, o) : null;
  if (from) html += row('from', from.value, from.why);

  // ---- what the next deliberate act will do --------------------------------
  const next = o.next?.() ?? null;
  if (next) {
    // A blocked offer still names itself: its reason is what it would take,
    // and *nothing to do here yet* threw that away on the one board where a
    // hand most needs it — a first profile drawn, waiting for its extent.
    html += row(
      'next',
      next.enabled ? `↵ ${next.label}${next.asks ? ' · asks a model' : ''}` : `${next.label} — not yet`,
      next.why
    );
  }

  // ---- and what it becomes (the map of becoming, D6) -----------------------
  const becomes = becomesOf(log, solid, mark, matchOn, !!(solid && o.version?.(solid.id)?.taken));
  if (becomes) html += row('becomes', becomes.value, becomes.why);

  return html + '</div>' + sep;
}

/**
 * **Where a body came from, typed** (UI-2's verified bug).
 *
 * The version row used to print *a model proposed it and it is standing* for
 * every version the hand had not taken — so a mug the ENGINE placed, at tier 1,
 * with no model in the room, read `held · the engine` and then claimed a
 * proposal. The sentence now comes from the version's actual author and state.
 *
 * A PLACEMENT says two things at once, and they are two different facts: this
 * operation is the engine's own arithmetic on two outlines, and the definition
 * it reused has an ancestry of its own — a model may have written the tree the
 * hand then took. A reused model-authored definition therefore names both.
 */
function provenanceOf(solid: Solid, o: PanelOptions): { value: string; why: string } {
  const v = o.version?.(solid.id) ?? null;
  const root = rootOf(solid.tree);
  const definition = root && root.op === 'place' ? (root as { definition?: string }).definition ?? null : null;

  if (definition) {
    const def = (o.definitions?.() ?? []).find((d) => d.name === definition);
    const ancestry =
      !def || !def.origin || def.origin === 'hand'
        ? `a definition you took`
        : def.origin === 'model'
          ? `a definition ${def.by ?? 'a model'} proposed and you took`
          : `a definition the engine made and you took`;
    return {
      value: `placed from ${definition}, ${ancestry}`,
      // Short on purpose: the definition's own reason is a row of its own,
      // under *why / measurements*, and repeating it whole here buried the two
      // rows after it.
      why:
        `this placement is the engine's own arithmetic on two outlines — tier 1, and no model was asked for it; ` +
        `the ancestry named is the DEFINITION's, not this operation's` +
        (def && def.basedOn && def.basedOn !== definition ? `, and “${definition}” is based on ${def.basedOn}` : '') +
        (v?.taken ? ' · this body has been taken too, so its own parts are definitions' : ''),
    };
  }

  if (!v) {
    return {
      value: 'no version stands yet',
      why: 'nothing has been attached to this artifact as code — there is no author to name',
    };
  }

  if (v.taken) {
    const made =
      v.origin === 'engine'
        ? 'the engine made it at tier 1'
        : v.origin === 'model'
          ? `${v.by} wrote the version`
          : `${v.by} made it`;
    return {
      value: 'taken by you',
      why:
        `${made}, and the hand took it: the artifact carries the root step's name, and every named sub-tree ` +
        `is a definition based on the whole`,
    };
  }

  if (v.origin === 'model') {
    return {
      value: `proposed by ${v.by}, held`,
      why:
        'a tier 2 proposal, attributed and unblessed — *Take it* names the thing and holds its parts as ' +
        'definitions; until then it is standing, not settled',
    };
  }

  if (v.origin === 'hand') {
    return { value: `made by ${v.by}`, why: 'the hand\'s own act, blessed by the doing of it' };
  }

  return {
    value: 'made by the engine at tier 1',
    why: 'the canvas answered first — no model was asked and nothing waited',
  };
}

/** Who drew a mark: the hand, or a model through the same door (`agent.draw`). */
function authorOfMark(mark: Mark, o: PanelOptions): { value: string; why: string } {
  const a = o.author?.(mark.id) ?? null;
  const where = `on the ${mark.plane.name ?? mark.plane.source}`;
  if (!a || a.origin === 'hand') {
    return { value: `drawn by you ${where}`, why: mark.plane.why };
  }
  if (a.origin === 'model') {
    return {
      value: `drawn by ${a.by} ${where}`,
      why:
        'a model\'s profile goes in through the same door a hand\'s does — the same fingerprint, the same ' +
        'readings, the same eraser — declared content, so it is ink and never a gesture',
    };
  }
  return { value: `drawn by the engine ${where}`, why: mark.plane.why };
}

/**
 * **The map of becoming** (v10 D6, and §2 of the shard's plan): the rung this
 * selection is on, and the rung after it, in one line. Ink → a shape → a form
 * → an op tree → a solid → a definition, and each step of that ladder is a
 * deliberate act, so the row says what the act would be.
 */
function becomesOf(
  log: Log,
  solid: Solid | null,
  mark: Mark | null,
  matches: ProfileMatch[],
  taken: boolean
): { value: string; why: string } | null {
  if (solid) {
    if (solid.broken) {
      return {
        value: 'a tree that could not be read → nothing, until it is removed',
        why: 'its code is still in the log exactly as it arrived; the rest of the board draws and selects as it did',
      };
    }
    const root = rootOf(solid.tree);
    if (root && root.op === 'place') {
      const def = (root as { definition?: string }).definition;
      return {
        value: `a placement of ${def ?? 'a definition'} → a thing of its own`,
        why: 'it can be named, cut, mirrored and taken like any other body — a placement is not a copy inside somebody else\'s tree',
      };
    }
    if (taken) {
      return {
        value: 'a definition → placed again wherever its outline is drawn',
        why: 'the library holds it with the outlines it was made from, so drawing one of them again offers it back — tier 1, no model asked',
      };
    }
    return {
      value: 'a solid → a definition',
      why: 'take the version and its names are held with the outlines they were made from, so drawing one of those outlines again offers it back',
    };
  }
  if (!mark) return null;

  const held = log.solidFor(mark.id);
  if (held) {
    return {
      value: `ink in ${held.name} → the step it was made into`,
      why: 'it is still ink and it is still here — a mark a solid was made from is its provenance, not a loose profile',
    };
  }
  const form = log.formOf(mark.id);
  switch (form?.role) {
    case 'profile':
      return {
        value: matches.length
          ? `a profile → a solid, or ${matches[0].name} placed here`
          : 'a profile → a solid',
        why: 'draw a line off its edge, off its plane, and it stands up at tier 1; a line beside it in its own plane turns it instead',
      };
    case 'extent':
      return { value: 'an extent → how tall the solid stands', why: 'the depth is the drawing; no number here came from anywhere else' };
    case 'axis':
      return { value: 'an axis → what the profile turns about', why: 'a line in the profile\'s own plane, beside it — revolve sweeps around it' };
    case 'feature':
      return {
        value: 'a feature on a face → a hole, or a boss',
        why: 'the drawing does not say which intention it is, so both stand and the hand decides',
      };
    default:
      return {
        value: 'ink → a shape the form rung can place',
        why: 'no row of the form table placed this one; a closed outline on a plane is where the ladder starts',
      };
  }
}

/**
 * The *solid* row: what stands selected, and the op-tree step that made it.
 *
 * The step is the truth of the solid — the mesh is derived from it — so the
 * panel names the step, its number, and the strokes it came from, rather than
 * anything about the geometry that was rendered.
 */
function renderSolid(log: Log, sel: Sel | null, o: PanelOptions): string {
  const broken = o.broken;
  if (!sel) return '';
  const solid = sel.kind === 'solid' ? log.solidOf(sel.id) : log.solidFor(sel.id);
  if (!solid) {
    if (sel.kind !== 'mark') return '';
    return sep + eyebrow('solid', 'none') + '<div class="empty">' + esc('this mark is not part of a solid yet') + '</div>';
  }
  let html = sep + eyebrow('solid', solid.id);
  html += row(
    'name',
    solid.name,
    solid.named === 'human' ? 'yours — typed in the field' : "the engine's word for what it made, not a name anyone gave it"
  );
  // The tree, NESTED: `cut · through · from stroke:5` sits under the
  // `extrude · depth 2.40 u` it was cut into, because that is what the tree
  // says and a flat list of verbs would not.
  const depths = depthsOf(solid.tree);
  for (const step of solid.tree.steps) {
    const d = depths.get(step.id) ?? 0;
    const label = (d ? '↳ '.padStart(d * 2 + 2, ' ') : '') + step.op;
    // P5: a step's NAME and its material stand in the row, because a name is
    // what a verb binds to and a colour is what a word bound (§2.6 rule 2).
    const said =
      (step.name ? `“${step.name}” · ` : '') +
      (step.material?.colour ? `${step.material.colour} · ` : '') +
      describeStep(step).replace(step.op + ' · ', '');
    html += row(label, said, step.reasoning + (step.by ? ` — proposed by ${step.by}` : ''));
  }

  // ---- P5: how much of the drawing this body actually contains -------------
  // GRAPH-1 made each claim say which KIND it is and why it was measured the
  // way it was; the panel printed one sentence of its own over the top of that
  // and threw the per-claim reasons away. One line per claim now, naming the
  // kind, carrying the claim's own `why` — and the claims kept but deliberately
  // not counted stand under them, so nothing is dropped to flatter the number.
  const honours = o.honours?.(solid.id) ?? null;
  if (honours) {
    html += row(
      'honours',
      `${(honours.overall * 100).toFixed(0)}%`,
      `the mean over ${honours.per.length} claim${honours.per.length === 1 ? '' : 's'} this body is answering to`
    );
    for (const p of honours.per) {
      const kind =
        p.kind === 'source'
          ? `carried from ${p.of ?? 'the definition'}`
          : p.kind === 'revision'
            ? 'drawn since'
            : 'drawn here';
      html += row(
        `  ${p.view} · ${kind}`,
        `${(p.coverage * 100).toFixed(0)}%`,
        p.why ??
          `the ${p.view} profile ${p.markId}, re-rasterised against this body's silhouette on its own plane`
      );
      if (p.note) html += '<div class="why">' + esc(`expected to read low: ${p.note}`) + '</div>';
    }
    for (const said of honours.aside ?? []) {
      html += row('  not counted', '—', said);
    }
  }

  // ---- P5: whose version stands, and whether it has been taken -------------
  // UI-2's verified bug: this row printed the MODEL sentence for every version
  // the hand had not taken, so an engine-placed mug read `held · the engine`
  // and then claimed a proposal nobody had made. The sentence comes from the
  // version's own author and state now — the same typed provenance the summary
  // leads with, said here against the id it belongs to.
  const version = o.version?.(solid.id) ?? null;
  if (version) {
    const said = provenanceOf(solid, o);
    html += row('version', version.taken ? `taken · ${version.by}` : `held · ${version.by}`, said.why);
  }
  // DATA-1: a tree that would not READ and a tree that read and derived nothing
  // are two different facts, and saying the second about the first sends the
  // reader looking for a step that is not there. An unreadable artifact says
  // what the validator found, and says its code is still in the log.
  const unreadable = solid.broken ?? null;
  const why = unreadable ?? broken?.(solid.id) ?? null;
  if (unreadable) {
    html += row('broken', 'this tree could not be read', unreadable);
    html += '<div class="why">' + esc(
      'the code rep is still in the log exactly as it arrived — nothing was dropped and nothing was repaired; the ink it was made from is still on the board, and the rest of the board draws and selects as it did'
    ) + '</div>';
  } else if (why) {
    html += row('broken', 'the derivation did not come off', why);
    html += '<div class="why">' + esc(
      'the tree is still the truth of the thing — the body is what it was before this step, and the step is still in the log as the intent it is'
    ) + '</div>';
  }
  const byModel = solid.tree.steps.some((st) => st.by);
  html += row(
    'made by',
    byModel ? 'tier 1 + tier 2' : 'tier 1',
    byModel
      ? 'the canvas stood the massing up first and a model filled it — every step says which, and the engine\'s own clip has the last word'
      : 'the canvas answered first — no model was asked and nothing waited'
  );

  // ---- P5: the library ------------------------------------------------------
  const defs = o.definitions?.() ?? [];
  if (defs.length) {
    html += sep + eyebrow('definitions', String(defs.length));
    for (const d of defs) html += row(d.name, `based on ${d.basedOn}`, d.why);
  }
  return html;
}

/**
 * The distinct camera poses view ink was drawn from, newest first, with a
 * count. Two strokes drawn from the same orbit are one pinned view: the poses
 * are gathered by how far apart they look, which is the same tolerance that
 * decides sharp from faint.
 */
export function pinnedViews(log: Log): { pose: Pose; label: string; count: number }[] {
  const out: { pose: Pose; label: string; count: number }[] = [];
  for (const m of log.marks()) {
    if (m.plane.source !== 'view' || !m.pose) continue;
    const near = out.find((v) => poseAngle(v.pose, m.pose!) <= PINNED_SAME_DEG);
    if (near) near.count++;
    else out.push({ pose: m.pose, label: poseLabel(m.pose), count: 1 });
  }
  return out.reverse();
}

/** Two poses are the same pinned view within this many degrees. */
export const PINNED_SAME_DEG = 14;

const round2 = (v: number) => +v.toFixed(2);

/** A pose said in the words a hand uses: where it looks from. */
function poseLabel(pose: Pose): string {
  const d = {
    x: pose.position.x - pose.target.x,
    y: pose.position.y - pose.target.y,
    z: pose.position.z - pose.target.z,
  };
  const r = Math.hypot(d.x, d.y, d.z) || 1;
  const up = Math.round((Math.asin(Math.max(-1, Math.min(1, d.y / r))) * 180) / Math.PI);
  const round = Math.round((Math.atan2(d.x, d.z) * 180) / Math.PI);
  return `${round >= 0 ? round : round + 360}° · ${up >= 0 ? '+' : ''}${up}°`;
}

function renderMark(mark: Mark, log: Log, faded: boolean): string {
  const fp = fingerprintOf(mark.node);
  let html = eyebrow('mark', mark.id);

  // ---- mark: how big it is, in the plane's units and in the hand's pixels --
  if (fp) {
    const w = fp.bounds.maxX - fp.bounds.minX;
    const h = fp.bounds.maxY - fp.bounds.minY;
    html += row(
      'size',
      `${w.toFixed(2)} × ${h.toFixed(2)} u  ·  ${Math.round(w / mark.scale)} × ${Math.round(h / mark.scale)} px`,
      `${mark.scale.toFixed(4)} plane units per screen pixel at the pen — the scale the shape rung read it at`
    );
  }
  html += row('points', String(mark.points.length));

  // ---- plane: the source, the winner's reason, the ranked candidates -------
  // A read plane is a reading like any other: plural, ranked above a floor,
  // never winner-take-all (invariant 2). A CHOSEN plane has no candidates and
  // says so — it is a decision, and there is nothing to argue with.
  html += sep + eyebrow('plane', mark.plane.source);
  html += row(mark.plane.name ?? 'plane', `${mark.plane.source}`, mark.plane.why);
  const n = mark.plane.normal;
  const o = mark.plane.origin;
  html += row('normal', `(${round2(n.x)}, ${round2(n.y)}, ${round2(n.z)})`);
  if (o.x || o.y || o.z) html += row('origin', `(${o.x.toFixed(2)}, ${o.y.toFixed(2)}, ${o.z.toFixed(2)})`);
  if (mark.flippedFrom) {
    html += row('flipped from', mark.flippedFrom, 'a chip was tapped — one undo puts the first plane back');
  }
  if (mark.plane.source === 'view' && mark.pose) {
    html += row(
      'held with',
      faded ? 'a view you have left' : 'this view',
      faded
        ? 'drawn faint from here — tap its chip under *pinned views* and the camera goes back, and it is sharp'
        : 'the camera is within the tolerance of the pose it was drawn at, so it is sharp'
    );
  }
  if (mark.candidates?.length) {
    html += eyebrow('read against', `${mark.candidates.length} candidates`);
    for (const c of mark.candidates) {
      // The number, and then what the number does not say: *shape conserved*
      // for the view plane, *too oblique to take the stroke* for a candidate
      // the gate holds below it. Visible in the list, not only in the tooltip.
      html += row(c.label, c.confidence.toFixed(2) + candidateNote(c), c.reasoning);
    }
    html += '<div class="why">' + esc(
      'confidence = shape × facing × anchor × continuity — the shape rung on that plane, how face-on it is, whether the ink lies on geometry there, and whether the stroke before lay on it. ' +
      'With nothing chosen the view plane is the default: it is screen-facing, so the ink keeps the shape it was drawn at, and a plane too oblique to take the stroke cannot outrank it however well the ink reads there — the chip takes it in one act if that is what you meant'
    ) + '</div>';
  } else if (mark.plane.source === 'chosen') {
    html += '<div class="why">' + esc('chosen by the hand — blessed by the act, so nothing was scored against it') + '</div>';
  }

  // ---- reading: every one, with its number and its reasoning --------------
  // Plural, ranked, never winner-take-all (invariant 2).
  html += sep + eyebrow('reading', mark.readings.length ? `${mark.readings.length} held` : 'none');
  if (!mark.readings.length) {
    html += '<div class="empty">the shape rung placed nothing here</div>';
  } else {
    for (const r of mark.readings) {
      html += row(r.label, (r.weight || 0).toFixed(2), r.reasoning);
    }
  }

  // ---- plays: the form rung — what the mark plays in space -----------------
  // The shape rung says *rectangle*; this rung says *profile*. A mark no row
  // of the table places is `annotation`, and it says which row placed it so a
  // wrong reading is arguable rather than mysterious.
  const form = log.formOf(mark.id);
  if (form) {
    html += sep + eyebrow('plays', form.rule ? `row ${form.rule}` : 'no row matched');
    html += row(form.role, form.confidence.toFixed(2), form.reasoning);
    if (form.targets.length) html += row('of', form.targets.join(', '));
    const solid = log.solidFor(mark.id);
    if (solid) html += row('taken into', solid.name, `this ink lies on ${solid.id} — it is still ink, and it is still here`);
  }

  // ---- maths: arithmetic on a reading, not a reading -----------------------
  const m = log.mathsOf(mark.id);
  if (m) {
    html += sep + eyebrow('maths', `${m.maths.shape} · as drawn`);
    for (const x of m.maths.measures) {
      if (x.key === 'centreY') continue;
      const v =
        x.key === 'centre' && x.at
          ? `(${x.at.x.toFixed(2)}, ${x.at.y.toFixed(2)})`
          : (Number.isFinite(x.value) ? x.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '∞') + x.unit;
      html += row(x.label, v);
    }
    html += '<div class="why">' + esc(
      `in the hand's own pixels — the engine's maths rounds to whole units and calls them px, so a plane unit (× ${m.scale.toFixed(4)}) would round away`
    ) + '</div>';
  }

  // ---- measured: the fingerprint the readings were read from --------------
  if (fp) {
    html += sep + eyebrow('measured');
    html += row('straight', fp.straightness.toFixed(3));
    html += row('extent', fp.extent.toFixed(3));
    html += row('corners', String(fp.corners));
    html += row('closed', fp.isClosed ? 'yes' : 'no');
    html += row('size', `${Math.round(fp.size / mark.scale)}px`);
  }

  return html;
}
