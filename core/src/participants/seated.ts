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

import type { Session, SessionState } from '../session/session';
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
 * The participant this board already holds for `seating`, or null. `was` — the id it held when last
 * seen — is kept when it still names the same participant; otherwise the first participant on the
 * board of the same kind, name and tier is the one (a board reopened holds its own join for the
 * model, under whatever number the board gave it). **An id alone is never taken for a participant**: the
 * counter that made it is the board's, so another board's `participant:3` may be another model.
 */
export function heldParticipant(state: SessionState, seating: Seating, was?: string): string | null {
  const is = (id: string): boolean => {
    const node = state.nodes.get(id);
    return !!node && kindOf(state, id) === seating.kind && wordOf(node) === seating.name && node.capability === seating.capability;
  };
  if (was && state.participants.includes(was) && is(was)) return was;
  return state.participants.find(is) ?? null;
}

/**
 * The participant for `seating` on this session's board: the one it already holds, else a new `join`
 * (one event, in this hand's log). Idempotent — the second call finds the first's join.
 */
export function seatOn(session: Session, seating: Seating, was: string | undefined, at: number): string {
  const held = heldParticipant(session.getState(), seating, was);
  if (held) return held;
  return session.join(seating.kind, seating.name, at, seating.capability, seating.locality);
}

/** What `localityOf` says of a node, for a surface that reads a participant it did not make. */
export { localityOf };
