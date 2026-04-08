# MetaMedium Lens Canvas — Phased Implementation Plan
# Target: Actual Usable UX, Overnight Execution

Generated: 2026-04-07
Status: Planning doc for autonomous agent execution.
Each phase is self-contained, ships visible UI, and has screenshot-verifiable success criteria.

---

## Current State Assessment

**What works:**
- 10 seed nodes with real data displayed on canvas
- Pan (scroll/alt+drag) and zoom (ctrl+scroll)
- 4 lenses: Raw, Card, Tree, Code
- MoE lens matching (confidence 0–1)
- text-wrap.ts exists with pretext integration (wrapText, fitValue, measureTextHeight)
- CardLens already calls wrapText() — but with suboptimal layout
- Edge connections rendered with bezier curves
- Dark/light theme toggle
- Paste-to-create, double-click-to-create, delete key

**What's missing (in priority order):**
1. CardLens visual quality is weak — title runs into badge, spacing is cramped
2. CodeLens uses char-width estimate (`charW = 6.6`) not pretext
3. No front/back flip — user can't see raw data vs. designed view
4. No resize handles — nodes are fixed size
5. No lens switcher UI — can't try different lenses per node
6. No edge drawing UI — edges only exist as seed data
7. No nested frame containment — parent/child is in types but not rendered
8. No drawing tools

---

## Architecture Decisions (before coding)

### A. Flip State Storage
Store per-node flip state in renderer module (NOT in graph) — it's pure view state.
```typescript
// in renderer.ts
const flippedNodes = new Set<string>();
export function toggleFlip(id: string) { flippedNodes.has(id) ? flippedNodes.delete(id) : flippedNodes.add(id); }
export function isFlipped(id: string) { return flippedNodes.has(id); }
```

### B. Resize Handle Hit Areas
Renderer draws handles, interactions.ts hit-tests them before node drag logic.
8 handles: 4 corners (NW, NE, SE, SW) + 4 edges (N, E, S, W).
Min node size: 160×100.

### C. Lens Override Storage
Node already has `lens` field. Currently ignored by renderer (always uses matchLens).
Fix: `matchLens` should check `node.lens` override first.

### D. Back Side = RawLens with pretext
When flipped, render node with BackLens — a new lens that uses pretext to layout
`JSON.stringify(data, null, 2)` with syntax-colored keys/values.

### E. Edge Drawing
Shift+drag from a node → ghost edge → release on another node → addEdge.
State lives in interactions.ts, ghost line drawn in renderer each frame.

### F. Nested Frames (Phase 6)
FrameLens renders children in a scaled sub-viewport inside parent bounds.
Drag one node onto another to nest. Uses node.parent field (already in types).

---

## PHASE 1: Card Layout Redesign + Pretext Everywhere
**Estimated time: 2-3 hours**
**Files: src/lenses/card.ts, src/lenses/code.ts, src/lenses/tree.ts, src/core/text-wrap.ts**

### The Problem
CardLens text layout is cramped. The title area competes with the type badge.
CodeLens uses `charW = 6.6` char-width estimates instead of pretext.
TreeLens only uses fitValue, not wrapText for multi-line values.

### Changes to src/lenses/card.ts

Redesign the card into clear visual zones with proper spacing:

```
┌─────────────────────────────────┐
│▌ TITLE (13px, bold)         TYPE│  ← header zone: 36px tall
│▌ descriptor (11px, muted)       │
├─────────────────────────────────┤
│  content area                   │  ← scrollable content zone
│  key: value                     │
│  key: value (wrapped)           │
├─────────────────────────────────┤
│                         CARD ~  │  ← footer: 20px
└─────────────────────────────────┘
```

Key changes:
1. Title zone gets full width (badge goes to BOTTOM right, not top right)
2. Title uses wrapText() with max 2 lines, lineHeight 18px
3. Descriptor uses wrapText() with max 3 lines, lineHeight 15px
4. Clear horizontal separator between header and content
5. Content zone clips to available height
6. Badge "CARD ∿" stays bottom-right (already done)

```typescript
// New card layout constants
const HEADER_PAD = 12;
const CONTENT_PAD = 10;
const LINE_TITLE = 18;    // title line height
const LINE_DESC = 15;     // descriptor line height
const LINE_BODY = 14;     // body/content line height
const FOOTER_H = 20;      // lens badge zone

// Title zone
ctx.save();
ctx.rect(x + 6, y, width - 6, height); // clip to right of accent bar
ctx.clip();

ctx.font = '600 13px "JetBrains Mono", monospace';
ctx.fillStyle = titleColor;
const titleLines = wrapText(ctx, title, width - 24, 2);
for (const line of titleLines) {
  ctx.fillText(line.text, textX, textY);
  textY += LINE_TITLE;
}

// Descriptor
if (descriptor) {
  ctx.font = '400 10px "JetBrains Mono", monospace';
  ctx.fillStyle = descColor;
  const descLines = wrapText(ctx, descriptor, width - 24, 3);
  for (const line of descLines) {
    ctx.fillText(line.text, textX, textY);
    textY += LINE_DESC;
  }
}
ctx.restore();

// Separator line
ctx.strokeStyle = isDark ? 'rgba(77,201,246,0.12)' : 'rgba(42,74,90,0.12)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(x + 8, textY);
ctx.lineTo(x + width - 8, textY);
ctx.stroke();
textY += 8;

// Content zone (clipped)
ctx.save();
ctx.rect(x + 6, textY, width - 10, y + height - FOOTER_H - textY);
ctx.clip();
// ... render entries/text with wrapText ...
ctx.restore();
```

### Changes to src/lenses/code.ts

Replace char-width truncation with pretext-aware line wrapping:

```typescript
import { wrapText } from '../core/text-wrap';

// In render(), replace renderHighlightedLine:
// Instead of truncating to charWidth estimate, use wrapText to get
// the portion that fits, then highlight that string.

// The key insight: syntax highlight operates on a STRING.
// So: get the displayable portion via pretext, THEN tokenize that portion.

function getDisplayLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number
): string {
  ctx.font = '400 11px "JetBrains Mono", monospace';
  if (ctx.measureText(line).width <= maxWidth) return line;
  // Use wrapText to get just what fits
  const wrapped = wrapText(ctx, line, maxWidth, 1);
  return wrapped[0]?.text.trimEnd() + '…' ?? '';
}
```

### Changes to src/lenses/tree.ts

Wrap long string values with wrapText instead of always fitting to one line:

```typescript
// For string values longer than remainingW:
const raw = `"${val}"`;
const remainW = maxWidth - (x - startX) - keyW - 16;
if (ctx.measureText(': ' + raw).width > remainW && raw.length > 30) {
  // Display key on its own line, value wrapped below
  ctx.fillText(':', x + keyW, y);
  y += LINE_H;
  ctx.fillStyle = strColor;
  const valLines = wrapText(ctx, raw, maxWidth - INDENT, 2);
  for (const vl of valLines) {
    if (y > maxY) break;
    ctx.fillText(vl.text, x + INDENT, y);
    y += LINE_H;
  }
} else {
  const display = fitValue(ctx, ': ' + raw, remainW);
  ctx.fillText(display, x + keyW, y);
  y += LINE_H;
}
```

