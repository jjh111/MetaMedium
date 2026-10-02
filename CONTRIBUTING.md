# Contributing

Thank you for looking. dyna.ink is built in the open, and reports, questions
and ideas are welcome now.

## Reporting a problem, or talking it over

Open an issue on the [repository](https://github.com/jjh111/MetaMedium/issues):

- **A problem**: what you did, what you expected, what happened instead, and
  the browser and device. A board's log (the control centre's *export* → the
  log) often shows it best — read it before you attach it, as you would any
  file you share.
- **A question or an idea**: say what you were trying to do. A drawing of it
  helps more than you might think.

## Code: not yet

**Outside code contributions open once the contributor agreement is
published.** Its text is being prepared by an attorney. Until then, pull
requests from others are not merged; to propose a change, open an issue that
describes it. When the agreement is published it will be linked here, and a
pull request will be merged only once its author has signed it.

## What a contribution must pass

The same as every change in this repository. `CLAUDE.md`'s *Working with the
Codebase* says how to build and test each part; in short:

- **the engine** (`core/`): `npm run typecheck && npm test`, and both bundles
  rebuilt (`npm run build:browser`, `npm run build:node`), copied to
  `Demos/` and committed — CI fails when they drift from the source;
- **the surface**: edit a fragment in `Demos/surface/`, then
  `node Demos/build-surface.mjs` and commit both; after the page, the service
  worker or the manifest, `node scripts/build-app.mjs`;
- **the browser gate**: `node e2e/run.mjs` ([e2e/README.md](e2e/README.md));
- **CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs all of
  it on every pull request, and must be green.

The code is licensed under the GNU AGPL-3.0 ([LICENSE](LICENSE)); see
[NOTICE](NOTICE) and [TRADEMARKS.md](TRADEMARKS.md).
