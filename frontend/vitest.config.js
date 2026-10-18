// Unit/component tests (no backend needed). Run: npm test
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['src/**/*.live.test.{js,jsx}', 'node_modules/**'],
  },
});
