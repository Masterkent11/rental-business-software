import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(currentDir, './src'),
    },
  },
  test: {
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
