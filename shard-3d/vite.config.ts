import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The engine is imported FROM SOURCE, not from a build: the shard always runs
// against metamedium-core as it stands, so a change there is visible here with
// no build step and no stale bundle to drift (CLAUDE.md, "one core, many
// surfaces"). `fs.allow` lets Vite serve files from outside this root.
export default defineConfig({
  server: { fs: { allow: ['..'] } },
  resolve: {
    alias: {
      'metamedium-core': fileURLToPath(new URL('../metamedium-core/src/index.ts', import.meta.url)),
    },
  },
});