### Success Criteria (Phase 1)
Screenshot shows:
- [ ] Card titles are bold (600 weight) and properly word-wrapped to 2 lines
- [ ] Card descriptors render below title in smaller, muted text  
- [ ] Horizontal separator line between header and content body
- [ ] Code nodes: long lines are properly truncated (not pixel-estimated)
- [ ] Tree nodes: long string values wrap to second line instead of being cut off
- [ ] No text overflows outside card bounds

---

## PHASE 2: Front/Back Node Flip
**Estimated time: 3 hours**
**Files: src/canvas/renderer.ts, src/canvas/interactions.ts, src/lenses/back.ts (new)**

### The Concept
Every node has two sides:
- **Front**: the designed lens view (Card, Tree, Code — whatever matched)
- **Back**: the raw data with formatting — the "source of truth" side

User flips with `F` key (selected node) or double-click.
The flip animates: scale Y → 0 (first 150ms), swap side, scale Y → 1 (next 150ms).

### New file: src/lenses/back.ts

The back side is NOT the RawLens. It's a purpose-built "data inspector" view
that uses pretext for proper layout:

```typescript
// BackLens — the "back side" of any card
// Shows: data type header, formatted JSON/text with pretext wrapping
// This is the lens that renders when a node is flipped

import { wrapText } from '../core/text-wrap';

export const BackLens = {
  id: 'back',
  name: 'Back',

  render(ctx, data, bounds, options) {
    const { x, y, width, height } = bounds;
    const { isDark } = options;

    // Different bg tint — slightly warmer to signal "other side"
    ctx.fillStyle = isDark ? '#060c10' : '#ece8e0';
    roundRect(ctx, x, y, width, height, 4);
    ctx.fill();

    // Right accent bar (reversed orientation signals flip)
    ctx.fillStyle = isDark ? '#d4af37' : '#9a7b2a'; // gold = "back side"
    ctx.fillRect(x + width - 4, y, 4, height);

    // Border
    ctx.strokeStyle = isDark ? 'rgba(212,175,55,0.25)' : 'rgba(154,123,42,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, 4);
    ctx.stroke();

    const pad = 12;
    let textY = y + pad;
    const textX = x + pad;
    const contentW = width - pad * 2 - 8; // -8 for right accent bar

    // Header: data type
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#d4af37' : '#9a7b2a';
    ctx.textBaseline = 'top';
    ctx.fillText(`RAW · ${options.dataType?.toUpperCase() ?? 'UNKNOWN'}`, textX, textY);
    textY += 16;

    // Separator
    ctx.strokeStyle = isDark ? 'rgba(212,175,55,0.15)' : 'rgba(154,123,42,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 8, textY); ctx.lineTo(x + width - 8, textY);
    ctx.stroke();
    textY += 8;

    // Data content — pretext-wrapped JSON
    const raw = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const maxContentY = y + height - pad - 16;
    
    ctx.font = '400 10px "JetBrains Mono", monospace';
    
    // Render line by line with syntax coloring
    const lines = raw.split('\n');
    const lineH = 13;
    const maxLines = Math.floor((maxContentY - textY) / lineH);
    
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      renderJsonLine(ctx, lines[i], textX, textY, contentW, isDark);
      textY += lineH;
    }
    
    if (lines.length > maxLines) {
      ctx.fillStyle = isDark ? 'rgba(212,175,55,0.5)' : 'rgba(154,123,42,0.5)';
      ctx.fillText(`… ${lines.length - maxLines} more lines`, textX, textY);
    }

    // Corner flip indicator
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(212,175,55,0.4)' : 'rgba(154,123,42,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('↩ F to flip', textX, y + height - 9);
    ctx.textAlign = 'left';
  },
};

function renderJsonLine(ctx, line, x, y, maxW, isDark) {
  // Color: keys in cyan, strings in green, numbers in gold, braces dim
  // Uses pretext-measured truncation for the line
  const truncated = getTruncatedLine(ctx, line, maxW);
  
  // Simple coloring: detect if line contains a key pattern "  \"key\":"
  if (/^\s+"[^"]+"\s*:/.test(line)) {
    // Has a key
    const colonIdx = truncated.indexOf(':');
    const keyPart = truncated.slice(0, colonIdx + 1);
    const valPart = truncated.slice(colonIdx + 1);
    ctx.fillStyle = isDark ? '#4dc9f6' : '#2a6b8a';
    ctx.fillText(keyPart, x, y);
    const keyW = ctx.measureText(keyPart).width;
    ctx.fillStyle = getValueColor(valPart.trim(), isDark);
    ctx.fillText(valPart, x + keyW, y);
  } else {
    // Structural or plain
    ctx.fillStyle = isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,74,90,0.4)';
    ctx.fillText(truncated, x, y);
  }
}
```

### Changes to src/canvas/renderer.ts

Add flip state and animation:

```typescript
// Flip state
const flippedNodes = new Set<string>();
const flipAnimations = new Map<string, { progress: number; direction: 1 | -1 }>();
const FLIP_DURATION = 300; // ms total

export function toggleFlip(id: string) {
  const isFlipped = flippedNodes.has(id);
  if (isFlipped) {
    flippedNodes.delete(id);
  } else {
    flippedNodes.add(id);
  }
  // Start animation
  flipAnimations.set(id, { progress: 0, direction: isFlipped ? -1 : 1 });
}

export function isFlipped(id: string): boolean {
  return flippedNodes.has(id);
}

// In drawNode(), add flip animation support:
function drawNode(ctx, node, isDark) {
  const anim = flipAnimations.get(node.id);
  
  if (anim) {
    // Animate: scale Y from 1 → 0 (first half) → 1 (second half)
    anim.progress += 16 / FLIP_DURATION; // ~60fps increment
    if (anim.progress >= 1) {
      flipAnimations.delete(node.id);
    }
    
    const { x, y, width, height } = node.position;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const t = anim.progress;
    
    // Ease in-out: scale Y collapses to 0 at t=0.5, then expands
    let scaleY: number;
    if (t < 0.5) {
      scaleY = 1 - (t * 2); // 1 → 0
    } else {
      scaleY = (t - 0.5) * 2; // 0 → 1
    }
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, Math.max(0.001, scaleY));
    ctx.translate(-cx, -cy);
    
    // At the midpoint (scaleY near 0), the side has already been toggled
    // by the SetTimeout in toggleFlip — nothing else needed
    renderNodeContent(ctx, node, isDark);
    
    ctx.restore();
  } else {
    renderNodeContent(ctx, node, isDark);
  }
}

function renderNodeContent(ctx, node, isDark) {
  const showing = isFlipped(node.id) ? 'back' : 'front';
  
  if (showing === 'back') {
    BackLens.render(ctx, node.data, node.position, { isDark, ...options });
  } else {
    const lens = node.lens !== 'raw'
      ? getLensByIdOrFallback(node.lens)
      : matchLens(node.dataType, node.data);
    lens.render(ctx, node.data, node.position, { isDark, ...options });
  }
}
```

