#!/usr/bin/env node
// gntDEPLOY-tls — a local TLS-terminating reverse proxy, the stand-in for
// Caddy / nginx in front of `npm run serve` (docs/gauntlet/PLAN.md §14,
// gate GD.3). Serves https://127.0.0.1:<port>/ with a self-signed
// certificate and forwards EVERY request — the game files AND the /echoes
// WebSocket upgrade — to the session server, exactly like the README's
// Caddyfile: Host preserved, X-Forwarded-For / -Proto / -Host added.
//
//   node tools/gntDEPLOY-tls.mjs --port 4392 --to 7925
//
// The certificate is generated once with OpenSSL (Git for Windows ships it)
// into captures/gntDEPLOY-tls/; browsers need --ignore-certificate-errors.
import { createServer } from 'node:https';
import { request } from 'node:http';
import { connect } from 'node:net';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 4392));
const to = Number(arg('to', 7925));
const dir = 'captures/gntDEPLOY-tls';
if (!existsSync(`${dir}/key.pem`) || !existsSync(`${dir}/cert.pem`)) {
  mkdirSync(dir, { recursive: true });
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${dir}/key.pem`, '-out', `${dir}/cert.pem`, '-days', '30', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
}
const stats = { http: 0, ws: 0, errors: 0 };
function fwdHeaders(req) {
  const h = { ...req.headers };
  const peer = req.socket.remoteAddress || '';
  h['x-forwarded-for'] = h['x-forwarded-for'] ? `${h['x-forwarded-for']}, ${peer}` : peer;
  h['x-forwarded-proto'] = 'https';
  h['x-forwarded-host'] = req.headers.host || '';
  return h;
}
const srv = createServer({ key: readFileSync(`${dir}/key.pem`), cert: readFileSync(`${dir}/cert.pem`) }, (req, res) => {
  stats.http += 1;
  const up = request({ host: '127.0.0.1', port: to, method: req.method, path: req.url, headers: fwdHeaders(req) }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  up.on('error', () => {
    stats.errors += 1;
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('upstream down\n');
  });
  req.pipe(up);
});
srv.on('upgrade', (req, socket, head) => {
  stats.ws += 1;
  const upstream = connect(to, '127.0.0.1', () => {
    const h = fwdHeaders(req);
    const lines = [`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(h).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`), '', ''];
    upstream.write(lines.join('\r\n'));
    if (head && head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  const kill = () => {
    socket.destroy();
    upstream.destroy();
  };
  upstream.on('error', () => {
    stats.errors += 1;
    kill();
  });
  socket.on('error', kill);
  upstream.on('close', () => socket.destroy());
  socket.on('close', () => upstream.destroy());
});
srv.listen(port, '127.0.0.1', () => console.log(`[gntDEPLOY-tls] ready https://127.0.0.1:${port}/ -> http://127.0.0.1:${to} (pid ${process.pid})`));
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
