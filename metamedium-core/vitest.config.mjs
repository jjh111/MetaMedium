// `npm test` is src/: every *.test.ts beside the code it pins.
//
// bench/ is not part of it (bench/lib.mjs: a benchmark that runs on every push
// is a benchmark someone turns off). Its budgets are tests for `node --test`
// on the machine they were set on — bench/budgets.test.mjs — and vitest,
// which would otherwise collect that file by its name and find no suite in
// it, leaves the directory alone.
//
// The notation benches and the Mermaid round trips draw hundreds of boards a
// test; alone they take one to four seconds, and on a loaded machine (a CI
// runner, or agents running beside the suite) a few crossed vitest's five
// second default each run, a different few every time. A timeout is not an
// assertion: the tests' own budgets live in bench/, so the ceiling here only
// has to catch a test that hangs.
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'bench/**'],
    testTimeout: 60_000,
  },
});
