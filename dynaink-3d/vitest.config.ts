import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@dynaink/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    // The pure modules carry no three.js, so the rungs test with no WebGL.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
