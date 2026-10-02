`core-before-r2.node.mjs.gz` is `Demos/metamedium-core.node.mjs` as master held it the day before the log
format was versioned (V1-PLAN R2), gzipped. It is the reader a week-old surface runs, kept whole so
`format.test.ts` can hand it a version 1 file and see it open. Never regenerate it: it is a witness,
not a build.
