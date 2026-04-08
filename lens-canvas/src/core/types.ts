// MetaMedium Lens Canvas — Core Types

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LensNode {
  id: string;
  position: Rect;
  data: unknown;
  dataType: string;    // 'json', 'text', 'code', 'number', 'array', ...
  lens: string;        // 'raw', 'card', 'tree', 'code', 'sparkline', ...
  abstractionLevel: 'type' | 'descriptor' | 'meaning';
  descriptor?: string;
  meaning?: string;
  parent?: string;     // composition parent node id
  source: 'human' | 'llm' | 'system';
  created: number;
  updated: number;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  type: 'relationship' | 'dependency' | 'annotation' | 'composition';
  label?: string;
  source: 'human-drawn' | 'llm-emitted' | 'auto-detected';
}

export interface GraphState {
  nodes: Map<string, LensNode>;
  edges: Map<string, Edge>;
}

export type GraphEvent =
  | { type: 'node-added'; node: LensNode }
  | { type: 'node-updated'; node: LensNode; prev: LensNode }
  | { type: 'node-removed'; id: string }
  | { type: 'edge-added'; edge: Edge }
  | { type: 'edge-removed'; id: string }
  | { type: 'graph-loaded' };
