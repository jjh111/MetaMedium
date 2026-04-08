import { defineConfig } from 'vite';
import { canvasApiPlugin } from './src/llm/api-handler';

export default defineConfig({
  plugins: [canvasApiPlugin()],
});
