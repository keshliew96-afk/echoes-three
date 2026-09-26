// Vite config (docs/gauntlet/PLAN.md §6.3; owner: INT; DEPLOY §14.2).
//
// `npm run build` -> dist/ is the PLAYER build: one hashed app chunk, a
// separate cached `three` chunk, the two workers Vite emits on its own, and a
// relative base so the bundle runs from any path (file server, itch.io zip,
// sub-directory) without rewriting.
//
// DEPLOY (PLAN §14): the game finds its multiplayer server at its own
// origin's /echoes, so the dev and preview servers forward /echoes (the
// WebSocket) to the session server on this computer — `npm run net` in a
// second terminal, port ECHOES_NET_PORT (default 7800). With `-- --host`,
// friends on the LAN open the Network URL Vite prints and join with zero
// settings. The build also writes version.json ({ version, entry }): the
// session server (`--static`) and the page read it to tell a stale page
// "A new version of Echoes is available — Reload".
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const NET_PORT = Number(process.env.ECHOES_NET_PORT) || 7800;
const NET_TARGET = `http://127.0.0.1:${NET_PORT}`;

// One quiet line instead of a stack trace per attempt while the session
// server is not running (every Multiplayer check would print one).
let lastHint = 0;
function netProxy() {
  return {
    '^/echoes(?:[?#]|$)': {
      target: NET_TARGET,
      ws: true,
      xfwd: true, // X-Forwarded-For: the session server's per-IP cap sees the real LAN client
      configure(proxy) {
        const emit = proxy.emit.bind(proxy);
        proxy.emit = (event, err, req, res, ...rest) => {
          if (event === 'error' && err && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET')) {
            const now = Date.now();
            if (now - lastHint > 30000) {
              lastHint = now;
              console.log(`[echoes] /echoes -> ${NET_TARGET}: no session server there (${err.code}). Multiplayer needs it: run "npm run net" in another terminal.`);
            }
            try {
              if (res && typeof res.writeHead === 'function') {
                if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
                res.end('Echoes session server not running (npm run net)\n');
              } else if (res && typeof res.destroy === 'function') res.destroy();
            } catch {
              /* socket already gone */
            }
            return true;
          }
          return emit(event, err, req, res, ...rest);
        };
      },
    },
  };
}

// dist/version.json — read from src/version.js at build time (read, not
// imported: importing it would restart the dev server on every version bump).
function echoesBuildInfo() {
  return {
    name: 'echoes-build-info',
    apply: 'build',
    generateBundle(_opts, bundle) {
      let version = null;
      try {
        const m = /VERSION\s*=\s*'([^']+)'/.exec(readFileSync(resolve(process.cwd(), 'src/version.js'), 'utf8'));
        version = m ? m[1] : null;
      } catch {
        version = null;
      }
      const entryChunk = Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry && /(^|\/)index-/.test(c.fileName)) || Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry);
      const entry = entryChunk ? entryChunk.fileName.split('/').pop() : null;
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ name: 'echoes', version, entry, builtAt: new Date().toISOString() })}\n` });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [echoesBuildInfo()],
  server: {
    port: 5199,
    strictPort: true,
    host: '127.0.0.1',
    proxy: netProxy(),
  },
  preview: {
    host: '127.0.0.1',
    proxy: netProxy(),
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
