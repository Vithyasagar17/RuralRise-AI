// RuralRise AI — Vite configuration.
//
// PWA section added by Member 5 (offline support). Member 1 owns the rest of
// this file; merge carefully and keep exactly ONE VitePWA() call so the app
// never ships two competing service workers.
//
// Why vite-plugin-pwa: Vite fingerprints asset filenames on every build
// (index-AbC123.js). A hand-written service worker would need its precache
// list updated by hand after every build. The plugin uses Google Workbox to
// generate the list automatically at build time.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We register the worker ourselves in src/features/offline/registerPWA.js.
      injectRegister: false,
      // A new deployment activates on next load; no "click to update" step
      // that low-literacy users could miss.
      registerType: 'autoUpdate',
      // The manifest lives in public/manifest.webmanifest (shared repo layout)
      // and is linked from index.html, so the plugin must not generate one.
      manifest: false,
      workbox: {
        // App shell: every built JS/CSS/HTML/icon file is precached, including
        // public/offline.html, public/manifest.webmanifest and public/icons/*.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Take control of the open page as soon as the worker is installed,
        // so the very first visit is already protected for offline reloads.
        clientsClaim: true,
        skipWaiting: true,
        // Any in-app navigation while offline serves the cached app shell.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // API responses are deliberately NOT cached by the service worker.
        // A cached 200 response would hide the fact that the user is offline
        // (the UI would label old data as "live"). Lesson content is saved
        // explicitly in IndexedDB instead (src/features/offline/lessonStore.js)
        // and pending progress in IndexedDB (progressQueue.js), so the app
        // always knows whether data is fresh or a saved copy.
      },
      // Keep the service worker OFF during `npm run dev` so cached files never
      // confuse day-to-day development. Test offline with build + preview.
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
  // Preview also uses 5173 because the backend's default CORS_ORIGINS only
  // allows http://localhost:5173 and http://127.0.0.1:5173.
  preview: { port: 5173, strictPort: true },
});
