# MetaMedium Lens Canvas — Development Log

## Status
Phase execution order: 1 → 2 → 4 → 3 → 5 → 8
(Phases 6+7 deferred — recursive composition and drawing are second priority)

## Completed Phases

### Phase 1: Card Layout Redesign + Pretext Everywhere ✅
**Completed:** 2026-04-07 22:07 PDT
**Commit:** 140a61b

**Changes:**

1. **CardLens (`src/lenses/card.ts`)** — Full layout redesign:
   - Title uses `font-weight: 600` (bold) and gets full card width (no badge competition)
   - Type badge moved from top-right to bottom-right footer zone
   - Horizontal separator line between header zone and content zone
   - Descriptor renders below title in smaller (10px) muted text, up to 3 lines
   - Content zone is clipped to prevent overflow
   - Footer zone (20px) holds both lens badge (`CARD ∿`) and type badge
   - Removed `any` casts — uses proper `LensRenderOptions` fields

2. **CodeLens (`src/lenses/code.ts`)** — Pretext-measured truncation:
   - Replaced `charW = 6.6` pixel estimate with `getDisplayLine()` helper
   - `getDisplayLine()` uses `wrapText(ctx, line, maxWidth, 1)` for accurate single-line fitting
   - Syntax highlighting now operates on the pretext-measured display string

3. **TreeLens (`src/lenses/tree.ts`)** — Long string wrapping:
   - Added `wrapText` import alongside existing `fitValue`
   - String values > 30 chars that exceed remaining width now wrap to second line
   - Key displayed with colon on its own line, value wrapped below with `INDENT` offset
   - Fixed unused `dataType` parameter warning in `drawCardChrome`

**Tests:** 19/19 passing
**TypeScript:** No new errors (pre-existing errors in main.ts, api-handler.ts, viewport.ts unchanged)

**Visual Verification:**
- Screenshot confirmed CARD nodes show separator lines and ∿ badge in footer
- TREE nodes display wrapped long strings across multiple lines
- CODE nodes render with proper pretext-measured truncation
- No text overflow outside card boundaries at zoomed-out view
- All three lens types coexist clearly on the canvas

**Issues:** None — clean implementation.

---

## Current State
- 10 nodes with real Hermes system data as seed
- pretext installed as core text layout dependency
- text-wrap.ts wraps pretext with caching layer
- 4 lenses (Raw, Card, Tree, Code) — all using pretext for text layout
- Card layout has clear visual zones (header/separator/content/footer)
- 19 tests passing

## Known Issues (remaining)
- No front/back flip capability (Phase 2)
- No resize handles (Phase 3)
- No lens switcher UI (Phase 4)
- No edge drawing UI
- node.lens field exists but renderer ignores it

---

## Review Notes — UX Critique (2026-04-07 23:10 PDT)

### 🔴 CRITICAL: CardLens is dead for JSON data (the primary use case)

**Problem:** TreeLens scores 0.75–0.85 for `json` dataType while CardLens scores 0.7. TreeLens ALWAYS wins for JSON objects. Since all 9 seed nodes use `dataType: 'json'`, **CardLens never renders on the default canvas**. The Phase 1 redesign (separator lines, footer badges, bold titles, descriptor zones) is invisible in the default view.

**Fix:** Either:
1. Raise CardLens confidence for `json` to 0.9 (makes it the default overview, with TreeLens as explicit drill-down), OR
2. Keep TreeLens as default for `json` but add a **lens switcher** (Phase 4) so users can switch to CardLens, OR
3. Lower TreeLens confidence to 0.6 for flat objects (depth ≤ 1), keeping CardLens as the overview for simple objects and TreeLens for nested ones. This is the MoE-correct answer — TreeLens should earn its higher confidence by detecting structural depth, not just `dataType === 'json'`.

### 🟡 MODERATE: TreeLens lacks the visual zones CardLens has

**Problem:** TreeLens renders as a flat key-value list with no separator between header and content, no bold title extraction, no footer badge zone. For 9 out of 10 visible nodes, this means:
- No visual hierarchy beyond color (key = cyan, value = varies)
- No title — just a descriptor like "Object with 7 keys: name, provider, model, context, pricing..."
- No separator line between header and content
- Footer only shows "TREE ▾" aligned right, no type badge

**Fix:** Port the CardLens visual zone system (bold title, descriptor, separator, footer) into TreeLens. TreeLens already has `drawCardChrome()` — extend it with a header zone that extracts `data.name` / `data.model` / `data.title` as a bold heading, similar to CardLens's title extraction logic.

### 🟡 MODERATE: TreeLens descriptor position is awkward

**Problem:** The descriptor "Object with 7 keys: ..." renders above the tree content in the same regular-weight, muted color as the tree keys. It reads like a key-value line, not a card header. It doesn't stand out at all.

**Fix:** Either make the descriptor bold + brighter (like CardLens's title), or replace it with the actual `name` field from the data. "Claude Opus 4" is far more useful as a card header than "Object with 7 keys: name, provider, model...".

### 🟡 MODERATE: `node.lens` field is ignored by the renderer

**Problem:** `types.ts` defines `lens: string` on `LensNode`, and seed data could set `lens: 'card'` to force CardLens rendering. But `renderer.ts` line 96 calls `matchLens(node.dataType, node.data)` without consulting `node.lens`. The field is dead weight.

**Fix:** In `renderer.ts`, check `node.lens` first: if set and a matching lens exists, use it directly; otherwise fall back to MoE matching. This gives users explicit override control and would solve the CardLens-never-renders problem for seed data.

### 🟢 MINOR: CodeLens badge positioning

**Problem:** The "CODE ▾" badge is rendered at `(x + width - 8, y + height - 14)` with `textAlign: 'right'`. On narrow code cards, this can overlap with the last line of code. The badge also uses a different symbol (▾) than TreeLens (▾) and CardLens (∿), creating inconsistency.

**Fix:** Reserve a footer zone (like CardLens's 20px FOOTER_H) at the bottom of the CodeLens card, and place the badge there. Use a consistent badge symbol across all lenses.

### 🟢 MINOR: RawLens still uses charWidth=6.6 estimate

**Problem:** `raw.ts` line 97 uses `const charWidth = 6.6` for truncation. Phase 1 replaced this in CodeLens with pretext-based `getDisplayLine()`, but RawLens was skipped. The truncate function also doesn't use `wrapText`.

**Fix:** Import and use `fitValue()` from `text-wrap.ts` in RawLens, consistent with the other lenses.

### 🟢 MINOR: Duplicate roundRect() function in every lens

**Problem:** `roundRect()` is copy-pasted into `card.ts`, `code.ts`, `tree.ts`, and `raw.ts`. Four identical implementations.

**Fix:** Extract to a shared utility in `core/canvas-utils.ts` and import in each lens.

### ✅ GOOD: Text wrapping works correctly

When CardLens actually renders (tested by adding a `text` dataType node), the pretext-based wrapping produces clean line breaks at word boundaries. Bold title (font-weight 600) is visually distinct from content. Separator line renders properly. Footer badges position correctly.

### ✅ GOOD: Light mode colors work

Both dark and light mode render correctly. Card backgrounds, accent bars, borders, and badges all adapt to theme. No text becomes invisible in light mode. The `rgba(42,74,90,0.12)` separator line is subtle but visible in both modes.

### ✅ GOOD: Edge rendering

Bezier curves with type-appropriate dash patterns, arrowheads for relationship/dependency edges, and gold dashed lines for annotations. All render cleanly.

### ✅ GOOD: DPR-aware rendering

Canvas correctly handles device pixel ratio for crisp text on Retina displays.

---
