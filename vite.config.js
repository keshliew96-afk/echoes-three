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
// server is not running (every Multiplayer check would print one), and no
// log at all when a player simply closes the tab mid-connection.
//
// GONE = errors that only mean a connection went away, never a bug worth a
// stack: ECONNREFUSED = no session server (the hint below); the rest = a
// player's browser left (a closed tab / killed browser / dropped network
// resets its socket — read ECONNRESET — or the proxy pipes the server's next
// snapshot into a socket already gone — write ECONNABORTED on Windows, EPIPE
// elsewhere — and the teardown that follows) or the session server went away
// mid-game (its own terminal says why). A client socket's error reaches Vite
// twice (fix-DEPLOY-r4 F1): http-proxy re-emits it as a proxy 'error'
// (filtered in emit below) AND Vite's own proxyReqWs handler hangs a
// stack-printing "ws proxy socket error" listener on that socket, which is
// swapped for one that stays silent for GONE and still reports anything else.
let lastHint = 0;
const GONE = new Set(['ECONNREFUSED', 'ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ETIMEDOUT', 'ERR_STREAM_WRITE_AFTER_END', 'ERR_STREAM_DESTROYED', 'ERR_STREAM_PREMATURE_CLOSE']);
function quietClientSocket(socket, before) {
  if (!socket || typeof socket.listeners !== 'function') return;
  const added = socket.listeners('error').filter((fn) => !before.includes(fn));
  if (!added.length) return;
  for (const fn of added) socket.removeListener('error', fn);
  socket.on('error', (err) => {
    if (err && GONE.has(err.code)) return;
    for (const fn of added) fn.call(socket, err);
  });
}
const NOT_RUNNING = 'Echoes session server not running (npm run net)\n';
function netProxy() {
  return {
    '^/echoes(?:[?#]|$)': {
      target: NET_TARGET,
      ws: true,
      xfwd: true, // X-Forwarded-For: the session server's per-IP cap sees the real LAN client
      configure(proxy) {
        const emit = proxy.emit.bind(proxy);
        proxy.emit = (event, err, req, res, ...rest) => {
          if (event === 'proxyReqWs') {
            // (proxyReq, req, clientSocket, options, head): let Vite attach its
            // listeners, then take its socket-error logger back off.
            const before = res && typeof res.listeners === 'function' ? res.listeners('error') : [];
            const handled = emit(event, err, req, res, ...rest);
            quietClientSocket(res, before);
            return handled;
          }
          if (event === 'error' && err && GONE.has(err.code)) {
            const refused = err.code === 'ECONNREFUSED';
            const now = Date.now();
            if (refused && now - lastHint > 30000) {
              lastHint = now;
              console.log(`[echoes] /echoes -> ${NET_TARGET}: no session server there (${err.code}). Multiplayer needs it: run "npm run net" in another terminal.`);
            }
            try {
              if (res && typeof res.writeHead === 'function') {
                if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
                res.end(refused ? NOT_RUNNING : undefined);
              } else if (res && typeof res.destroy === 'function') {
                // A WebSocket upgrade: refused = the 101 was never sent, so the
                // raw socket can still carry an honest 502; otherwise just drop it.
                if (refused && res.writable && !res.destroyed) res.end(`HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nContent-Length: ${NOT_RUNNING.length}\r\nConnection: close\r\n\r\n${NOT_RUNNING}`);
                else res.destroy();
              }
            } catch {
              /* socket already gone */
            }
            return true;
          }
          return emit(event, err, req, res, ...rest);
        };
      },
    },
    // Cloud saves (docs/CLOUD_SAVES.md) live on the same session server.
    '^/cloud/': { target: NET_TARGET, xfwd: true },
    // ... and so does the Daily Descent board (docs/DAILY.md).
    '^/daily/': { target: NET_TARGET, xfwd: true },
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