### Changes to src/canvas/interactions.ts

```typescript
// In onKeyDown():
if (e.key === 'f' || e.key === 'F') {
  if (sel && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    toggleFlip(sel); // imported from renderer
  }
}

// Change double-click behavior:
// OLD: toggle abstractionLevel (type/descriptor/meaning)
// NEW: toggle flip
function onDoubleClick(e: MouseEvent) {
  const hit = hitTest(wx, wy);
  if (hit) {
    toggleFlip(hit.id); // F to flip, not double-click to change level
    return;
  }
  showCreateModal(wx, wy);
}
```

### Success Criteria (Phase 2)
Screenshot shows:
- [ ] Pressing F on selected node shows "back" — gold accent bar on RIGHT, gold header text "RAW · JSON"
- [ ] Back side shows raw JSON data with cyan keys, green string values
- [ ] Pressing F again returns to front (lens view)
- [ ] During flip, card visually compresses to thin line then expands (animation)
- [ ] Double-click also triggers flip
- [ ] Back side shows "↩ F to flip" hint at bottom

---

## PHASE 3: Resize Handles + Auto-Height
**Estimated time: 2-3 hours**
**Files: src/canvas/renderer.ts, src/canvas/interactions.ts**

### Resize Handles

When a node is selected, draw 8 handles (4 corners + 4 midpoints):

```typescript
// In drawNode(), after rendering the lens:
if (node.id === selectedNodeId) {
  drawResizeHandles(ctx, node.position, isDark);
}

function drawResizeHandles(ctx, pos, isDark) {
  const { x, y, width, height } = pos;
  const handles = getHandlePositions(pos);
  
  for (const [cursor, hx, hy] of handles) {
    ctx.fillStyle = isDark ? '#7dd8f7' : '#2a6b8a';
    ctx.strokeStyle = isDark ? '#020a12' : '#f8f5f0';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// Handle positions: returns [cursor-name, x, y]
function getHandlePositions(pos) {
  const { x, y, width: w, height: h } = pos;
  return [
    ['nw', x, y],
    ['n', x + w/2, y],
    ['ne', x + w, y],
    ['e', x + w, y + h/2],
    ['se', x + w, y + h],
    ['s', x + w/2, y + h],
    ['sw', x, y + h],
    ['w', x, y + h/2],
  ];
}
```

### Handle Hit Testing in interactions.ts

```typescript
const HANDLE_RADIUS = 6; // px in world space

function hitTestHandle(wx, wy, node): string | null {
  if (node.id !== selectedNodeId) return null;
  const handles = getHandlePositions(node.position);
  for (const [name, hx, hy] of handles) {
    const dx = wx - hx, dy = wy - hy;
    if (Math.sqrt(dx*dx + dy*dy) <= HANDLE_RADIUS) return name;
  }
  return null;
}

// In onPointerDown(): check handles BEFORE node drag
let resizing: { nodeId: string; handle: string; startPos: Rect; startX: number; startY: number } | null = null;

function onPointerDown(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = screenToWorld(sx, sy);

  // 1. Check resize handles on selected node first
  const sel = getSelectedNode();
  if (sel) {
    const selNode = getAllNodes().find(n => n.id === sel);
    if (selNode) {
      const handle = hitTestHandle(wx, wy, selNode);
      if (handle) {
        resizing = { nodeId: sel, handle, startPos: { ...selNode.position }, startX: wx, startY: wy };
        canvas.setPointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }
    }
  }
  
  // 2. Then check node drag
  // ... existing drag logic ...
}

function onPointerMove(e) {
  if (resizing) {
    // ... compute new position based on handle ...
    const { nodeId, handle, startPos, startX, startY } = resizing;
    const dx = wx - startX;
    const dy = wy - startY;
    
    let { x, y, width, height } = startPos;
    
    if (handle.includes('e')) width = Math.max(160, startPos.width + dx);
    if (handle.includes('s')) height = Math.max(100, startPos.height + dy);
    if (handle.includes('w')) { x = startPos.x + dx; width = Math.max(160, startPos.width - dx); }
    if (handle.includes('n')) { y = startPos.y + dy; height = Math.max(100, startPos.height - dy); }
    
    updateNode(nodeId, { position: { x, y, width, height } });
    return;
  }
  // ... existing drag logic ...
}

function onPointerUp() {
  resizing = null;
  dragging = null;
}
```

### Auto-Height Helper (for paste-to-create)

When a node is created via paste or double-click, auto-size it based on content:

```typescript
// In interactions.ts, after creating node:
import { measureTextHeight } from '../core/text-wrap';

function estimateNodeHeight(data: unknown, dataType: string, width: number): number {
  // Rough heuristic — pretext gives us precise measurements
  const baseH = 80; // min
  const contentW = width - 32; // minus padding
  
  if (dataType === 'json' && typeof data === 'object' && data !== null) {
    const keys = Object.keys(data as object);
    return Math.min(500, Math.max(baseH, 60 + keys.length * 16));
  }
  if (dataType === 'text') {
    const str = String(data);
    // Use measureTextHeight from text-wrap.ts
    const { lineCount } = measureTextHeight(
      // can't easily pass ctx here — use estimate
      null as any, str, contentW, 14
    );
    return Math.min(400, Math.max(baseH, 60 + lineCount * 16));
  }
  if (dataType === 'code') {
    const lines = String(data).split('\n').length;
    return Math.min(500, Math.max(baseH, 40 + lines * 15));
  }
  return 140; // default
}
```

### Cursor Hints

CSS cursor changes when hovering handles:
```typescript
// In onPointerMove, check if hovering over a handle and update cursor
const CURSOR_MAP: Record<string, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize', se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
};

if (!dragging && !resizing) {
  const sel = getSelectedNode();
  if (sel) {
    const node = getAllNodes().find(n => n.id === sel);
    if (node) {
      const handle = hitTestHandle(wx, wy, node);
      canvas.style.cursor = handle ? (CURSOR_MAP[handle] ?? 'default') : 'default';
    }
  }
}
```

### Success Criteria (Phase 3)
Screenshot shows:
- [ ] Selected node shows 8 small cyan circles at corners and midpoints
- [ ] Dragging corner handle resizes node diagonally
- [ ] Dragging edge handle resizes in one axis
- [ ] Node cannot be made smaller than 160×100
- [ ] Cursor changes to resize arrow when hovering a handle
- [ ] Newly pasted nodes auto-size to fit content (JSON with 8 keys ≈ 200px tall)

