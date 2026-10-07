// HTTP routes of the session server (docs/gauntlet/PLAN.md §3.7 admin API).
// Owner: M5a.
//
//   GET  /health                      always (CORS *): liveness + counts
//   GET  /stats                       --admin only, loopback callers only
//   POST /admin/conditioner { target: 'all'|peerId|roomCode, up, down }
//   POST /admin/drop        { peerId, mode: 'close'|'blackhole', forMs }
//   POST /admin/kill-host   { code }
//   GET/POST /cloud/...                always: cloud saves (cloud.mjs)
//
// `up` / `down` are conditioner specs (object or compact string, e.g.
// "lat75,jit10,loss10"; "off" clears). The admin API exists only when the
// server was started with --admin, and even then answers loopback callers
// only (a LAN-bound server never exposes it to the network). DEPLOY: a
// request that arrived through a reverse proxy (it carries X-Forwarded-For /
// Forwarded / X-Real-IP) is NOT a loopback caller even though the proxy
// connects from 127.0.0.1 — behind Caddy / nginx the admin API stays closed.
// Every other path goes to the static game server when one is configured
// (`--static`, static.mjs), else 404.
import { handleCloud } from './cloud.mjs';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MAX_BODY = 64 * 1024;

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('body is not JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function createHttpHandler(server) {
  return async function handle(req, res) {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return json(res, 400, { ok: false, error: 'bad_url' });
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type' });
      return res.end();
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/health') return json(res, 200, server.health());
    if (server.cloud && url.pathname.startsWith('/cloud/')) {
      // Another website's page may not read or write saves here (the same
      // Origin allow-list as the WebSocket); a request with no Origin is a tool.
      if (!server.originAllowed(req)) return json(res, 403, { ok: false, error: 'origin' });
      const origin = req.headers.origin ? String(req.headers.origin) : '*';
      return void (await handleCloud(req, res, { store: server.cloud, ip: server.clientIp(req), cors: { 'access-control-allow-origin': origin, vary: 'origin' } }));
    }
    const isAdminPath = url.pathname === '/stats' || url.pathname.startsWith('/admin/');
    if (!isAdminPath) {
      if (server.serveStatic) return server.serveStatic(req, res);
      return json(res, 404, { ok: false, error: 'not_found' });
    }
    if (!server.opt.admin) return json(res, 404, { ok: false, error: 'admin_disabled', hint: 'start the server with --admin' });
    const forwarded = !!(req.headers['x-forwarded-for'] || req.headers.forwarded || req.headers['x-real-ip']);
    if (!LOOPBACK.has(req.socket.remoteAddress) || forwarded) return json(res, 403, { ok: false, error: 'loopback_only' });
    try {
      if (req.method === 'GET' && url.pathname === '/stats') return json(res, 200, server.stats());
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
      const body = await readBody(req);
      if (url.pathname === '/admin/conditioner') {
        const r = server.setConditioner(body.target ?? 'all', body.up, body.down);
        return json(res, r.ok ? 200 : 400, r);
      }
      if (url.pathname === '/admin/drop') {
        const r = server.dropPeer(body.peerId, body.mode ?? 'close', Number(body.forMs ?? 0));
        return json(res, r.ok ? 200 : 404, r);
      }
      if (url.pathname === '/admin/kill-host') {
        const r = server.killHost(String(body.code ?? '').toUpperCase());
        return json(res, r.ok ? 200 : 404, r);
      }
      return json(res, 404, { ok: false, error: 'not_found' });
    } catch (err) {
      return json(res, 400, { ok: false, error: String(err && err.message ? err.message : err) });
    }
  };
}
