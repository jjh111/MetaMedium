import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'metamedium-core': fileURLToPath(new URL('../metamedium-core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    // The pure modules carry no three.js, so the rungs test with no WebGL.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
