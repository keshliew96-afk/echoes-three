#!/usr/bin/env node
// gntM5b-https — serve a production build over HTTPS (self-signed, loopback)
// so the https-only UI rules (PLAN §3.7 "https builds": wss:// only, the
// mixed-content copy) can be checked in a real https page. Owner: M5b.
//   node tools/gntM5b-https.mjs --dir dist-M5b --port 7829
// The certificate is generated once with OpenSSL (Git for Windows ships it)
// into captures/gntM5b-tls/; puppeteer pages need --ignore-certificate-errors.
import { createServer } from 'node:https';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, resolve, normalize } from 'node:path';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const dir = resolve(arg('dir', 'dist-M5b'));
const port = Number(arg('port', 7829));
const tls = resolve('captures/gntM5b-tls');
const keyP = join(tls, 'key.pem');
const certP = join(tls, 'cert.pem');
if (!existsSync(keyP) || !existsSync(certP)) {
  mkdirSync(tls, { recursive: true });
  // Relative paths + MSYS_NO_PATHCONV: Git's OpenSSL mangles "/CN=…" and
  // non-ASCII absolute paths otherwise.
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'captures/gntM5b-tls/key.pem', '-out', 'captures/gntM5b-tls/cert.pem', '-days', '30', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon' };
const srv = createServer({ key: readFileSync(keyP), cert: readFileSync(certP) }, (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'https://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(dir, p));
  if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
srv.listen(port, '127.0.0.1', () => console.log(`[gntM5b-https] ready https://127.0.0.1:${port}/ (${dir})`));
