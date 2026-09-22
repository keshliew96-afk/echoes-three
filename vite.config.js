// Vite config (docs/gauntlet/PLAN.md §6.3; owner: INT).
//
// `npm run build` -> dist/ is the PLAYER build: one hashed app chunk, a
// separate cached `three` chunk, the two workers Vite emits on its own, and a
// relative base so the bundle runs from any path (file server, itch.io zip,
// sub-directory) without rewriting.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5199,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // three is ~75% of the bundle and changes only when the dependency does:
    // its own chunk keeps it in the browser cache across game updates.
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: 'three', test: /[\/]node_modules[\/]three[\/]/ }],
        },
      },
    },
    chunkSizeWarningLimit: 1300, // the app chunk IS the game; it loads behind the boot splash
  },
});
