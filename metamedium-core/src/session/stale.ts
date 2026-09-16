// A late result, and the board it was about.
//
// A model is asked about marks that are on the board now. It thinks for a
// while — a cold local model takes minutes — and the human keeps drawing. By
// the time the answer lands the target may be erased, the board may have been
// reset or a different log loaded, or the artifact may already carry a newer
// version than the one the model was working from. The answer is not wrong; it
// is about a board that no longer exists.
//
// Such a result is REFUSED, and the refusal says why. Three rules, each learned
// from the same failure (DIRECTOR-REVIEW-2026-09-15, STATE-1):
//
//   - Never a throw. A model answering late must not stop the board; the hand
//     is still drawing and knows nothing about the call.
//   - Never a silent drop. A result that vanishes without a reason is
//     indistinguishable from a result that never came — the same argument that
//     made `MarkMiss` say why a gesture missed.
//   - Never into the log. An event that sits in the log is replayed, so a
//     refused answer parked in the log comes back to life the moment the human
//     undoes their erase. Refusal happens before the event is appended.

/** Why a result was refused. */
export type StaleReason =
  /** The target is not on the board at all. */
  | 'missing'
  /** The human rubbed the target out while the answer was on its way. */
  | 'erased'
  /** The board was reset, or a different log loaded, since the request went out. */
  | 'replaced'
  /** The target moved past the version this answer was computed against. */
  | 'superseded'
  /** Nobody of that name is in this session. */
  | 'unknown-participant';

/**
 * A refused result, in the shape the surface can say out loud. The sibling of
 * `MarkMiss`: nonfatal, transient, and cleared by the next event.
 */
export interface StaleResult {
  /** Which channel was refused. */
  what: 'code' | 'propose' | 'answer';
  reason: StaleReason;
  /** What the result was meant for. */
  nodeId: string;
  /** Who was answering, when the event said. */
  participantId?: string;
  /** One sentence, in the human's terms. */
  detail: string;
  at: number;
}

/**
 * What a deferred caller pins its request to. Scoped to the board and the
 * target — deliberately NOT a global busy flag, which would stop a second
 * model answering about unrelated marks while the first one thinks.
 */
export interface Expectation {
  /** The session generation when the request went out; a load or reset bumps it. */
  generation?: number;
  /**
   * How many versions the target carried when the request went out. Pin it
   * only when the answer was computed FROM that version — a revision. An
   * unpinned attachment stays plural, because several participants may each
   * offer code for the same artifact and no tier commits.
   */
  version?: number;
}

/** The sentence for a refusal — the surface says this, so it is in the human's terms. */
export function describeStale(reason: StaleReason, what: StaleResult['what'], name?: string): string {
  const who = name ? `${name}'s ` : '';
  const answer = what === 'code' ? 'code' : what === 'answer' ? 'answer' : 'reading';
  switch (reason) {
    case 'erased':
      return `the target was erased before ${who}${answer} arrived`;
    case 'missing':
      return `the target was gone before ${who}${answer} arrived`;
    case 'replaced':
      return `the board was replaced before ${who}${answer} arrived`;
    case 'superseded':
      return `the target moved on before ${who}${answer} arrived — it was written against an older version`;
    case 'unknown-participant':
      return `${who || 'that participant '}is not in this session`;
  }
}
