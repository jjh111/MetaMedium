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

### Phase 2: Front/Back Node Flip ✅
**Completed:** 2026-04-08 00:15 PDT
**Commit:** 128639f

**Changes:**

1. **BackLens (`src/lenses/back.ts`)** — New back-side data inspector:
   - Gold-themed visual identity: right accent bar (vs left on front), warm background tint
   - "RAW · JSON" header in gold, separator line, content zone
   - Syntax-colored JSON: keys in cyan, strings in green, numbers in gold, booleans purple, null red
   - Content clipped to bounds, "… N more lines" overflow indicator
   - "↩ F to flip" hint at bottom-left
   - Uses `fitValue()` from text-wrap.ts for pretext-measured line truncation

2. **Renderer (`src/canvas/renderer.ts`)** — Flip state and animation:
   - `flippedNodes` Set tracks which nodes show their back side
   - `flipAnimations` Map drives time-based Y-scale animation (300ms)
   - Animation: scaleY 1→0 (first half), swap visible side, scaleY 0→1 (second half)
   - `renderNodeContent()` routes to BackLens vs MoE-matched front lens
   - `node.lens` override now respected via `getLensById()` before MoE fallback
   - Exported `toggleFlip()` and `isFlipped()` for use by interactions

3. **Interactions (`src/canvas/interactions.ts`)** — Flip triggers:
   - F key toggles flip on selected node (guards: no ctrl/meta, not in input)
   - Double-click on existing node now flips instead of cycling abstractionLevel
   - Double-click on empty canvas still opens create modal

4. **Lens Registry (`src/core/lens-registry.ts`)** — `getLensById()` for direct lookup

**Tests:** 19/19 passing
**TypeScript:** No new errors (pre-existing errors in main.ts, api-handler.ts, viewport.ts unchanged)

**Visual Verification:**
- Screenshot confirmed flipped card shows gold right accent bar, "RAW · JSON" header
- JSON content is syntax-colored (cyan keys, green strings)
- F key toggles between front and back cleanly
- Double-click on node triggers flip
- "↩ F to flip" hint renders at bottom of back side
- Animation compresses card vertically then expands (Y-scale)
- Multiple nodes can be flipped independently

**Issues:** None — clean implementation.

---

## Current State
- 10 nodes with real Hermes system data as seed
- pretext installed as core text layout dependency
- text-wrap.ts wraps pretext with caching layer
- 4 lenses (Raw, Card, Tree, Code) + BackLens — all using pretext for text layout
- Card layout has clear visual zones (header/separator/content/footer)
- Front/back flip working via F key and double-click, with Y-scale animation
- node.lens override now respected by renderer
- 19 tests passing

### Phase 4: Lens Switcher HUD + Critical UX Fixes ✅
**Completed:** 2026-04-08 02:15 PDT
**Commit:** 9d6551d

**Changes:**

1. **Critical UX Fix: MoE confidence rebalancing** — TreeLens confidence for flat objects (depth ≤ 1) reduced from 0.75 to 0.6, so CardLens (0.7) now wins for flat JSON objects. Memory Cortex (depth 2) still renders as TreeLens (0.85). This means 8 of 10 seed nodes now render as CARD ∿ instead of TREE ▾, making the Phase 1 card redesign finally visible.

2. **Critical UX Fix: Default lens = undefined** — Changed `graph.ts` default from `lens: 'raw'` to `lens: undefined`. This means "let MoE decide" by default, with explicit `lens: 'card'` meaning "I chose this lens." Renderer simplified: `if (node.lens)` instead of `if (node.lens && node.lens !== 'raw')`. Updated `LensNode.lens` type from `string` to `string | undefined`.

3. **Critical UX Fix: TreeLens title extraction + separator** — TreeLens now extracts `data.name` / `data.model` / `data.title` as a **bold 600-weight 13px title** (matching CardLens). Added horizontal separator line between header and tree content. Descriptor renders in muted text below title. This gives TreeLens the same visual hierarchy as CardLens.

