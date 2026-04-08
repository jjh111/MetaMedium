// Canvas interactions — node selection, drag, resize, double-click create, lens switcher
import { screenToWorld, worldToScreen, getState } from './viewport';
import { getAllNodes, addNode, updateNode, removeNode, generateDescriptor, inferDataType } from '../core/graph';
import { setSelectedNode, getSelectedNode, toggleFlip, getHandlePositions } from './renderer';
import type { HandleName } from './renderer';
import { showLensHud, closeLensHud } from '../ui/lens-hud';
import type { LensNode, Rect } from '../core/types';

let canvas: HTMLCanvasElement;
let dragging: { nodeId: string; offsetX: number; offsetY: number } | null = null;
let resizing: { nodeId: string; handle: HandleName; startPos: Rect; startX: number; startY: number } | null = null;

const MIN_WIDTH = 160;
const MIN_HEIGHT = 100;
const HANDLE_RADIUS = 6; // px in world space

const CURSOR_MAP: Record<string, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize', se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
};

export function initInteractions(c: HTMLCanvasElement) {
  canvas = c;
  
  c.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  c.addEventListener('dblclick', onDoubleClick);
  c.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('paste', onPaste);
}

function hitTest(wx: number, wy: number): LensNode | null {
  const nodes = getAllNodes();
  // Reverse order = top-most first
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const { x, y, width, height } = n.position;
    if (wx >= x && wx <= x + width && wy >= y && wy <= y + height) {
      return n;
    }
  }
  return null;
}

function hitTestHandle(wx: number, wy: number, node: LensNode): HandleName | null {
  const handles = getHandlePositions(node.position);
  // Scale handle radius by inverse zoom so handles stay usable at any zoom level
  const zoom = getState().zoom;
  const radius = HANDLE_RADIUS / zoom;
  for (const [name, hx, hy] of handles) {
    const dx = wx - hx;
    const dy = wy - hy;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) return name;
  }
  return null;
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0 || e.altKey) return; // alt = pan (handled by viewport)
  
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
        resizing = {
          nodeId: sel,
          handle,
          startPos: { ...selNode.position },
          startX: wx,
          startY: wy,
        };
        canvas.setPointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }
    }
  }
  
  // 2. Then check node drag
  const hit = hitTest(wx, wy);
  if (hit) {
    setSelectedNode(hit.id);
    dragging = {
      nodeId: hit.id,
      offsetX: wx - hit.position.x,
      offsetY: wy - hit.position.y,
    };
    canvas.setPointerCapture(e.pointerId);
    e.stopPropagation();
  } else {
    setSelectedNode(null);
  }
}

function onPointerMove(e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = screenToWorld(sx, sy);

  if (resizing) {
    const { nodeId, handle, startPos, startX, startY } = resizing;
    const dx = wx - startX;
    const dy = wy - startY;
    
    let { x, y, width, height } = startPos;
    
    // East handles: grow width rightward
    if (handle.includes('e')) {
      width = Math.max(MIN_WIDTH, startPos.width + dx);
    }
    // South handles: grow height downward
    if (handle.includes('s')) {
      height = Math.max(MIN_HEIGHT, startPos.height + dy);
    }
    // West handles: move left edge, grow width leftward
    if (handle.includes('w')) {
      const newWidth = Math.max(MIN_WIDTH, startPos.width - dx);
      x = startPos.x + (startPos.width - newWidth);
      width = newWidth;
    }
    // North handles: move top edge, grow height upward
    if (handle.includes('n')) {
      const newHeight = Math.max(MIN_HEIGHT, startPos.height - dy);
      y = startPos.y + (startPos.height - newHeight);
      height = newHeight;
    }
    
    updateNode(nodeId, { position: { x, y, width, height } });
    return;
  }

  if (dragging) {
    updateNode(dragging.nodeId, {
      position: {
        ...getAllNodes().find(n => n.id === dragging!.nodeId)!.position,
        x: wx - dragging.offsetX,
        y: wy - dragging.offsetY,
      },
    });
    return;
  }
  
  // Cursor hints when hovering handles on selected node
  const sel = getSelectedNode();
  if (sel) {
    const node = getAllNodes().find(n => n.id === sel);
    if (node) {
      const handle = hitTestHandle(wx, wy, node);
      if (handle) {
        canvas.style.cursor = CURSOR_MAP[handle] ?? 'default';
        return;
      }
    }
  }
  
  // Default cursor: grab on hover over nodes, default otherwise
  const hover = hitTest(wx, wy);
  canvas.style.cursor = hover ? 'grab' : 'default';
}

function onPointerUp() {
  if (resizing) {
    resizing = null;
  }
  if (dragging) {
    dragging = null;
  }
}

function onDoubleClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = screenToWorld(sx, sy);
  
  // Check if we hit an existing node — flip it
  const hit = hitTest(wx, wy);
  if (hit) {
    toggleFlip(hit.id);
    return;
  }
  
  // Create new node — show input
  showCreateModal(wx, wy);
}

