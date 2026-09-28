// Mermaid out (V1-PLAN §3, §9 D2) — red first: the contract, not yet the writer.

import type { NotationReading } from './notation';

export type MermaidDirection = 'TD' | 'LR';

export interface MermaidOptions {
  direction?: MermaidDirection;
  readWith?: (id: string) => boolean;
}

export interface MermaidLink {
  index: number;
  id: string;
  ids: string[];
  from: string;
  to: string;
}

export interface MermaidText {
  text: string;
  notation: string;
  diagram: string;
  direction?: { value: MermaidDirection; reason: string };
  ids: Record<string, string>;
  marks: Record<string, string[]>;
  links: MermaidLink[];
  notes: string[];
}

export type MermaidWriter = (reading: NotationReading, opts: MermaidOptions) => MermaidText;

export const UNREAD_WRITING = '(unread writing)';

export function registerMermaidWriter(_notation: string, _writer: MermaidWriter): () => void {
  return () => {};
}

export function mermaidWriters(): string[] {
  return [];
}

export function toMermaid(reading: NotationReading, _opts: MermaidOptions = {}): MermaidText | null {
  return { text: '', notation: reading.notation, diagram: '', ids: {}, marks: {}, links: [], notes: [] };
}

export function mermaidIds(nodeIds: readonly string[]): Map<string, string> {
  return new Map(nodeIds.map((id) => [id, id]));
}

export function mermaidString(text: string): string {
  return text;
}

export function unescapeMermaid(quoted: string): string {
  return quoted;
}