4. **Light mode badge contrast** — Increased badge alpha from 0.4 to 0.65 for TreeLens and CardLens badges in light mode. Fixes WCAG contrast issue where badges were nearly invisible.

5. **Lens Switcher HUD (`src/ui/lens-hud.ts`)** — New floating DOM overlay for per-node lens switching:
   - Shows all matching lenses with name, confidence %, and mini bar chart
   - Current lens highlighted with ● indicator, MoE winner with ★
   - "Auto (MoE decides)" option at bottom to clear override
   - Theme-aware (reads `getTheme()` from renderer for dark/light styles)
   - Viewport-clamped (repositions if near screen edges)
   - Dismisses on Escape, click-outside, or selecting a lens

6. **Interactions (`src/canvas/interactions.ts`)** — Two new triggers:
   - Right-click on node → opens Lens Switcher HUD at cursor position
   - L key on selected node → opens HUD centered above the node
   - Refactored `onKeyDown()` to check `activeElement` once at top

**Tests:** 19/19 passing (updated test for `lens: undefined` default)
**TypeScript:** No new errors

**Visual Verification:**
- Screenshot confirmed 8 of 10 nodes now render as CARD ∿ (flat JSON), 1 as TREE ▾ (nested JSON), 1 as CODE
- Right-click on node shows floating HUD with Card 70%, Tree 60%, Raw 1% and confidence bars
- Clicking "Tree" in HUD immediately re-renders node as TreeLens with TREE ▾ badge
- TreeLens shows bold title + descriptor + separator line (matching CardLens visual zones)
- Resetting to "Auto" returns node to MoE-selected CardLens
- HUD dismisses on Escape and click-outside

**Issues:** None — clean implementation.

---

### Phase 3: Resize Handles + Auto-Height ✅
**Completed:** 2026-04-08 04:10 PDT
**Commit:** 4cf853e

**Changes:**

1. **Resize Handles (`src/canvas/renderer.ts`)** — 8-handle resize system:
   - `getHandlePositions()` returns [HandleName, x, y] for NW, N, NE, E, SE, S, SW, W
   - `drawResizeHandles()` draws cyan filled circles (r=4) with dark stroke at each handle position
   - Handles drawn after lens content so they appear on top
   - Selected node check: only draws handles when `node.id === selectedNodeId`
   - New `HandleName` type exported for interactions use

2. **Resize Interaction (`src/canvas/interactions.ts`)** — Full resize drag:
   - `hitTestHandle()` checks handle proximity with zoom-aware radius (`HANDLE_RADIUS / zoom`)
   - `onPointerDown()` checks handles BEFORE node drag — handle hits take priority
   - `onPointerMove()` computes new position based on which handle is dragged:
     - East handles grow width; West handles move x + grow width; same for N/S with height
     - Minimum size enforced: 160px width, 100px height
   - `onPointerUp()` clears both `resizing` and `dragging` state
   - Cursor hints: `nw-resize`, `se-resize`, etc. when hovering handles; `grab` when hovering nodes

3. **Auto-Height Estimation** — `estimateNodeHeight()` for paste-to-create:
   - JSON: `60 + keys.length * 16`, capped at 500px
   - Code: `40 + lines * 15`, capped at 500px
   - Text: rough chars-per-line estimate, capped at 400px
   - Default: 140px for unknown types
   - Both `onPaste()` and `showCreateModal()` now use auto-height

4. **UX Fixes (from review backlog):**
   - Separator line opacity: `0.12` → `0.25`/`0.20` (dark/light) in card.ts and tree.ts — now visible
   - CodeLens light mode badge alpha: `0.4` → `0.65` — WCAG contrast fix
   - TreeLens descriptor now wraps via `wrapText(ctx, descriptor, contentWidth, 2)` — no overflow

**Tests:** 19/19 passing
**TypeScript:** No new errors

