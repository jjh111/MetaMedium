// `npm test` is src/: every *.test.ts beside the code it pins.
//
// bench/ is not part of it (bench/lib.mjs: a benchmark that runs on every push
// is a benchmark someone turns off). Its budgets are tests for `node --test`
// on the machine they were set on — bench/budgets.test.mjs — and vitest,
// which would otherwise collect that file by its name and find no suite in
// it, leaves the directory alone.
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'bench/**'],
  },
});
