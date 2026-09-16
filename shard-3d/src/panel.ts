// ===== panel =====
// What the shard says about a mark, in the four places a sentence may live
// (SURFACE-v9 §6.2, as far as P0 has them): the bar, the panel under it, and
// the status line. Nothing here explains the system; it reports on a mark.
//
// The rows, in the reference surface's own words: *mark*, *plane*, *reading*,
// *maths*, *measured*. The plane row is this shard's addition and it says the
// plane, its source, and WHY — a read plane is a reading like any other, and
// invariant 2 says every reading says why.

import { fingerprintOf, type Point } from 'metamedium-core';
import type { Diff, DiffRegion } from './diff';
import type { Log, Mark, ProfileOfSolid } from './log';
import type { Honours } from './brief';
import type { ProfileMatch } from './library';
import { depthsOf, describeStep } from './op';
import { poseAngle, type Plane, type Pose } from './plane';
import type { Sel } from './selection';
import { chip, esc, eyebrow, row, sep } from './ui';

export interface Panel {
  show(id: string | null, sel?: Sel | null): void;
  say(sentence: string): void;
  /** The standing hint when nothing has just happened. */
  stand(sentence: string): void;
  subject(): string | null;
}

export interface PanelOptions {
  /** P5: how much of the drawing the selected body actually contains, per plane. */
  honours?(solidId: string): Honours | null;
  /** P5: whose the newest version is, and whether the hand has taken it. */
  version?(solidId: string): { by: string; taken: boolean } | null;
  /** P5: the definitions the library holds. */
  definitions?(): { name: string; basedOn: string; why: string }[];
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
    if (!mark) {
      host.innerHTML =
        eyebrow('mark') +
        '<div class="empty">' + esc(log.marks().length ? 'hover a mark, or draw another' : 'nothing drawn yet') + '</div>' +
        solidRow;
    } else {
      host.innerHTML = renderMark(mark, log, o.faded(mark.id)) + renderLibrary(mark.id) + solidRow;
    }
    renderMatches(host, sel);
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
  const honours = o.honours?.(solid.id) ?? null;
  if (honours) {
    html += row('honours', `${(honours.overall * 100).toFixed(0)}%`, honours.sentence);
    for (const p of honours.per) {
      html += row(`  ${p.view}`, `${(p.coverage * 100).toFixed(0)}%`, `the ${p.view} profile ${p.markId}, re-rasterised against this body's silhouette on its own plane`);
    }
  }

  // ---- P5: whose version stands, and whether it has been taken -------------
  const version = o.version?.(solid.id) ?? null;
  if (version) {
    html += row(
      'version',
      version.taken ? `taken · ${version.by}` : `held · ${version.by}`,
      version.taken
        ? 'the hand took it: the artifact carries the root step\'s name, and every named sub-tree is a definition based on the whole'
        : 'a model proposed it and it is standing, attributed and unblessed — *Take it* names the thing and holds its parts as definitions'
    );
  }
  const why = broken?.(solid.id) ?? null;
  if (why) {
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
      html += row(c.label, c.confidence.toFixed(2), c.reasoning);
    }
    html += '<div class="why">' + esc(
      'confidence = shape × facing × anchor × continuity — the shape rung on that plane, how face-on it is, whether the ink lies on geometry there, and whether the stroke before lay on it'
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