**Visual Verification:**
- Screenshot confirmed 8 resize handle dots visible on selected "Claude Opus 4" card
- Handles appear at all 4 corners and 4 edge midpoints as cyan circles
- Separator lines clearly visible between header and content zones
- TreeLens descriptors wrap properly across multiple lines
- Cursor changes to resize arrows when hovering handles
- Cards respect minimum size during resize

**Issues:** None — clean implementation.

---

## Known Issues (remaining)
- No edge drawing UI (Phase 5)

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

## Review Notes — Phase 2 UX Critique (2026-04-08 01:10 PDT)

### 🔴 CRITICAL (UNCHANGED): CardLens still never renders — TreeLens dominates all JSON nodes

**Problem:** Previous review flagged this. Phase 2 didn't address it. TreeLens scores 0.75–0.85 for `json` vs CardLens 0.7. Nine of ten seed nodes are `dataType: 'json'`, so TreeLens wins every MoE match. The entire CardLens Phase 1 redesign (separator lines, footer badges, bold titles, descriptor zones) is **invisible in the default canvas**.

**Fix (preferred — MoE-correct):** TreeLens confidence should scale with depth:
```typescript
// tree.ts matches()
if (dataType === 'json') {
  if (typeof data === 'object' && data !== null) {
    const depth = getDepth(data);
    return depth > 1 ? 0.85 : 0.6;  // flat objects → CardLens wins
  }
  return 0.5;
}
```
This means "Claude Opus 4" (depth=1) renders as a CardLens card with bold title + separator, while "Memory Cortex" (depth=2 because of nested `entities` object) renders as TreeLens. Both make visual sense for their data shape.

### 🔴 CRITICAL (NEW): TreeLens descriptor is useless as a card header

**Problem:** The descriptor "Object with 7 keys: name, provider, model, context, pricing..." is the first thing you see on every card. It's rendered at `400 11px` in muted color (`#8cb8cc` dark / `#4a6a7a` light) — identical in weight and style to the tree key-value content below. There is NO separator line between the descriptor and the tree content. The result: the descriptor reads as the first line of data, not a card title. Visual hierarchy rating: **4/10** — it's a flat data dump.

**Fix:** Two changes in `tree.ts`:
1. Extract `data.name` / `data.model` / `data.title` as a **bold title** (same logic as CardLens lines 101-115). Render it at `600 13px` in bright text. This turns "Object with 7 keys: name, provider..." into **"Claude Opus 4"** as the card header.
2. Add a **separator line** between the header zone and the tree content (copy the CardLens separator at lines 138-144).

### 🟡 MODERATE (NEW): All seed nodes default to `lens: 'raw'` — override is dead

**Problem:** `graph.ts` line 59: `lens: partial.lens ?? 'raw'`. Every seed node in `main.ts` omits `lens`, so they all get `lens: 'raw'`. The renderer (line 175) then checks `if (node.lens && node.lens !== 'raw')` — since it's always `'raw'`, the override is never triggered. The previous review said "node.lens field is ignored by the renderer" — but actually the renderer WAS fixed in Phase 2 (line 173-180 now checks `node.lens` first). The real problem is the **seed data never uses the override**.

**Fix:** Either:
1. Change default in `graph.ts` to `lens: undefined` (so the renderer always falls through to MoE), OR
2. Set explicit `lens: 'card'` on seed nodes that should show as cards (e.g., the model nodes with `name` fields).

Option 1 is simpler and more correct — `undefined` means "let MoE decide" while a specific value means "I know what lens I want."

### 🟡 MODERATE (NEW): BackLens doesn't use `wrapText` — long lines just truncate

**Problem:** `back.ts` line 146 uses `fitValue()` (single-line truncation with `…`) for JSON lines. If a JSON value is wider than the card (e.g., `"routing": "delegate_task(model=\"claude-opus-4-6\")"`), it just gets cut off. The back side is supposed to be the "raw data inspector" — truncating data defeats the purpose.