---

## PHASE 4: Lens Switcher HUD
**Estimated time: 2 hours**
**Files: src/canvas/interactions.ts, src/core/lens-registry.ts, src/canvas/renderer.ts**

### The HUD

When user right-clicks OR presses `L` on a selected node, show a floating lens picker.
This is a DOM overlay (not canvas-drawn) for simplicity:

```typescript
// src/ui/lens-hud.ts (new file)
import { allMatches } from '../core/lens-registry';
import { updateNode, getNode } from '../core/graph';

let hudEl: HTMLElement | null = null;

export function showLensHud(nodeId: string, screenX: number, screenY: number) {
  closeLensHud();
  
  const node = getNode(nodeId);
  if (!node) return;
  
  const matches = allMatches(node.dataType, node.data);
  
  hudEl = document.createElement('div');
  hudEl.className = 'lens-hud';
  hudEl.style.cssText = `
    position: fixed;
    left: ${screenX}px;
    top: ${screenY}px;
    background: var(--sea-mid, #051018);
    border: 1px solid rgba(77,201,246,0.25);
    border-radius: 6px;
    padding: 8px;
    z-index: 200;
    min-width: 180px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    font: 400 11px "JetBrains Mono", monospace;
  `;
  
  const header = document.createElement('div');
  header.textContent = 'Choose Lens';
  header.style.cssText = 'color: rgba(77,201,246,0.5); margin-bottom: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;';
  hudEl.appendChild(header);
  
  for (const { lens, score } of matches) {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      padding: 5px 6px; border-radius: 3px; cursor: pointer;
      color: ${lens.id === node.lens ? '#7dd8f7' : '#8cb8cc'};
      background: ${lens.id === node.lens ? 'rgba(77,201,246,0.1)' : 'transparent'};
    `;
    row.innerHTML = `
      <span style="flex:1">${lens.name}</span>
      <span style="color:rgba(77,201,246,0.4); font-size:9px">${Math.round(score * 100)}%</span>
      <div style="width:40px;height:3px;background:rgba(77,201,246,0.15);border-radius:2px;overflow:hidden">
        <div style="width:${Math.round(score*100)}%;height:100%;background:#7dd8f7;border-radius:2px"></div>
      </div>
    `;
    
    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(77,201,246,0.08)'; });
    row.addEventListener('mouseleave', () => {
      row.style.background = lens.id === node.lens ? 'rgba(77,201,246,0.1)' : 'transparent';
    });
    row.addEventListener('click', () => {
      updateNode(nodeId, { lens: lens.id });
      closeLensHud();
    });
    
    hudEl.appendChild(row);
  }
  
  document.body.appendChild(hudEl);
  
  // Close on outside click
  setTimeout(() => {
    window.addEventListener('click', closeLensHud, { once: true });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLensHud(); }, { once: true });
  }, 0);
}

export function closeLensHud() {
  if (hudEl) { hudEl.remove(); hudEl = null; }
}
```

### Fix renderer to respect node.lens override

```typescript
// In renderer.ts drawNode():
function drawNode(ctx, node, isDark) {
  let lens: Lens;
  
  if (node.lens && node.lens !== 'raw') {
    // Use explicit lens override
    lens = getLensById(node.lens) ?? matchLens(node.dataType, node.data);
  } else {
    lens = matchLens(node.dataType, node.data);
  }
  
  // ... rest of render ...
}

// New helper in lens-registry.ts:
export function getLensById(id: string): Lens | undefined {
  return registry.find(l => l.id === id);
}
```

### Trigger in interactions.ts

```typescript
import { showLensHud } from '../ui/lens-hud';

// Add to onPointerDown or separate contextmenu handler:
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = screenToWorld(sx, sy);
  const hit = hitTest(wx, wy);
  if (hit) {
    setSelectedNode(hit.id);
    showLensHud(hit.id, e.clientX, e.clientY);
  }
});

// In onKeyDown():
if ((e.key === 'l' || e.key === 'L') && sel && !e.ctrlKey) {
  e.preventDefault();
  const node = getAllNodes().find(n => n.id === sel);
  if (node) {
    // Convert world position to screen for HUD placement
    const { x: sx, y: sy } = worldToScreen(node.position.x + node.position.width / 2, node.position.y);
    showLensHud(sel, sx, sy);
  }
}
```

### Success Criteria (Phase 4)
Screenshot shows:
- [ ] Right-clicking a node shows floating HUD with available lenses
- [ ] Each lens row shows name, confidence %, and mini bar chart
- [ ] Current lens is highlighted in cyan
- [ ] Clicking a different lens updates the node immediately (live re-render)
- [ ] Tree node switched to Card lens shows card layout
- [ ] `L` key also triggers the HUD
- [ ] HUD dismisses on Escape or click-outside

---

## PHASE 5: Edge Drawing UI
**Estimated time: 3 hours**
**Files: src/canvas/interactions.ts, src/canvas/renderer.ts**

### The Interaction Model

- **Shift + drag** FROM a node → enters edge-drawing mode
- Ghost line from source node center to cursor
- Release ON another node → `addEdge()` is called
- Release on empty canvas → cancel
- Escape also cancels

### State in interactions.ts

```typescript
let edgeDrawing: {
  fromNodeId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  hoveringNodeId: string | null;
} | null = null;

