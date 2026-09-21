// HTTP routes of the session server (docs/gauntlet/PLAN.md §3.7 admin API).
// Owner: M5a.
//
//   GET  /health                      always (CORS *): liveness + counts
//   GET  /stats                       --admin only, loopback callers only
//   POST /admin/conditioner { target: 'all'|peerId|roomCode, up, down }
//   POST /admin/drop        { peerId, mode: 'close'|'blackhole', forMs }
//   POST /admin/kill-host   { code }
//
// `up` / `down` are conditioner specs (object or compact string, e.g.
// "lat75,jit10,loss10"; "off" clears). The admin API exists only when the
// server was started with --admin, and even then answers loopback callers
// only (a LAN-bound server never exposes it to the network).
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
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, server.health());
    const isAdminPath = url.pathname === '/stats' || url.pathname.startsWith('/admin/');
    if (!isAdminPath) return json(res, 404, { ok: false, error: 'not_found' });
    if (!server.opt.admin) return json(res, 404, { ok: false, error: 'admin_disabled', hint: 'start the server with --admin' });
    if (!LOOPBACK.has(req.socket.remoteAddress)) return json(res, 403, { ok: false, error: 'loopback_only' });
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