**Fix:** Import `wrapText` from `text-wrap.ts` and use it for long JSON lines, similar to how CardLens and TreeLens wrap long values. This means a single JSON key-value pair might take 2-3 lines on the back side, but at least the data is complete.

### 🟡 MODERATE (NEW): Light mode — TREE ▾ badge is nearly invisible

**Problem:** In light mode, the badge "TREE ▾" uses `rgba(42, 107, 138, 0.4)` which renders as a very pale teal on the cream background (`#f0ece4`). Contrast ratio is approximately 2.5:1 — well below the 4.5:1 WCAG AA minimum. The badge is functionally invisible.

**Fix:** In `tree.ts` line 77, change the light mode badge color from `rgba(42, 107, 138, 0.4)` to `rgba(42, 107, 138, 0.65)`. Same for CodeLens (line 122) and RawLens (line 88) — they all use the same `0.4` alpha for light mode badges.

### 🟡 MODERATE (NEW): Edge connection points always use card center

**Problem:** `renderer.ts` lines 190-193 compute edge endpoints as the center of each card (`x + width/2, y + height/2`). This means edges visually pass through the card body rather than connecting at the card boundary. For cards that are close together, the edge starts deep inside one card and ends deep inside another, making the connection hard to trace.

**Fix:** Compute intersection of the edge line with the card boundary rectangle. A simpler approach: connect to the nearest edge midpoint (top/bottom/left/right) based on the direction to the target card.

### 🟢 MINOR (NEW): BackLens roundRect uses `arcTo` while all other lenses use `quadraticCurveTo`

**Problem:** `back.ts` lines 9-28 implement `roundRect()` using `ctx.arcTo()`, while `card.ts`, `tree.ts`, `code.ts`, and `raw.ts` all use `ctx.quadraticCurveTo()`. These produce slightly different curves. The back lens is a special case (right accent bar vs left), but the corner rendering should be consistent.

**Fix:** Standardize all `roundRect()` implementations. Better yet — extract to shared `core/canvas-utils.ts` (this was flagged in the previous review too).

### 🟢 MINOR (UNCHANGED): RawLens still uses `charWidth = 6.6`

**Problem:** `raw.ts` line 97 still has the hardcoded character width estimate. Previous review flagged this; not fixed.

### 🟢 MINOR (UNCHANGED): roundRect() duplicated across 5 files

**Problem:** Now 5 files (card, tree, code, raw, back). Previous review flagged 4. Not fixed.

### ✅ GOOD: Front/back flip animation works correctly

The Y-scale animation (300ms) is smooth and correctly swaps visible sides at the halfway point. The gold-themed back side is visually distinct with: right accent bar, "RAW · JSON" header, gold separator line, syntax-colored JSON (cyan keys, green strings, gold numbers, purple booleans, red null), and "↩ F to flip" hint. Double-click also triggers flip.

### ✅ GOOD: BackLens visual identity is strong

The right-side gold accent bar vs left-side cyan creates an immediate visual distinction between front and back. The warmer background tint (`#060c10` vs `#051018`) reinforces the "other side" metaphor. Selected state uses gold glow instead of cyan. All cohesive.

### ✅ GOOD: Text wrapping via pretext works correctly

When CardLens renders, pretext produces clean line breaks at word boundaries. The caching layer in `text-wrap.ts` (WeakMap with 200-entry eviction) handles performance well. The `naiveWrap` fallback is a sensible safety net.

### ✅ GOOD: CodeLens syntax highlighting and line numbers

The code card renders with line numbers in a gutter, keyword highlighting (JS/TS/Python), string and number coloring, and comment detection. The `getDisplayLine()` helper using `wrapText(ctx, line, maxWidth, 1)` is clean and avoids the old `charW=6.6` hack.

---

## Review Notes — Phase 4 UX Critique (2026-04-08 03:10 PDT)

### 🔴 CRITICAL: Separator line is nearly invisible in both modes