function onContextMenu(e: MouseEvent) {
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
}

function onKeyDown(e: KeyboardEvent) {
  const sel = getSelectedNode();
  if (!sel) return;
  
  // Skip if user is typing in an input
  if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    removeNode(sel);
    setSelectedNode(null);
  }
  
  // F to flip selected node (front/back)
  if (e.key === 'f' || e.key === 'F') {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleFlip(sel);
    }
  }

  // L to open lens switcher HUD
  if (e.key === 'l' || e.key === 'L') {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const node = getAllNodes().find(n => n.id === sel);
      if (node) {
        // Position HUD near the top-center of the node
        const { x: sx, y: sy } = worldToScreen(
          node.position.x + node.position.width / 2,
          node.position.y
        );
        showLensHud(sel, sx, sy);
      }
    }
  }
}

// ── Auto-height estimation ──

function estimateNodeHeight(data: unknown, dataType: string, width: number): number {
  const baseH = 80;
  
  if (dataType === 'json' && typeof data === 'object' && data !== null) {
    const keys = Object.keys(data as Record<string, unknown>);
    return Math.min(500, Math.max(baseH, 60 + keys.length * 16));
  }
  if (dataType === 'code') {
    const lines = String(data).split('\n').length;
    return Math.min(500, Math.max(baseH, 40 + lines * 15));
  }
  if (dataType === 'text') {
    const str = String(data);
    // Rough estimate: ~8px per character in 11px monospace, wrap at (width-32)
    const contentW = width - 32;
    const charsPerLine = Math.max(1, Math.floor(contentW / 7));
    const lineCount = Math.ceil(str.length / charsPerLine);
    return Math.min(400, Math.max(baseH, 60 + lineCount * 16));
  }
  return 140; // default
}

function onPaste(e: ClipboardEvent) {
  // Don't intercept if user is typing in an input
  if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
  
  const text = e.clipboardData?.getData('text/plain');
  if (!text?.trim()) return;
  e.preventDefault();
  
  let data: unknown = text.trim();
  try { data = JSON.parse(text.trim()); } catch { /* keep as string */ }
  
  const dataType = inferDataType(data);
  const descriptor = generateDescriptor(data, dataType);
  
  // Place near center of current viewport
  const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
  
  // Offset slightly random so multiple pastes don't stack
  const jitter = () => (Math.random() - 0.5) * 60;
  
  const nodeWidth = 280;
  const nodeHeight = estimateNodeHeight(data, dataType, nodeWidth);
  
  addNode({
    data,
    dataType,
    descriptor,
    position: { x: center.x - nodeWidth / 2 + jitter(), y: center.y - nodeHeight / 2 + jitter(), width: nodeWidth, height: nodeHeight },
  });
}

function showCreateModal(wx: number, wy: number) {
  // Simple modal for PoC — will be replaced with better UI later
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--sea-mid,#051018);border:1px solid var(--border,rgba(77,201,246,0.2));padding:20px;border-radius:4px;width:400px;max-width:90vw';
  
  const label = document.createElement('div');
  label.textContent = 'Paste data (JSON, text, code):';
  label.style.cssText = 'color:var(--text-primary,#8cb8cc);font:400 13px "JetBrains Mono",monospace;margin-bottom:8px';
  
  const textarea = document.createElement('textarea');
  textarea.style.cssText = 'width:100%;height:120px;background:var(--sea-deep,#020a12);color:var(--text-subhead,#e8f4ff);border:1px solid var(--border,rgba(77,201,246,0.2));padding:8px;font:400 12px "JetBrains Mono",monospace;border-radius:2px;resize:vertical';
  textarea.placeholder = 'Type or paste anything...';
  
  const hint = document.createElement('div');
  hint.textContent = 'Enter to create · Esc to cancel';
  hint.style.cssText = 'color:var(--muted,#7a9aaa);font:400 11px "JetBrains Mono",monospace;margin-top:8px';
  
  modal.append(label, textarea, hint);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  textarea.focus();
  
  function create() {
    const raw = textarea.value.trim();
    if (!raw) { close(); return; }
    
    let data: unknown = raw;
    // Try to parse as JSON
    try { data = JSON.parse(raw); } catch { /* keep as string */ }
    
    const dataType = inferDataType(data);
    const descriptor = generateDescriptor(data, dataType);
    
    const nodeWidth = 240;
    const nodeHeight = estimateNodeHeight(data, dataType, nodeWidth);
    
    addNode({
      data,
      dataType,
      descriptor,
      position: { x: wx - nodeWidth / 2, y: wy - nodeHeight / 2, width: nodeWidth, height: nodeHeight },
    });
    close();
  }
  
  function close() {
    document.body.removeChild(overlay);
  }
  
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { create(); e.preventDefault(); }
    if (e.key === 'Escape') close();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