export function getEdgeDrawing() { return edgeDrawing; } // exported for renderer
```

### Updated onPointerDown

```typescript
function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  
  // ... handle resize checks first ...
  
  const hit = hitTest(wx, wy);
  if (hit && e.shiftKey) {
    // Start edge drawing from center of hit node
    const cx = hit.position.x + hit.position.width / 2;
    const cy = hit.position.y + hit.position.height / 2;
    edgeDrawing = { fromNodeId: hit.id, fromX: cx, fromY: cy, toX: cx, toY: cy, hoveringNodeId: null };
    canvas.setPointerCapture(e.pointerId);
    e.stopPropagation();
    return;
  }
  
  // ... normal drag logic ...
}
```

### Updated onPointerMove

```typescript
function onPointerMove(e: PointerEvent) {
  if (edgeDrawing) {
    edgeDrawing.toX = wx;
    edgeDrawing.toY = wy;
    const hovering = hitTest(wx, wy);
    edgeDrawing.hoveringNodeId = (hovering && hovering.id !== edgeDrawing.fromNodeId) ? hovering.id : null;
    return;
  }
  // ... resize and drag logic ...
}
```

### Updated onPointerUp

```typescript
function onPointerUp(e: PointerEvent) {
  if (edgeDrawing) {
    const target = hitTest(wx, wy);
    if (target && target.id !== edgeDrawing.fromNodeId) {
      // Show edge type picker before creating
      showEdgeTypePicker(edgeDrawing.fromNodeId, target.id, e.clientX, e.clientY);
    }
    edgeDrawing = null;
    return;
  }
  resizing = null;
  dragging = null;
}
```

### Edge Type Picker (DOM overlay)

```typescript
function showEdgeTypePicker(fromId: string, toId: string, sx: number, sy: number) {
  const types: Array<{ type: Edge['type']; label: string; dash: string }> = [
    { type: 'relationship', label: '→ Relationship', dash: 'solid' },
    { type: 'dependency', label: '⤳ Dependency', dash: 'dashed' },
    { type: 'annotation', label: '✎ Annotation', dash: 'dotted' },
    { type: 'composition', label: '◈ Composition', dash: 'solid bold' },
  ];
  
  const picker = document.createElement('div');
  picker.style.cssText = `position:fixed;left:${sx}px;top:${sy}px;
    background:#051018;border:1px solid rgba(77,201,246,0.25);
    border-radius:6px;padding:6px;z-index:300;
    font:400 11px "JetBrains Mono",monospace;`;
  
  for (const { type, label } of types) {
    const row = document.createElement('div');
    row.textContent = label;
    row.style.cssText = 'color:#8cb8cc;padding:5px 10px;cursor:pointer;border-radius:3px;';
    row.onmouseenter = () => row.style.background = 'rgba(77,201,246,0.1)';
    row.onmouseleave = () => row.style.background = '';
    row.onclick = () => {
      addEdge({ from: fromId, to: toId, type, source: 'human-drawn' });
      picker.remove();
    };
    picker.appendChild(row);
  }
  
  document.body.appendChild(picker);
  setTimeout(() => window.addEventListener('click', () => picker.remove(), { once: true }), 0);
}
```

### Ghost Edge Rendering in renderer.ts

```typescript
import { getEdgeDrawing } from '../canvas/interactions';

// In render(), after drawing edges but before drawing nodes:
const ed = getEdgeDrawing();
if (ed) {
  drawGhostEdge(ctx, ed, isDark);
}