**Problem:** The header/content separator uses `rgba(77,201,246,0.12)` in dark mode and `rgba(42,74,90,0.12)` in light mode. At 12% opacity, this line is functionally invisible — vision analysis confirmed it's "barely perceptible" and "requires close inspection." The separator is the single most important visual zone boundary in the card redesign (Phase 1's core contribution), and users can't see it.

**Fix in `card.ts` line 139 and `tree.ts` line 94:**
```typescript
// BEFORE (invisible):
ctx.strokeStyle = isDark ? 'rgba(77,201,246,0.12)' : 'rgba(42,74,90,0.12)';
// AFTER (subtle but visible):
ctx.strokeStyle = isDark ? 'rgba(77,201,246,0.25)' : 'rgba(42,74,90,0.20)';
```

### 🔴 CRITICAL: CodeLens badge uses 0.4 alpha — too faint in light mode

**Problem:** `code.ts` line 122 still uses `rgba(42, 107, 138, 0.4)` for the light mode badge. Phase 4's fix raised TreeLens and CardLens to 0.65, but CodeLens was missed. In light mode on cream background, the CODE ▾ badge is "noticeably fainter" and "requires more visual effort" (vision analysis confirmed).

**Fix in `code.ts` line 122:**
```typescript
// BEFORE:
ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.4)';
// AFTER:
ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.65)';
```

### 🟡 MODERATE: TreeLens descriptor doesn't wrap — can overflow

**Problem:** `tree.ts` line 89 uses `ctx.fillText(descriptor, textX, textY)` — a single `fillText` call with no wrapping. If the descriptor is longer than `contentWidth` (e.g., "Object with 8 keys: name, architecture, entities, tiers, relations, decisions, harvester, next..."), it will silently overflow the card boundary to the right. CardLens properly uses `wrapText()` for its descriptor (line 128), but TreeLens doesn't.

**Fix in `tree.ts` lines 86-91:**
```typescript
// BEFORE:
if (abstractionLevel !== 'type' && descriptor) {
  ctx.font = '400 10px "JetBrains Mono", monospace';
  ctx.fillStyle = isDark ? '#8cb8cc' : '#4a6a7a';
  ctx.fillText(descriptor, textX, textY);
  textY += 15;
}
// AFTER:
if (abstractionLevel !== 'type' && descriptor) {
  ctx.font = '400 10px "JetBrains Mono", monospace';
  ctx.fillStyle = isDark ? '#8cb8cc' : '#4a6a7a';
  const descLines = wrapText(ctx, descriptor, contentWidth, 2);
  for (const line of descLines) {
    ctx.fillText(line.text, textX, textY);
    textY += 15;
  }
}
```

### 🟡 MODERATE: BackLens still uses fitValue() — long JSON values truncate instead of wrapping

**Problem:** Previous review flagged this (Phase 2 review, item 3). BackLens `renderJsonLine()` at `back.ts` line 146 calls `fitValue()` which truncates to a single line with `…`. For the "raw data inspector" use case, truncating `delegate_task(model="claude-opus-4-6")` to `delegate_task(model="claude…` defeats the purpose. The back side should show complete data.

**Fix:** Import `wrapText` from `text-wrap.ts` and use it in `renderJsonLine()` for long lines, similar to how TreeLens wraps long string values (lines 180-190). A single JSON key-value pair might take 2-3 lines, but the data is complete.

### 🟡 MODERATE: Edge connection points use card centers — edges visually pass through card bodies

**Problem:** Previous review flagged this (Phase 2 review, item 5). `renderer.ts` lines 190-193 compute edge endpoints as the center of each card. Edges start deep inside one card and end deep inside another, making connections hard to trace. This is especially bad for the dependency chain (Opus → Sonnet → GLM → Qwen) where cards are close together.

**Fix:** Compute intersection of the edge direction vector with the source/target card boundary rectangle. A simpler approach: connect to the nearest edge midpoint (top/bottom/left/right) based on the direction to the target card.

### 🟡 MODERATE: Descriptor text blends into content in dark mode

