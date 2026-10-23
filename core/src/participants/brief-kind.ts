// What should this brief make? (the audit's D3) — the decider's third job, asked on the Enter that sends a brief.
//
// A brief typed at a loop used to be a page or a program by the drawing's geometry alone (the surface's `targetOf`:
// boxes tiling a space or nodes joined by edges are a page, anything else a program), and a wrong guess costs
// minutes of a writer's time on the wrong thing. The words say more than the geometry — *a timer that counts down*
// over three boxes is a program; *what does this flow do?* is a question — and a decision seat reads words. So with
// a decider seated, the Enter that sends a brief first asks it which of a closed list the brief should make: a page,
// a program, a Mermaid diagram (only when the marks read as a notation the canvas can write), a text answer, or none
// of these. Only a sure answer (`DECIDER_TAKE_AT`) is taken; else what the drawing says stands. A prefix (`page:`,
// `run:` …) always wins and nothing is asked. Nothing is held on the board: the question has no marks it is about,
// so the seat proposes nothing — the answer decides what is made, and the status line says it.

import { choice, type ChoiceQuestion } from './decide';

/** The question's id: no node id in it, and nothing on the board under it. */
export const BRIEF_QUESTION = 'brief-kind';

/** What each kind is called in a sentence: "Clef-flash says a program (0.99)". */
export const BRIEF_KIND_WORDS: Readonly<Record<string, string>> = {
  page: 'a page',
  program: 'a program',
  mermaid: 'a Mermaid diagram',
  answer: 'a text answer',
};

/**
 * The question asked: which of these the brief should make, none of these among them. `diagram` is how the marks
 * read as a notation the canvas can write in Mermaid (`describeNotation`'s words), or null — then no Mermaid is offered.
 */
export function briefQuestion(options: { diagram?: string | null } = {}): ChoiceQuestion {
  const candidates = [
    { id: 'page', text: 'a page — the drawing’s boxes as a web page, its words written into them' },
    { id: 'program', text: 'a program — something that runs: it draws itself, moves, or answers the pointer' },
    ...(options.diagram ? [{ id: 'mermaid', text: `a Mermaid diagram — the drawing said as diagram text; it reads as ${options.diagram}` }] : []),
    { id: 'answer', text: 'a text answer — words that answer a question about the marks; nothing is made' },
  ];
  return choice(BRIEF_QUESTION, 'what should this brief make from the marks held?', candidates, undefined, { reading: false });
}
