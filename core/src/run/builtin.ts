// The runners the canvas ships with (MATHS-SPEC §8 Lane D, M23), registered in
// the order they read. A new runner is one file beside the notation it runs and
// one line here, appended — as a tool is in `tools/builtin.ts`, a fill source in
// `maths/fill-builtin.ts`.

import { PENDULUM_RUNNER } from '../notations/pendulum';
import { registerRunner } from './runner';
import type { Runner } from './runner';

export const BUILTIN_RUNNERS: readonly Runner<any>[] = [PENDULUM_RUNNER];

for (const r of BUILTIN_RUNNERS) registerRunner(r);