function drawGhostEdge(ctx, ed, isDark) {
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(77, 201, 246, 0.6)' : 'rgba(42, 107, 138, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  
  ctx.beginPath();
  ctx.moveTo(ed.fromX, ed.fromY);
  ctx.lineTo(ed.toX, ed.toY);
  ctx.stroke();
  
  // Pulse circle at destination
  ctx.setLineDash([]);
  ctx.strokeStyle = ed.hoveringNodeId
    ? (isDark ? '#7dd8f7' : '#2a6b8a')   // highlight when hovering valid target
    : (isDark ? 'rgba(77,201,246,0.3)' : 'rgba(42,107,138,0.3)');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ed.toX, ed.toY, 5, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}
```

Also: **highlight valid target nodes** when edge drawing:

```typescript
// In drawNode(), add halo around target when edge-drawing:
const ed = getEdgeDrawing();
if (ed && ed.hoveringNodeId === node.id) {
  ctx.strokeStyle = isDark ? '#7dd8f7' : '#2a6b8a';
  ctx.lineWidth = 2;
  ctx.shadowColor = isDark ? 'rgba(77,201,246,0.5)' : 'rgba(42,107,138,0.3)';
  ctx.shadowBlur = 12;
  roundRect(ctx, x - 2, y - 2, width + 4, height + 4, 6);
  ctx.stroke();
  ctx.shadowBlur = 0;
}
```

### Success Criteria (Phase 5)
Screenshot shows:
- [ ] Shift+drag from a node shows a dashed ghost line following cursor
- [ ] When cursor hovers another node, that node gets a cyan glow halo
- [ ] Releasing over another node shows edge type picker
- [ ] Picking "Relationship" creates a solid arrow between the nodes
- [ ] Picking "Dependency" creates a dashed arrow
- [ ] Releasing on empty canvas cancels without creating edge
- [ ] New edges are immediately visible on canvas

---

## PHASE 6: Nested Frame Composition
**Estimated time: 4 hours**
**Files: src/lenses/frame.ts (new), src/canvas/renderer.ts, src/canvas/interactions.ts, src/core/graph.ts**

### The Mental Model

A **Frame** is a node that visually contains other nodes (its children).
- Children are rendered scaled/clipped inside the parent frame
- Dragging a node while holding `Ctrl` and dropping onto a frame makes it a child
- The frame auto-expands to contain children
- Children move with parent when parent is dragged

This implements the "recursive composition" concept: frames become meaning through what they contain.

### Data Model

`LensNode.parent` field already exists. We need:
1. `getAllChildren(parentId)` in graph.ts
2. FrameLens to render children recursively
3. Interaction changes for nest/unnest

```typescript
// Add to graph.ts:
export function getChildren(parentId: string): LensNode[] {
  return getAllNodes().filter(n => n.parent === parentId);
}

export function nestNode(childId: string, parentId: string): void {
  updateNode(childId, { parent: parentId });
  addEdge({ from: parentId, to: childId, type: 'composition', source: 'human-drawn' });
}

export function unnestNode(childId: string): void {
  const child = getNode(childId);
  if (!child?.parent) return;
  updateNode(childId, { parent: undefined });
  // Remove composition edges
  const edges = getEdgesFor(childId).filter(e => 
    e.type === 'composition' && (e.from === child.parent || e.to === child.parent)
  );
  for (const e of edges) removeEdge(e.id);
}
```

### src/lenses/frame.ts (new)

```typescript
// FrameLens — renders child nodes inside this node's bounds
// Triggered when a node has children via node.parent

import { getChildren } from '../core/graph';
import { matchLens, getLensById } from '../core/lens-registry';
import type { LensNode, Rect } from '../core/types';

export const FrameLens = {
  id: 'frame',
  name: 'Frame',
  
  matches(dataType: string, data: unknown): number {
    return 0; // Never auto-matches — only used when explicitly set or has children
  },
  
  render(ctx, data, bounds, options) {
    const { x, y, width, height } = bounds;
    const { isDark, selected } = options;
    
    // Frame background — subtle, container feel
    ctx.fillStyle = isDark ? 'rgba(2,10,18,0.6)' : 'rgba(248,245,240,0.6)';
    roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    
    // Dashed frame border (container visual language)
    ctx.strokeStyle = isDark ? 'rgba(77,201,246,0.2)' : 'rgba(42,74,90,0.15)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.setLineDash([6, 4]);
    roundRect(ctx, x, y, width, height, 6);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Frame label (top-left)
    const label = typeof data === 'object' && data !== null && 'name' in (data as any)
      ? String((data as any).name)
      : options.descriptor ?? 'Frame';
    
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,74,90,0.4)';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + 10, y + 8);
    
    // Children rendered in scaled sub-viewport
    const nodeId = (options as any).nodeId;
    if (!nodeId) return;
    
    const children = getChildren(nodeId);
    if (children.length === 0) {
      // Empty frame hint
      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? 'rgba(77,201,246,0.15)' : 'rgba(42,74,90,0.12)';
      ctx.textAlign = 'center';
      ctx.fillText('ctrl+drag node here to nest', x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      return;
    }
    
    // Compute bounding box of all children
    const childBounds = computeChildBounds(children);
    
    // Scale to fit children within frame (with padding)
    const innerX = x + 10, innerY = y + 26;
    const innerW = width - 20, innerH = height - 36;
    
    const scaleX = innerW / childBounds.width;
    const scaleY = innerH / childBounds.height;
    const scale = Math.min(scaleX, scaleY, 1.0); // never magnify
    
    ctx.save();
    ctx.rect(x + 6, y + 20, width - 12, height - 26); // clip to inner area
    ctx.clip();
    
    // Translate + scale to fit children
    ctx.translate(innerX - childBounds.x * scale, innerY - childBounds.y * scale);
    ctx.scale(scale, scale);
    
    for (const child of children) {
      const childLens = getLensById(child.lens) ?? matchLens(child.dataType, child.data);
      childLens.render(ctx, child.data, child.position, {
        ...options,
        selected: false, // don't show selection handles inside frame
        nodeId: child.id,
      });
    }
    
    ctx.restore();
  },
};

function computeChildBounds(nodes: LensNode[]): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + n.position.width);
    maxY = Math.max(maxY, n.position.y + n.position.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
```

### Nest Interaction (Ctrl+drag-drop)

```typescript
// In interactions.ts, onPointerUp():
if (dragging && e.ctrlKey) {
  const draggedNode = getAllNodes().find(n => n.id === dragging!.nodeId);
  if (draggedNode) {
    // Check if dragged node is now INSIDE another node's bounds
    const potential = getAllNodes().find(n => 
      n.id !== draggedNode.id &&
      !n.parent && // don't nest into already-nested
      isInsideBounds(draggedNode.position, n.position)
    );
    if (potential) {
      nestNode(draggedNode.id, potential.id);
      // If parent doesn't have FrameLens, switch it
      if (potential.lens !== 'frame') {
        updateNode(potential.id, { lens: 'frame' });
      }
    }
  }
}

function isInsideBounds(inner: Rect, outer: Rect): boolean {
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return cx > outer.x && cx < outer.x + outer.width
      && cy > outer.y && cy < outer.y + outer.height;
}
```

### Renderer: pass nodeId to lens options

```typescript
// In drawNode():
lens.render(ctx, node.data, node.position, {
  isDark,
  selected: node.id === selectedNodeId,
  source: node.source,
  descriptor,
  meaning: node.meaning,
  abstractionLevel: node.abstractionLevel,
  dataType: node.dataType,
  nodeId: node.id,  // NEW — needed by FrameLens to get children
});
```

### Auto-expand Frame to fit children

```typescript
// Add to graph.ts or a new util:
export function autoSizeFrame(frameId: string) {
  const children = getChildren(frameId);
  if (children.length === 0) return;
  const frame = getNode(frameId);
  if (!frame) return;
  
  const childBounds = computeChildBounds(children);
  const minW = childBounds.width + 60;
  const minH = childBounds.height + 80;
  
  updateNode(frameId, {
    position: {
      ...frame.position,
      width: Math.max(frame.position.width, minW),
      height: Math.max(frame.position.height, minH),
    },
  });
}
```

### `U` Key to Unnest

```typescript
// In onKeyDown():
if ((e.key === 'u' || e.key === 'U') && sel && !e.ctrlKey) {
  e.preventDefault();
  unnestNode(sel);
}
```

### Success Criteria (Phase 6)
Screenshot shows:
- [ ] Ctrl+drag a card node onto a larger frame node nests it
- [ ] Parent node switches to FrameLens (dashed border, frame label)
- [ ] Miniaturized child nodes render inside parent bounds
- [ ] Multiple children render as a scaled grid inside frame
- [ ] Empty frame shows placeholder text "ctrl+drag node here to nest"
- [ ] `U` key unnests a selected child
- [ ] Dragging a parent frame also moves it in viewport (children stay nested visually)

---

## PHASE 7: Drawing Mode + Shape Recognition
**Estimated time: 4 hours**
**Files: src/canvas/draw-mode.ts (new), src/lenses/shape.ts (new), src/canvas/interactions.ts, src/canvas/renderer.ts**

### The Concept

Press `D` to enter drawing mode. Freehand strokes are captured.
When pen lifts, the stroke is analyzed:
- Circle → creates a node with type 'shape/circle', renders as ring
- Line → creates 'shape/line' node, renders as a directed arrow
- Rectangle → creates 'shape/rect' node, renders as an outlined box
- Unrecognized → creates 'text' node with the stroke path data

This is the "stroke becomes meaning" core of MetaMedium.

### src/canvas/draw-mode.ts (new)

```typescript
import { addNode } from '../core/graph';
import { screenToWorld } from './viewport';
import type { Point } from '../core/types';

let isDrawing = false;
let activeStroke: Point[] = [];
let allStrokes: Point[][] = []; // current frame's in-progress strokes
let drawModeActive = false;

export function isDrawModeActive() { return drawModeActive; }
export function getCurrentStroke() { return activeStroke; }

export function toggleDrawMode() {
  drawModeActive = !drawModeActive;
  // Visual feedback
  document.body.style.cursor = drawModeActive ? 'crosshair' : 'default';
  const indicator = document.getElementById('draw-mode-indicator');
  if (indicator) indicator.style.opacity = drawModeActive ? '1' : '0';
}

export function startStroke(wx: number, wy: number) {
  if (!drawModeActive) return;
  isDrawing = true;
  activeStroke = [{ x: wx, y: wy }];
}

export function continueStroke(wx: number, wy: number) {
  if (!isDrawing) return;
  activeStroke.push({ x: wx, y: wy });
}

export function endStroke(wx: number, wy: number) {
  if (!isDrawing) return;
  isDrawing = false;
  activeStroke.push({ x: wx, y: wy });
  
  if (activeStroke.length > 3) {
    recognizeAndCreate(activeStroke);
  }
  activeStroke = [];
}

function recognizeAndCreate(points: Point[]) {
  const result = recognizeShape(points);
  const bounds = getBounds(points);
  
  addNode({
    data: {
      shape: result.type,
      confidence: result.confidence,
      points: simplifyPoints(points, 20), // store up to 20 keypoints
      bounds,
    },
    dataType: `shape/${result.type}`,
    lens: 'shape',
    position: {
      x: bounds.x - 10,
      y: bounds.y - 10,
      width: Math.max(60, bounds.width + 20),
      height: Math.max(60, bounds.height + 20),
    },
    source: 'human',
    descriptor: `${result.type} (${Math.round(result.confidence * 100)}% confidence)`,
  });
}

// ── Shape Recognition (from MetaMedium day1 patterns) ──

interface ShapeResult { type: 'circle' | 'line' | 'rect' | 'unknown'; confidence: number; }

function recognizeShape(points: Point[]): ShapeResult {
  const bounds = getBounds(points);
  const size = Math.max(bounds.width, bounds.height);
  const pathLen = pathLength(points);
  const directDist = dist(points[0], points[points.length - 1]);
  
  const straightness = directDist / pathLen;
  const aspectRatio = bounds.width / (bounds.height || 1);
  const isClosed = directDist < 50 || directDist / size < 0.15;
  
  // Circle: curved, closed, roughly square aspect
  if (straightness < 0.4 && isClosed && aspectRatio > 0.6 && aspectRatio < 1.6) {
    return { type: 'circle', confidence: 0.8 };
  }
  
  // Line: very straight, not closed
  if (straightness > 0.75 && !isClosed) {
    return { type: 'line', confidence: 0.9 };
  }
  
  // Rectangle: somewhat straight, closed
  if (straightness > 0.5 && isClosed) {
    return { type: 'rect', confidence: 0.7 };
  }
  
  return { type: 'unknown', confidence: 0.3 };
}

function getBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i-1], points[i]);
  return len;
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
}