**Problem:** The descriptor ("Object with 7 keys: name, provider, model...") uses `#8cb8cc` in dark mode — the same cyan-ish muted color as the key names below the separator. Without a clearly visible separator line (see critical issue #1), the descriptor is visually indistinguishable from content. Vision analysis confirmed "too similar in brightness to the key-value content below it."

**Fix:** Either:
1. Fix the separator line visibility (critical issue #1) — this alone would solve it, OR
2. Make descriptor text slightly brighter: `#9ec8d8` instead of `#8cb8cc` in dark mode.

Option 1 is preferred — the separator is what should create the visual boundary.

### 🟢 MINOR: RawLens still uses `charWidth = 6.6` hardcoded estimate

**Problem:** `raw.ts` line 97. Flagged in two previous reviews. Not fixed. RawLens is the fallback lens — it should use the same pretext-based measurement as all other lenses for consistency.

**Fix:** Import `fitValue` from `text-wrap.ts` and replace the `truncate()` function. Also import and use `wrapText` for multi-line content.

### 🟢 MINOR: roundRect() duplicated across 5 files

**Problem:** Flagged in two previous reviews. Now 5 copies (card, tree, code, raw, back). Not fixed.

**Fix:** Extract to `src/core/canvas-utils.ts` and import in each lens.

### 🟢 MINOR: BackLens roundRect uses `arcTo` while all others use `quadraticCurveTo`

**Problem:** `back.ts` lines 17-27 use `ctx.arcTo()` while `card.ts`, `tree.ts`, `code.ts`, `raw.ts` all use `ctx.quadraticCurveTo()`. These produce slightly different corner curves. Flagged in previous review. Not fixed.

**Fix:** Extract to shared `canvas-utils.ts` (same fix as above — one stone, two birds).

### 🟢 MINOR: CodeLens has no footer zone — badge can overlap last code line

**Problem:** `code.ts` places the "CODE ▾" badge at `(x + width - 8, y + height - 14)` with `textAlign: 'right'`. Unlike CardLens (which reserves a 20px `FOOTER_H` zone), CodeLens computes `maxLines` as `Math.floor((height - pad * 2 - 14) / lineH)`. The `-14` accounts for badge space, but the badge overlaps the content area visually. If a code card has exactly `maxLines` of content, the last code line and the badge share the same vertical space.

**Fix:** Reserve an explicit footer zone (like CardLens's 20px `FOOTER_H`) and place the badge there, separated from code content by the same vertical padding.

### ✅ GOOD: MoE rebalancing works correctly

8 of 10 seed nodes now render as CARD ∿ (flat JSON objects), 1 as TREE ▾ (Memory Cortex with depth 2), and 1 as CODE ▾. The Phase 4 depth-based confidence scaling is the correct MoE answer — TreeLens earns its higher confidence by detecting structural depth, not just `dataType === 'json'`.

### ✅ GOOD: Lens Switcher HUD is polished

The floating HUD shows all matching lenses with confidence %, mini bar charts, and the ★ MoE winner indicator. Click-outside dismisses properly. Viewport clamping works. The "Auto (MoE decides)" option correctly clears the override. The `updateNode(nodeId, { lens: undefined as unknown as string })` type hack is ugly but functional.

### ✅ GOOD: Front/back flip is meaningful and distinct

The gold right accent bar vs cyan left accent bar creates immediate visual distinction. Back side is warmer (#060c10 vs #051018 in dark mode). Syntax-colored JSON (cyan keys, green strings, gold numbers, purple booleans, red null) is useful. The "↩ F to flip" hint is a nice touch. The Y-scale animation (300ms) is smooth and correctly swaps sides at t=0.5.

### ✅ GOOD: Text wrapping via pretext works correctly

When CardLens renders, pretext produces clean line breaks at word boundaries. The caching layer (WeakMap with 200-entry eviction) handles performance. The `naiveWrap` fallback is a sensible safety net. Multi-line value wrapping (CardLens lines 186-194) works for long string values.

---
