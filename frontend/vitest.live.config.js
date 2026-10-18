// Live contract tests against a RUNNING backend. Run: npm run test:live
// Requires Member 3's FastAPI server at VITE_API_BASE_URL (default http://127.0.0.1:8000).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.live.test.js'],
    testTimeout: 15000,
  },
});
