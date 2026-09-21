#!/usr/bin/env node
// Echoes session server (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// ARCH skeleton: HTTP health endpoint + argument parsing + clean shutdown.
// M5a adds the zero-dependency RFC 6455 WebSocket transport (server/ws.mjs),
// lobby + matchmaking (server/lobby.mjs, server/matchmaking.mjs), the relay
// with per-link network conditioner (server/relay.mjs, importing
// src/net/protocol/conditioner.js), keyframe cache, and the admin API.
//
// Usage:  npm run net -- --port 7811 [--host 127.0.0.1] [--admin]
//                        [--latency 75 --jitter 10 --loss 0.1 --dup 0 --reorder 0]
// Every agent runs its OWN instance on its own port (PLAN §6.3) and kills it
// before returning. No npm downloads: Node built-ins only.
import { createServer } from 'node:http';
import { PROTOCOL_VERSION, DEFAULT_PORT, WS_PATH } from '../src/net/protocol/constants.js';

function parseArgs(argv) {
  const opt = { port: DEFAULT_PORT, host: '127.0.0.1', admin: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      opt[k] = true;
    } else {
      opt[k] = Number.isFinite(Number(next)) ? Number(next) : next;
      i += 1;
    }
  }
  return opt;
}

const opt = parseArgs(process.argv.slice(2));
const startedAt = Date.now();

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(
      JSON.stringify({
        ok: true,
        name: 'echoes-net',
        protocol: PROTOCOL_VERSION,
        path: WS_PATH,
        transport: 'pending-M5a',
        rooms: 0,
        peers: 0,
        uptimeMs: Date.now() - startedAt,
      })
    );
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

// WebSocket upgrade lands with M5a — until then refuse honestly.
server.on('upgrade', (req, socket) => {
  socket.end('HTTP/1.1 501 Not Implemented\r\nContent-Type: text/plain\r\n\r\nWebSocket transport lands with M5a\r\n');
});

server.listen(opt.port, opt.host, () => {
  console.log(`[echoes-net] listening on http://${opt.host}:${opt.port} (ws path ${WS_PATH}, protocol ${PROTOCOL_VERSION})`);
});

function shutdown(sig) {
  console.log(`[echoes-net] ${sig} — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
