// Main render loop
// Pure function of graph state + viewport

import { getAllNodes, getAllEdges, generateDescriptor } from '../core/graph';
import { matchLens } from '../core/lens-registry';
import { getState } from './viewport';
import { drawGrid } from './grid';
import type { LensNode, Edge } from '../core/types';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let animId: number;
let selectedNodeId: string | null = null;
let isDark = true;
let dpr = 1;

export function initRenderer(c: HTMLCanvasElement) {
  canvas = c;
  ctx = c.getContext('2d')!;
  resize();
  window.addEventListener('resize', resize);
  loop();
}

export function setSelectedNode(id: string | null) {
  selectedNodeId = id;
}

export function getSelectedNode(): string | null {
  return selectedNodeId;
}

export function setTheme(dark: boolean) {
  isDark = dark;
}

export function getTheme(): boolean {
  return isDark;
}

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  // Don't ctx.scale here — we handle DPR in every render frame
}

function loop() {
  render();
  animId = requestAnimationFrame(loop);
}

function render() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const vp = getState();
  
  // ── Clear entire canvas buffer (DPR-aware) ──
  ctx.setTransform(1, 0, 0, 1, 0, 0);  // identity — raw pixels
  ctx.fillStyle = isDark ? '#020a12' : '#f8f5f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);  // full buffer, not clientWidth
  
  // ── Apply DPR scale for all subsequent drawing ──
  // This maps CSS pixels to device pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  // ── Grid (screen space — panX/panY offset but no world transform) ──
  drawGrid(ctx, w, h, vp.panX, vp.panY, vp.zoom, isDark);
  
  // ── World space (DPR * viewport transform) ──
  ctx.setTransform(
    dpr * vp.zoom, 0,
    0, dpr * vp.zoom,
    dpr * vp.panX, dpr * vp.panY
  );
  
  // Edges
  const edges = getAllEdges();
  const nodes = getAllNodes();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  for (const edge of edges) {
    drawEdge(ctx, edge, nodeMap, isDark);
  }
  
  // Nodes
  for (const node of nodes) {
    drawNode(ctx, node, isDark);
  }
  
  // Reset to identity for any post-render UI
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawNode(ctx: CanvasRenderingContext2D, node: LensNode, isDark: boolean) {
  const lens = matchLens(node.dataType, node.data);
  const descriptor = node.descriptor ?? generateDescriptor(node.data, node.dataType);
  
  lens.render(ctx, node.data, node.position, {
    isDark,
    selected: node.id === selectedNodeId,
    source: node.source,
    descriptor,
    meaning: node.meaning,
    abstractionLevel: node.abstractionLevel,
    dataType: node.dataType,
  });
}

function drawEdge(ctx: CanvasRenderingContext2D, edge: Edge, nodeMap: Map<string, LensNode>, isDark: boolean) {
  const from = nodeMap.get(edge.from);
  const to = nodeMap.get(edge.to);
  if (!from || !to) return;
  
  const fx = from.position.x + from.position.width / 2;
  const fy = from.position.y + from.position.height / 2;
  const tx = to.position.x + to.position.width / 2;
  const ty = to.position.y + to.position.height / 2;
  
  ctx.save();
  
  // Edge style by type
  const baseColor = edge.type === 'annotation'
    ? (isDark ? '#d4af37' : '#9a7b2a')
    : (isDark ? '#4dc9f6' : '#3a7d9c');
  
  ctx.strokeStyle = baseColor;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = edge.type === 'composition' ? 2 : 1;
  
  if (edge.type === 'dependency') ctx.setLineDash([6, 4]);
  else if (edge.type === 'annotation') ctx.setLineDash([2, 4]);
  else ctx.setLineDash([]);
  
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  
  // Simple bezier curve
  const mx = (fx + tx) / 2;
  const my = (fy + ty) / 2;
  const dx = tx - fx;
  const dy = ty - fy;
  const cx = mx - dy * 0.1;
  const cy = my + dx * 0.1;
  ctx.quadraticCurveTo(cx, cy, tx, ty);
  ctx.stroke();
  
  // Arrowhead for relationship/dependency
  if (edge.type === 'relationship' || edge.type === 'dependency') {
    const angle = Math.atan2(ty - cy, tx - cx);
    const size = 6;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - size * Math.cos(angle - 0.4), ty - size * Math.sin(angle - 0.4));
    ctx.lineTo(tx - size * Math.cos(angle + 0.4), ty - size * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.restore();
}

export function stopRenderer() {
  cancelAnimationFrame(animId);
}
