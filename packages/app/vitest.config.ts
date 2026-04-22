import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    // Store modules initialize from localStorage at import time; resetting
    // modules per test ensures fresh construction against the current
    // localStorage state.
    isolate: true,
  },
  resolve: {
    conditions: ['browser'],
  },
});
