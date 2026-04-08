// Canvas interactions — node selection, drag, double-click create
import { screenToWorld } from './viewport';
import { getAllNodes, addNode, updateNode, removeNode, generateDescriptor, inferDataType } from '../core/graph';
import { setSelectedNode, getSelectedNode } from './renderer';
import type { LensNode } from '../core/types';

let canvas: HTMLCanvasElement;
let dragging: { nodeId: string; offsetX: number; offsetY: number } | null = null;

export function initInteractions(c: HTMLCanvasElement) {
  canvas = c;
  
  c.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  c.addEventListener('dblclick', onDoubleClick);
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

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0 || e.altKey) return; // alt = pan (handled by viewport)
  
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = screenToWorld(sx, sy);
  
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
  if (!dragging) return;
  
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = screenToWorld(sx, sy);
  
  updateNode(dragging.nodeId, {
    position: {
      ...getAllNodes().find(n => n.id === dragging!.nodeId)!.position,
      x: wx - dragging.offsetX,
      y: wy - dragging.offsetY,
    },
  });
}

function onPointerUp() {
  dragging = null;
}

function onDoubleClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = screenToWorld(sx, sy);
  
  // Check if we hit an existing node
  const hit = hitTest(wx, wy);
  if (hit) {
    // Toggle abstraction level
    const levels: Array<'type' | 'descriptor' | 'meaning'> = ['type', 'descriptor', 'meaning'];
    const idx = levels.indexOf(hit.abstractionLevel);
    updateNode(hit.id, { abstractionLevel: levels[(idx + 1) % levels.length] });
    return;
  }
  
  // Create new node — show input
  showCreateModal(wx, wy);
}

function onKeyDown(e: KeyboardEvent) {
  const sel = getSelectedNode();
  if (!sel) return;
  
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
    removeNode(sel);
    setSelectedNode(null);
  }
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
  
  addNode({
    data,
    dataType,
    descriptor,
    position: { x: center.x - 140 + jitter(), y: center.y - 80 + jitter(), width: 280, height: 160 },
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
    
    addNode({
      data,
      dataType,
      descriptor,
      position: { x: wx - 120, y: wy - 60, width: 240, height: 120 },
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
