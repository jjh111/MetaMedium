// `compileFunction`'s shape (MATHS-SPEC §8, C0): the contract between the lane
// that reads maths with a variable (B, M11: `fn.ts` implements it) and the lane
// that plots it (C, M20: `plot.ts` calls it, and until B is merged its tests use
// plain functions of this shape).
//
// A text as written on the page — `x^2 - 4`, `(x²−4)/(x−2)`, `y = 2π√(L/g)`,
// `f(x) = sin x / x` — becomes a function of one variable, or a reason it cannot.
// Never a guess (MATHS-SPEC rule 14): what the grammar cannot read is refused,
// with the reason.

export type CompiledFunction =
  | {
      ok: true;
      /** The value at x; null where it is undefined there (a hole, a pole, outside its domain). */
      f: (x: number) => number | null;
      /** Every name the text uses, the variable among them. */
      variables: string[];
      /** The text as read, in the printer's words (`(x² − 4)/(x − 2)`). */
      text: string;
    }
  | { ok: false; reason: string };

/** `variable` is the one the function is of; `x` when none is said. */
export type CompileFunction = (text: string, variable?: string) => CompiledFunction;
