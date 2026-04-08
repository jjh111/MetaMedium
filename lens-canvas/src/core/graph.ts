// Graph Store — the single source of truth
// All mutations go through here. Emits events for renderer.

import type { LensNode, Edge, GraphEvent } from './types';

type Listener = (event: GraphEvent) => void;

const nodes = new Map<string, LensNode>();
const edges = new Map<string, Edge>();
const listeners: Listener[] = [];

function emit(event: GraphEvent) {
  for (const fn of listeners) fn(event);
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => persist(), 500);
}

// ── Public API ──

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function getNode(id: string): LensNode | undefined {
  return nodes.get(id);
}

export function getAllNodes(): LensNode[] {
  return Array.from(nodes.values());
}

export function getEdge(id: string): Edge | undefined {
  return edges.get(id);
}

export function getAllEdges(): Edge[] {
  return Array.from(edges.values());
}

export function getEdgesFor(nodeId: string): Edge[] {
  return getAllEdges().filter(e => e.from === nodeId || e.to === nodeId);
}

export function addNode(partial: Partial<LensNode> & { data: unknown }): LensNode {
  const now = Date.now();
  const node: LensNode = {
    id: partial.id ?? genId('n'),
    position: partial.position ?? { x: 0, y: 0, width: 240, height: 120 },
    data: partial.data,
    dataType: partial.dataType ?? inferDataType(partial.data),
    lens: partial.lens ?? 'raw',
    abstractionLevel: partial.abstractionLevel ?? 'descriptor',
    descriptor: partial.descriptor,
    meaning: partial.meaning,
    parent: partial.parent,
    source: partial.source ?? 'human',
    created: partial.created ?? now,
    updated: partial.updated ?? now,
  };
  nodes.set(node.id, node);
  emit({ type: 'node-added', node });
  scheduleSave();
  return node;
}

export function updateNode(id: string, patch: Partial<LensNode>): LensNode | undefined {
  const prev = nodes.get(id);
  if (!prev) return undefined;
  const updated: LensNode = { ...prev, ...patch, id, updated: Date.now() };
  nodes.set(id, updated);
  emit({ type: 'node-updated', node: updated, prev });
  scheduleSave();
  return updated;
}

export function removeNode(id: string): boolean {
  if (!nodes.delete(id)) return false;
  // Remove connected edges
  for (const [eid, edge] of edges) {
    if (edge.from === id || edge.to === id) {
      edges.delete(eid);
      emit({ type: 'edge-removed', id: eid });
    }
  }
  emit({ type: 'node-removed', id });
  scheduleSave();
  return true;
}

export function addEdge(partial: Partial<Edge> & { from: string; to: string }): Edge {
  const edge: Edge = {
    id: partial.id ?? genId('e'),
    from: partial.from,
    to: partial.to,
    type: partial.type ?? 'relationship',
    label: partial.label,
    source: partial.source ?? 'human-drawn',
  };
  edges.set(edge.id, edge);
  emit({ type: 'edge-added', edge });
  scheduleSave();
  return edge;
}

export function removeEdge(id: string): boolean {
  if (!edges.delete(id)) return false;
  emit({ type: 'edge-removed', id });
  scheduleSave();
  return true;
}

export function getGraph() {
  return {
    nodes: getAllNodes(),
    edges: getAllEdges(),
  };
}

export function clearGraph() {
  nodes.clear();
  edges.clear();
  emit({ type: 'graph-loaded' });
  scheduleSave();
}

// ── Persistence ──

const STORAGE_KEY = 'lens-canvas-graph';

export function persist() {
  const data = {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — silent */ }
}

export function restore(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    nodes.clear();
    edges.clear();
    for (const n of data.nodes ?? []) nodes.set(n.id, n);
    for (const e of data.edges ?? []) edges.set(e.id, e);
    emit({ type: 'graph-loaded' });
    return true;
  } catch {
    return false;
  }
}

// ── Helpers ──

let _counter = 0;
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(++_counter).toString(36)}`;
}

export function inferDataType(data: unknown): string {
  if (data === null || data === undefined) return 'null';
  if (typeof data === 'string') {
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      try { JSON.parse(data); return 'json'; } catch { /* not json */ }
    }
    if (data.includes('function') || data.includes('const ') || data.includes('import ')) return 'code';
    return 'text';
  }
  if (typeof data === 'number') return 'number';
  if (typeof data === 'boolean') return 'boolean';
  if (Array.isArray(data)) {
    if (data.every(v => typeof v === 'number')) return 'number-array';
    return 'array';
  }
  if (typeof data === 'object') return 'json';
  return 'unknown';
}

export function generateDescriptor(data: unknown, dataType: string): string {
  switch (dataType) {
    case 'json': {
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return 'JSON string'; }
      }
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data as Record<string, unknown>);
        return `Object with ${keys.length} keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
      }
      return 'JSON value';
    }
    case 'text': {
      const s = String(data);
      const words = s.split(/\s+/).length;
      return `${words} words`;
    }
    case 'code': return 'Code snippet';
    case 'number': return `Number: ${data}`;
    case 'number-array': {
      const arr = data as number[];
      return `${arr.length} values, range [${Math.min(...arr)}..${Math.max(...arr)}]`;
    }
    case 'array': return `Array with ${(data as unknown[]).length} items`;
    default: return String(dataType);
  }
}
