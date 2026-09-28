// What several tools read of a scope, in one place: the definitions in it,
// its artifacts, which marks are writing, and the line of writing a concept
// found in it. Pure reads over the board; nothing here writes.

import type { MMNode, Rep, Transcript } from '../session/nodes';
import { getRep, isWord, transcriptsOf } from '../session/nodes';
import { interpretationsOf } from '../session/interpretations';
import type { SessionState } from '../session/session';
import type { ToolScope } from './tool';

type Board = Pick<SessionState, 'nodes' | 'artifacts'>;

/** A node's newest code rep, or null — the version that renders. */
export function codeRepOf(node: MMNode): (Rep & { data: { kind?: string; code?: string; from?: string } }) | null {
  for (let i = node.reps.length - 1; i >= 0; i--) {
    if (node.reps[i].modality === 'code') return node.reps[i] as Rep & { data: { kind?: string; code?: string; from?: string } };
  }
  return null;
}

/** The artifacts among some ids, each once. */
export function artifactsIn(board: Pick<SessionState, 'artifacts'>, ids: readonly string[]): string[] {
  const artifacts = new Set(board.artifacts);
  return [...new Set(ids.filter((id) => artifacts.has(id)))];
}

/** The definition an artifact belongs to: what it is an instance of, else itself. */
export function definitionOf(board: Pick<SessionState, 'nodes'>, artifactId: string): string {
  const node = board.nodes.get(artifactId);
  const inst = node?.edges.find((e) => e.rel === 'instance-of');
  return inst ? inst.to : artifactId;
}

/** The definitions the scope's artifacts belong to, each once, in the order they are held. */
export function definitionsIn(board: Board, ids: readonly string[]): string[] {
  return [...new Set(artifactsIn(board, ids).map((id) => definitionOf(board, id)))];
}

/**
 * Whether a mark is writing: the shape rung's own top reading of it — a name
 * the hand gave it aside — is `text`. The one test the field, reading and
 * the tools ask.
 */
export function isWritingMark(node: MMNode, nodes: ReadonlyMap<string, MMNode>): boolean {
  const shape = interpretationsOf(node, nodes).filter((r) => r.tier === 0 && r.basis !== 'label')[0];
  return !!shape && shape.label === 'text';
}

/** Every held mark is writing: cursive the rung reads as text, or letters gathered into a word. */
export function allWriting(scope: ToolScope): boolean {
  const nodes = scope.state.nodes;
  return scope.marks.length > 0 && scope.marks.every((id) => {
    const n = nodes.get(id);
    return !!n && (isWritingMark(n, nodes) || isWord(n));
  });
}

/** The line of writing a scope holds, as the `writing` concept found it, and what it says when every word is read. */
export interface WritingLine {
  /** The words on the line, in reading order — empty when the concept did not read one. */
  ids: string[];
  /** Each word's leading transcript, where it has one. */
  said: (Transcript | undefined)[];
  /** Two words or more, every one of them read. */
  read: boolean;
  /** The line's words, joined, when it is read; '' otherwise. */
  text: string;
  /** The least sure of its words' readings, when it is read. */
  confidence: number;
}

export function writingLine(scope: ToolScope): WritingLine {
  const writing = scope.reading.concepts.find((c) => c.concept === 'writing');
  const ids = writing?.roles?.words ? writing.roles.words.slice() : [];
  const said = ids.map((id) => {
    const n = scope.state.nodes.get(id);
    return n ? transcriptsOf(n)[0] : undefined;
  });
  const read = ids.length >= 2 && said.every((t) => !!t && !!t.text);
  return {
    ids,
    said,
    read,
    text: read ? said.map((t) => t!.text).join(' ') : '',
    confidence: read ? Math.min(...said.map((t) => t!.confidence)) : 0,
  };
}

/** The box a set of marks spans, or null when none has one. */
export function unionOf(boxes: { minX: number; minY: number; maxX: number; maxY: number }[]) {
  if (!boxes.length) return null;
  return boxes.reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY) }));
}

/** Whether a node is on the board still. */
export const isErased = (node: MMNode | undefined): boolean => !node || !!getRep(node, 'erased');
