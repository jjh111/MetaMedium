// A participant is on the board it is asked on (the I7 finding, 1 Oct 2026).
//
// A model joins through `session.join`, and a join is an event in the board's log — so a board loaded
// in place (a switch through the boards pane, a file, an example, Reset) takes every join with it,
// while the surface still holds the model the hand joined. Asked on the new board, the model
// answered *that participant is not in this session*.
//
// The rule, shared by every kind of seat a model can hold (an agent, the decision seat, a bridge, the
// canvas's own seat): **seat it again where it is asked, lazily, once.** Lazily, because a board the
// hand only looked at is never written (V1-PLAN R5's first-run reasoning) — loading a board writes
// nothing, and the first ask is the deliberate act that joins. Once, because a board that already
// holds its join — a board reopened — must not get a second: the participant stands where the board
// says it does.
//
// Pure functions of the state, and one door onto the session; nothing here asks a model anything.

import type { Session, SessionEvent, SessionState } from '../session/session';
import { getRep, wordOf, localityOf, type Capability, type Locality, type ParticipantKind } from '../session/nodes';

/** What a participant is, as a board holds it: who it says it is, at which tier, where it runs. */
export interface Seating {
  kind: ParticipantKind;
  name: string;
  capability: Capability;
  locality: Locality;
}

/** The kind a participant node says it is, or null for a node that is no participant. */
function kindOf(state: SessionState, id: string): ParticipantKind | null {
  const node = state.nodes.get(id);
  const rep = node ? getRep(node, 'participant') : undefined;
  const kind = (rep?.data as { kind?: ParticipantKind } | undefined)?.kind;
  return kind === 'human' || kind === 'agent' || kind === 'engine' ? kind : null;
}

/**
 * The participants another hand's log joined, by the id each join mints (`participant:<log>:<number>`): what a
 * merge stamped `by`. **A seat is never seated on one** (undo per hand, V1-PLAN L2j): two pages that seat a model
 * under one name — dyna.ink's own writer, on every page of a room — would otherwise share the first hand's
 * participant, and that hand's undo of its own join would take the other's readings off every board with it.
 * A join with no log name mints a counter, which names nothing here; it is never another's on a board that merges
 * no other log.
 */
export function othersJoined(events: readonly SessionEvent[]): Set<string> {
  const others = new Set<string>();
  for (const ev of events) {
    if (ev.type !== 'join' || ev.by === undefined || !ev.origin || typeof ev.seq !== 'number') continue;
    others.add(`participant:${ev.origin}:${ev.seq}`);
  }
  return others;
}

/**
 * The participant this board already holds for `seating`, or null. `was` — the id it held when last
 * seen — is kept when it still names the same participant; otherwise the first participant on the
 * board of the same kind, name and tier is the one (a board reopened holds its own join for the
 * model, under whatever number the board gave it). **An id alone is never taken for a participant**: the
 * counter that made it is the board's, so another board's `participant:3` may be another model. `others`
 * (`othersJoined`): participants another hand joined, never taken.
 */
export function heldParticipant(state: SessionState, seating: Seating, was?: string, others?: ReadonlySet<string>): string | null {
  const is = (id: string): boolean => {
    const node = state.nodes.get(id);
    if (others && others.has(id)) return false;
    return !!node && kindOf(state, id) === seating.kind && wordOf(node) === seating.name && node.capability === seating.capability;
  };
  if (was && state.participants.includes(was) && is(was)) return was;
  return state.participants.find(is) ?? null;
}

/**
 * The participant for `seating` on this session's board: the one it already holds — joined in this hand's own
 * log, never another hand's (`othersJoined`) — else a new `join` (one event, in this hand's log, `seated`: written
 * by seating, not by a hand's act, so undo never takes it back). Idempotent — the second call finds the first's join.
 */
export function seatOn(session: Session, seating: Seating, was: string | undefined, at: number): string {
  const held = heldParticipant(session.getState(), seating, was, othersJoined(session.getEvents()));
  if (held) return held;
  return session.join(seating.kind, seating.name, at, seating.capability, seating.locality, { seated: true });
}

/** The participant a lazily made seat starts from: this board's own join for it, never another hand's, or ''. */
export function ownParticipant(session: Session, seating: Seating): string {
  return heldParticipant(session.getState(), seating, undefined, othersJoined(session.getEvents())) ?? '';
}

/** What `localityOf` says of a node, for a surface that reads a participant it did not make. */
export { localityOf };