function simplifyPoints(points: Point[], max: number): Point[] {
  if (points.length <= max) return points;
  const step = Math.floor(points.length / max);
  return points.filter((_, i) => i % step === 0);
}
```

### src/lenses/shape.ts (new)

```typescript
export const ShapeLens = {
  id: 'shape',
  name: 'Shape',
  
  matches(dataType: string): number {
    if (dataType.startsWith('shape/')) return 0.95;
    return 0;
  },
  
  render(ctx, data, bounds, options) {
    const { x, y, width, height } = bounds;
    const { isDark } = options;
    const d = data as { shape: string; confidence: number };
    
    const cx = x + width / 2;
    const cy = y + height / 2;
    const strokeColor = isDark ? '#7dd8f7' : '#2a6b8a';
    const fillColor = isDark ? 'rgba(77,201,246,0.06)' : 'rgba(42,107,138,0.05)';
    
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = 1.5;
    
    switch (d.shape) {
      case 'circle': {
        const r = Math.min(width, height) / 2 - 10;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'line': {
        // Draw from left to right with arrow
        ctx.beginPath();
        ctx.moveTo(x + 12, cy);
        ctx.lineTo(x + width - 12, cy);
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(x + width - 12, cy);
        ctx.lineTo(x + width - 20, cy - 6);
        ctx.lineTo(x + width - 20, cy + 6);
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();
        break;
      }
      case 'rect': {
        ctx.beginPath();
        roundRect(ctx, x + 10, y + 10, width - 20, height - 20, 3);
        ctx.fill();
        ctx.stroke();
        break;
      }
      default: {
        // Unknown — show a question mark
        ctx.font = `${Math.min(width, height) * 0.4}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isDark ? 'rgba(77,201,246,0.3)' : 'rgba(42,74,90,0.25)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      }
    }
    
    // Confidence label
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(77,201,246,0.3)' : 'rgba(42,74,90,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText(`${d.shape} ${Math.round(d.confidence * 100)}%`, cx, y + height - 8);
    ctx.textAlign = 'left';
  },
};
```

### Integration in interactions.ts

```typescript
import { isDrawModeActive, startStroke, continueStroke, endStroke } from './draw-mode';

// In onPointerDown:
if (isDrawModeActive()) {
  startStroke(wx, wy);
  return; // don't do node selection
}

// In onPointerMove:
if (isDrawModeActive()) {
  continueStroke(wx, wy);
  return;
}

// In onPointerUp:
if (isDrawModeActive()) {
  endStroke(wx, wy);
  return;
}

// In onKeyDown:
if (e.key === 'd' || e.key === 'D') {
  if (!e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    toggleDrawMode();
  }
}
```

### Draw Mode Rendering in renderer.ts

```typescript
import { isDrawModeActive, getCurrentStroke } from './draw-mode';

// In render(), after world transform, draw in-progress stroke:
if (isDrawModeActive()) {
  const stroke = getCurrentStroke();
  if (stroke.length > 1) {
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(77,201,246,0.6)' : 'rgba(42,107,138,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }
  
  // Draw mode overlay text (screen space)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillStyle = isDark ? 'rgba(77,201,246,0.6)' : 'rgba(42,107,138,0.6)';
  ctx.fillText('✏ DRAW MODE — D to exit', 16, 40);
}
```

### Draw Mode Indicator in index.html

```html
<!-- Add to index.html -->
<div id="draw-mode-indicator" style="
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: rgba(77,201,246,0.15); border: 1px solid rgba(77,201,246,0.3);
  color: #7dd8f7; font: 500 12px 'JetBrains Mono', monospace;
  padding: 6px 16px; border-radius: 20px; opacity: 0; transition: opacity 0.2s;
  pointer-events: none; z-index: 100;
">✏ Draw Mode — D to exit · Circle, Line, or Rectangle</div>
```

### Register ShapeLens in main.ts

```typescript
import { ShapeLens } from './lenses/shape';
registerLens(ShapeLens);
```

### Success Criteria (Phase 7)
Screenshot shows:
- [ ] Pressing D shows "DRAW MODE" overlay text and crosshair cursor
- [ ] Drawing a circle shape: ink trail follows pointer, then a circle-shaped node appears
- [ ] Drawing a line: creates an arrow node
- [ ] Drawing a rectangle: creates a box node
- [ ] Shape node shows the recognized shape type and confidence %
- [ ] Right-clicking shape node shows lens picker with ShapeLens active
- [ ] Pressing D again exits draw mode

---

## PHASE 8: Keyboard Shortcuts HUD + Polish Pass
**Estimated time: 2 hours**
**Files: src/ui/shortcuts-hud.ts (new), src/main.ts, index.html**

### Shortcuts reference overlay (? key)

```typescript
// src/ui/shortcuts-hud.ts
const SHORTCUTS = [
  ['F', 'Flip node front/back'],
  ['L', 'Open lens picker'],
  ['D', 'Toggle draw mode'],
  ['U', 'Unnest selected node'],
  ['Delete / ⌫', 'Remove node'],
  ['Shift+drag', 'Draw edge from node'],
  ['Ctrl+drag', 'Nest into frame'],
  ['Ctrl+scroll', 'Zoom'],
  ['Scroll', 'Pan'],
  ['Alt+drag', 'Pan'],
  ['Double-click', 'Flip node / Create node'],
  ['Right-click', 'Lens picker'],
  ['?', 'Toggle this help'],
];

export function toggleShortcutsHud() {
  // Toggle DOM overlay with keyboard shortcuts
}
```

### Final Polish Checklist

These are small improvements that make the tool feel finished:

1. **Lens badge clickable** — clicking "CARD ∿" on a node opens lens picker (same as R-click)
2. **Node count in status bar** — bottom bar shows "N nodes · E edges"
3. **Zoom level display** — "100%" shown in corner, click to reset
4. **Fit all button** — zoom/pan to fit all nodes in viewport
5. **Auto-pan when creating near edge** — if new node would be off-screen, pan to center it
6. **Edge label rendering** — render edge.label text as small floating label at midpoint
7. **Selection box drag** — drag on empty canvas to select multiple nodes (future)

### Status Bar Implementation

```html
<!-- Add to index.html -->
<div id="status-bar" style="
  position: fixed; bottom: 0; left: 0; right: 0; height: 24px;
  background: var(--sea-mid, #051018);
  border-top: 1px solid rgba(77,201,246,0.1);
  display: flex; align-items: center; gap: 16px; padding: 0 12px;
  font: 400 10px 'JetBrains Mono', monospace;
  color: rgba(77,201,246,0.4);
">
  <span id="status-nodes">0 nodes</span>
  <span id="status-edges">0 edges</span>
  <span style="flex:1"></span>
  <span id="status-zoom">100%</span>
  <button id="fit-btn" style="...">Fit All</button>
</div>
```

```typescript
// Update status bar on every graph event:
subscribe(() => {
  const g = getGraph();
  document.getElementById('status-nodes')!.textContent = `${g.nodes.length} nodes`;
  document.getElementById('status-edges')!.textContent = `${g.edges.length} edges`;
});
```

### Success Criteria (Phase 8)
Screenshot shows:
- [ ] `?` shows floating keyboard shortcuts overlay
- [ ] Bottom status bar shows node count, edge count, zoom %
- [ ] "Fit All" button pans+zooms to show all nodes
- [ ] Edge labels render at midpoint of each edge curve
- [ ] Lens badge text at bottom-right of each card is mouse-hoverable (cursor:pointer hint visible)

---

## Execution Order & Time Estimates

| Phase | Feature | Time | Risk |
|-------|---------|------|------|
| 1 | Card/code/tree text layout polish | 2-3h | Low |
| 2 | Front/back flip | 3h | Low |
| 3 | Resize handles | 2-3h | Medium |
| 4 | Lens switcher HUD | 2h | Low |
| 5 | Edge drawing | 3h | Medium |
| 6 | Nested frames | 4h | High |
| 7 | Draw mode + shapes | 4h | Medium |
| 8 | Polish + shortcuts | 2h | Low |

**Total: ~22-25 hours (tight overnight)**

Recommended overnight order: **1 → 2 → 4 → 3 → 5 → 8** (phases 6+7 are "second night")

Phases 1, 2, 4 have the biggest visible UX impact per hour. Ship these first.

---

## Critical Implementation Notes

### Pretext Caching — DO NOT Skip
The `getPrepared()` function in text-wrap.ts already caches by `font::text` key.
But the renderer calls this every frame. Ensure cache is warm before render.

One issue: `prepareWithSegments` takes ~19ms. With 10 nodes × multiple text strings,
cold start could be 200ms. Solution already in text-wrap.ts (cache LRU with 200 entries).
But: if a node's `data` changes, `font::text` key changes → re-prepared automatically. ✓

### DPR Scaling — Font Strings Must Match
The canvas context uses DPR scaling. When `ctx.font = '13px "JetBrains Mono"'`
is set, pretext uses that string as a cache key. As long as `ctx.font` is set
BEFORE calling `wrapText()`, the caching works correctly. Always set font first.

### Flip Animation — Canvas Transform Safety
When applying `ctx.scale(1, scaleY)` for flip animation:
- Always `ctx.save()` before and `ctx.restore()` after
- Use `ctx.translate(cx, cy)` THEN `ctx.scale()` THEN `ctx.translate(-cx, -cy)`
- Lens renderers use bounds.x/y directly, so the translate must be exact

### Edge Drawing — Z-Order Matters
Ghost edge should render ABOVE nodes (so it's visible over cards).
Current render order: grid → edges → nodes.
Change to: grid → edges → nodes → ghost_edge → in-progress_stroke

### Frame Recursion — Prevent Infinite Loops
FrameLens renders children which might themselves be frames.
Add a `depth` parameter and stop at depth = 3:
```typescript
render(ctx, data, bounds, options, depth = 0) {
  if (depth > 3) return; // prevent infinite recursion
  // ... for children: childLens.render(ctx, ..., options, depth + 1) ...
}
```

### Shape Node Size — Sensible Defaults
When `recognizeShape()` produces 'unknown' type:
- Don't create a node — show a flash error indicator instead
- Minimum: only create nodes if `confidence > 0.5`
- Add a small "rejected" flash animation in draw mode

---

## File Change Summary

### New Files
- `src/lenses/back.ts` — Back-side renderer (Phase 2)
- `src/lenses/shape.ts` — Shape lens for drawn nodes (Phase 7)
- `src/lenses/frame.ts` — Frame/container lens (Phase 6)
- `src/canvas/draw-mode.ts` — Drawing mode state + recognition (Phase 7)
- `src/ui/lens-hud.ts` — Lens picker overlay (Phase 4)
- `src/ui/shortcuts-hud.ts` — Keyboard shortcuts overlay (Phase 8)

### Modified Files
- `src/lenses/card.ts` — Typography redesign, zone layout (Phase 1)
- `src/lenses/code.ts` — Replace char-width with pretext measurement (Phase 1)
- `src/lenses/tree.ts` — wrapText for long string values (Phase 1)
- `src/canvas/renderer.ts` — Flip state, animation, ghost edge, draw stroke, FrameLens nodeId (Phase 2,5,6,7)
- `src/canvas/interactions.ts` — F/L/D/U keys, resize handles, edge drawing, Ctrl-nest (Phase 2-7)
- `src/core/graph.ts` — getChildren(), nestNode(), unnestNode() (Phase 6)
- `src/core/lens-registry.ts` — getLensById() export (Phase 4)
- `src/main.ts` — Register BackLens, ShapeLens, FrameLens; wire status bar (Phases 2,6,7,8)
- `index.html` — Status bar, draw-mode indicator, shortcuts overlay

---

## What "Done" Looks Like

When all 8 phases ship, the canvas should:

1. Show beautifully typeset cards with hierarchical text (title > descriptor > content)
2. Let you flip any card to see its raw data (F key) with gold accent, formatted JSON
3. Resize any card by dragging its handles
4. Let you right-click to switch lenses — see confidence bars for each option
5. Let you Shift+drag to draw edges between nodes, with type picker
6. Let you Ctrl+drag a node onto a frame to nest it (miniaturized inside parent)
7. Let you draw circles/lines/rectangles that become shape nodes
8. Show a status bar with node count and a keyboard shortcut reference

This transforms it from "developer demo" to "thinking tool" — a spatial
environment where you drop data in and the system decides how to show it,
you flip it to dig deeper, and you draw connections that mean something.
