#!/usr/bin/env node
// gntDEPLOY-hardening — static serving + public-hosting hardening of the
// session server, measured against REAL servers (docs/gauntlet/PLAN.md §14.3
// / §14.4, gates GD.4 and GD.5). Starts its own `node server/index.mjs`
// instances on the given ports and kills them before exiting.
//
//   node tools/gntDEPLOY-hardening.mjs --dist dist-DEPLOY [--port 7922]
//
// Static (--static <dist>): MIME types, index.html fallback for routes vs 404
// for missing assets, Cache-Control (index no-cache, hashed assets immutable),
// ETag 304, HEAD = GET headers without a body, 405, gzip / br bytes identical
// to the file, traversal attempts (../, %2e%2e, %2f, backslash, NUL, dot
// files, absolute drive paths) never leave the root, /health keeps working,
// a 20 MB asset streams with Range support.
// Hardening: --origins self,https://ok.example -> a foreign Origin gets 403,
// no Origin (a bot) and the allowed ones get 101; --max-per-ip 3 -> the 4th
// socket from one client IP (X-Forwarded-For through a loopback proxy) gets
// 429 and a closed one frees its slot; direct loopback is exempt; the admin
// API refuses a request that came through a proxy even from 127.0.0.1;
// oversized WebSocket frames are refused (1009) and a control flood is cut.
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';
import { connect } from 'node:net';
import { join } from 'node:path';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const dist = arg('dist', 'dist-DEPLOY');
const port = Number(arg('port', 7922));
const port2 = port + 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('captures', { recursive: true });
const out = { dist, port, checks: [] };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 260)}`);
}

function startServer(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['server/index.mjs', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const t = setTimeout(() => reject(new Error(`server not ready: ${buf}`)), 15000);
    p.stdout.on('data', (d) => {
      buf += d;
      if (/\[echoes-net\] ready /.test(buf)) {
        clearTimeout(t);
        resolve({ proc: p, log: () => buf });
      }
    });
    p.stderr.on('data', (d) => (buf += d));
    p.on('exit', (c) => {
      clearTimeout(t);
      if (!/ready/.test(buf)) reject(new Error(`server exited ${c}: ${buf}`));
    });
  });
}
function http(method, path, headers = {}, p = port) {
  return new Promise((resolve) => {
    const req = request({ host: '127.0.0.1', port: p, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: String(e.message), headers: {}, body: Buffer.alloc(0) }));
    req.end();
  });
}
// Raw request line (no client-side normalisation of the path).
function raw(path, p = port) {
  return new Promise((resolve) => {
    const s = connect(p, '127.0.0.1');
    let buf = '';
    s.on('data', (d) => (buf += d.toString('latin1')));
    s.on('end', () => resolve({ line: buf.split('\r\n')[0], body: buf.split('\r\n\r\n').slice(1).join('\r\n\r\n') }));
    s.on('error', () => resolve({ line: 'error', body: '' }));
    s.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
  });
}
// A WebSocket handshake with chosen headers; resolves the status line and
// keeps the socket open (close() it later).
function wsOpen(headers = {}, p = port) {
  return new Promise((resolve) => {
    const s = connect(p, '127.0.0.1');
    const key = randomBytes(16).toString('base64');
    let buf = '';
    let done = false;
    s.on('data', (d) => {
      buf += d.toString('latin1');
      if (!done && buf.includes('\r\n\r\n')) {
        done = true;
        const status = Number(buf.split(' ')[1]);
        const accept = /sec-websocket-accept: (\S+)/i.exec(buf);
        resolve({ status, ok: status === 101 && accept && accept[1] === createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64'), sock: s, head: buf.split('\r\n')[0] });
      }
    });
    s.on('error', () => !done && resolve({ status: 0, sock: s }));
    const h = Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join('');
    s.write(`GET /echoes HTTP/1.1\r\nHost: 127.0.0.1:${p}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n${h}\r\n`);
  });
}
function frame(opcode, payload, { len = payload.length } = {}) {
  const mask = randomBytes(4);
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, 0x80 | len]);
  else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x80 | opcode;
    head[1] = 0x80 | 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode;
    head[1] = 0x80 | 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  const body = Buffer.from(payload);
  for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
  return Buffer.concat([head, mask, body]);
}

const procs = [];
try {
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`${dist}/index.html missing — build first (npx vite build --outDir ${dist})`);
  const vj = JSON.parse(readFileSync(join(dist, 'version.json'), 'utf8'));
  const big = join(dist, 'gntDEPLOY-big.bin');
  writeFileSync(big, randomBytes(20 * 1024 * 1024));
  const s1 = await startServer(['--static', dist, '--port', String(port), '--origins', 'self,https://ok.example', '--max-per-ip', '3']);
  procs.push(s1.proc);
  out.serverLog = s1.log().split('\n').slice(0, 12);

  // ------------------------------------------------------------- static
  const idx = await http('GET', '/');
  check('GET / -> index.html, text/html, no-cache', idx.status === 200 && /text\/html/.test(idx.headers['content-type']) && idx.headers['cache-control'] === 'no-cache' && /<html/i.test(idx.body.toString()), { status: idx.status, type: idx.headers['content-type'], cc: idx.headers['cache-control'] });
  const js = await http('GET', `/assets/${vj.entry}`);
  check('hashed entry chunk: text/javascript, public max-age=31536000 immutable, nosniff', js.status === 200 && /^text\/javascript/.test(js.headers['content-type']) && js.headers['cache-control'] === 'public, max-age=31536000, immutable' && js.headers['x-content-type-options'] === 'nosniff', { type: js.headers['content-type'], cc: js.headers['cache-control'], bytes: js.body.length });
  const vjs = await http('GET', '/version.json');
  check('version.json: application/json, no-cache, names the build', vjs.status === 200 && /application\/json/.test(vjs.headers['content-type']) && vjs.headers['cache-control'] === 'no-cache' && JSON.parse(vjs.body).version === vj.version, { v: vj.version, entry: vj.entry });
  // MIME table for everything a build can emit (a probe file per type).
  const types = { 'a.wasm': 'application/wasm', 'a.mjs': 'text/javascript', 'a.css': 'text/css', 'a.svg': 'image/svg+xml', 'a.png': 'image/png', 'a.woff2': 'font/woff2', 'a.ogg': 'audio/ogg', 'a.glb': 'model/gltf-binary', 'a.webmanifest': 'application/manifest+json', 'a.unknownext': 'application/octet-stream' };
  const mimeRes = {};
  for (const [f, want] of Object.entries(types)) {
    writeFileSync(join(dist, `gntDEPLOY-${f}`), 'x'.repeat(10));
    const r = await http('GET', `/gntDEPLOY-${f}`);
    mimeRes[f] = r.headers['content-type'];
    if (!String(r.headers['content-type']).startsWith(want)) mimeRes[`${f}!`] = want;
  }
  check('MIME types (.wasm .mjs .css .svg .png .woff2 .ogg .glb .webmanifest, unknown -> octet-stream)', !Object.keys(mimeRes).some((k) => k.endsWith('!')), mimeRes);
  const route = await http('GET', '/some/client/route', { accept: 'text/html' });
  const miss = await http('GET', '/assets/missing-AbCdEfGh.js');
  const missImg = await http('GET', '/nope.png');
  check('index.html fallback for an extension-less route (200 html); a missing asset is a real 404 (never html)', route.status === 200 && /text\/html/.test(route.headers['content-type']) && miss.status === 404 && missImg.status === 404 && !/html/.test(miss.headers['content-type']), { route: route.status, miss: miss.status, missType: miss.headers['content-type'], img: missImg.status });
  const head = await http('HEAD', `/assets/${vj.entry}`);
  check('HEAD = GET headers, no body', head.status === 200 && head.body.length === 0 && head.headers['content-length'] === String(js.body.length) && head.headers.etag === js.headers.etag, { len: head.headers['content-length'], body: head.body.length });
  const nm = await http('GET', '/', { 'if-none-match': idx.headers.etag });
  check('If-None-Match -> 304, empty body', nm.status === 304 && nm.body.length === 0, { status: nm.status });
  const post = await http('POST', '/');
  check('POST -> 405 with Allow: GET, HEAD', post.status === 405 && post.headers.allow === 'GET, HEAD', { status: post.status, allow: post.headers.allow });
  const gz = await http('GET', `/assets/${vj.entry}`, { 'accept-encoding': 'gzip' });
  const br = await http('GET', `/assets/${vj.entry}`, { 'accept-encoding': 'gzip, deflate, br' });
  const gzOk = gz.headers['content-encoding'] === 'gzip' && gunzipSync(gz.body).equals(js.body);
  const brOk = br.headers['content-encoding'] === 'br' && brotliDecompressSync(br.body).equals(js.body);
  check('gzip and brotli bodies decompress to the exact file; Vary: Accept-Encoding', gzOk && brOk && /accept-encoding/i.test(br.headers.vary || ''), { raw: js.body.length, gzip: gz.body.length, br: br.body.length });
  const bigR = await http('GET', '/gntDEPLOY-big.bin');
  const rng = await http('GET', '/gntDEPLOY-big.bin', { range: 'bytes=1000-1999' });
  const bad = await http('GET', '/gntDEPLOY-big.bin', { range: 'bytes=99999999-' });
  check('a 20 MB asset streams whole; Range 1000-1999 -> 206 with those bytes; unsatisfiable -> 416', bigR.status === 200 && bigR.body.length === 20 * 1024 * 1024 && rng.status === 206 && rng.body.equals(readFileSync(big).subarray(1000, 2000)) && bad.status === 416, { big: bigR.body.length, range: rng.status, cr: rng.headers['content-range'], bad: bad.status });
  // Traversal: raw request lines, no client normalisation.
  const attempts = ['/../package.json', '/..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/%2e%2e%2fpackage.json', '/assets/../../package.json', '/..%5cpackage.json', '/%5c..%5cpackage.json', '/package.json%00.js', '/.git/config', '/C:/Windows/win.ini', '/%43:%5cWindows%5cwin.ini', '//etc/passwd', '/server/index.mjs'];
  // A leak = the body of a file outside the root (package.json, the server
  // source, a Windows / Unix system file, a git config). An extension-less
  // path may get the game's index.html (the SPA fallback) — inside the root.
  const MARKERS = [/"name": "echoes-three"/, /Echoes session server/, /\[fonts\]|for 16-bit app support/i, /root:.*:0:0:/, /\[core\]/];
  const tr = {};
  let leaked = false;
  for (const a of attempts) {
    const r = await raw(a);
    tr[a] = r.line + (/<html/i.test(r.body) ? ' (the game index.html)' : '');
    if (MARKERS.some((m) => m.test(r.body))) leaked = true;
  }
  check('path traversal (../, %2e%2e, %2f, %5c, NUL, dot files, drive paths) never serves a file outside the root', !leaked, tr);
  const health = await http('GET', '/health');
  const hj = JSON.parse(health.body);
  check('/health kept: ok, build, static, origins, per-IP cap', health.status === 200 && hj.ok && hj.static === true && hj.build && hj.build.version === vj.version && hj.maxPerIp === 3, { build: hj.build, origins: hj.origins, maxPerIp: hj.maxPerIp });

  // --------------------------------------------------------- hardening
  const foreign = await wsOpen({ Origin: 'https://evil.example' });
  const same = await wsOpen({ Origin: `http://127.0.0.1:${port}` });
  const listed = await wsOpen({ Origin: 'https://ok.example' });
  const bot = await wsOpen({});
  check('origin allow-list "self,https://ok.example": foreign 403; same host, listed origin and a non-browser client 101', foreign.status === 403 && same.ok && listed.ok && bot.ok, { foreign: foreign.head, same: same.status, listed: listed.status, bot: bot.status });
  for (const w of [foreign, same, listed, bot]) w.sock.destroy();
  await sleep(300);
  // Per-IP cap through a loopback proxy (X-Forwarded-For).
  const viaProxy = (ip) => wsOpen({ Origin: `http://127.0.0.1:${port}`, 'X-Forwarded-For': ip });
  const a = [];
  for (let i = 0; i < 3; i++) a.push(await viaProxy('203.0.113.7'));
  const fourth = await viaProxy('203.0.113.7');
  const other = await viaProxy('198.51.100.9');
  a[0].sock.destroy();
  await sleep(400);
  const again = await viaProxy('203.0.113.7');
  const loops = [];
  for (let i = 0; i < 6; i++) loops.push(await wsOpen({ Origin: `http://127.0.0.1:${port}` }));
  check('per-IP cap 3: the 4th socket from one client IP -> 429, another IP -> 101, a closed socket frees its slot, direct loopback exempt (6/6)', a.every((w) => w.ok) && fourth.status === 429 && other.ok && again.ok && loops.every((w) => w.ok), { fourth: fourth.head, other: other.status, again: again.status, loopback: loops.map((w) => w.status) });
  for (const w of [...a, fourth, other, again, ...loops]) w.sock.destroy();
  // Size limit: a 2 MB frame (limit 1 MiB) -> close 1009.
  const big1 = await wsOpen({});
  const closeCode = await new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    big1.sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      const i = buf.indexOf(0x88);
      if (i >= 0 && buf.length >= i + 4) resolve(buf.readUInt16BE(i + 2));
    });
    big1.sock.on('close', () => resolve('closed'));
    big1.sock.write(frame(0x2, Buffer.alloc(2 * 1024 * 1024)));
    setTimeout(() => resolve('timeout'), 4000);
  });
  big1.sock.destroy();
  check('message size limit: a 2 MB frame is refused with close 1009', closeCode === 1009, { closeCode });
  // Control flood: > rate limit -> closed with 1008.
  const fl = await wsOpen({});
  const floodClose = await new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    fl.sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      const i = buf.lastIndexOf(Buffer.from([0x88]));
      if (i >= 0 && buf.length >= i + 4) resolve(buf.readUInt16BE(i + 2));
    });
    fl.sock.on('close', () => resolve('closed'));
    const msg = frame(0x1, JSON.stringify({ t: 'ping', ts: 1 }));
    for (let i = 0; i < 1200; i++) fl.sock.write(msg);
    setTimeout(() => resolve('timeout'), 5000);
  });
  fl.sock.destroy();
  check('existing message rate limit: a control flood is cut (close 1008)', floodClose === 1008 || floodClose === 'closed', { floodClose });
  // Admin behind a proxy.
  const s2 = await startServer(['--port', String(port2), '--admin']);
  procs.push(s2.proc);
  const direct = await http('GET', '/stats', {}, port2);
  const proxied = await http('GET', '/stats', { 'X-Forwarded-For': '203.0.113.7' }, port2);
  const noStatic = await http('GET', '/', {}, port2);
  check('admin API: direct loopback 200; the same request through a proxy (X-Forwarded-For) 403', direct.status === 200 && proxied.status === 403, { direct: direct.status, proxied: proxied.status });
  check('without --static the server still answers / with 404 (the dev / preview / proxy setups)', noStatic.status === 404, { status: noStatic.status });
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  for (const p of procs) p.kill();
  try {
    for (const f of ['gntDEPLOY-big.bin', 'gntDEPLOY-a.wasm', 'gntDEPLOY-a.mjs', 'gntDEPLOY-a.css', 'gntDEPLOY-a.svg', 'gntDEPLOY-a.png', 'gntDEPLOY-a.woff2', 'gntDEPLOY-a.ogg', 'gntDEPLOY-a.glb', 'gntDEPLOY-a.webmanifest', 'gntDEPLOY-a.unknownext']) {
      const { rmSync } = await import('node:fs');
      rmSync(join(dist, f), { force: true });
    }
  } catch {
    /* best effort */
  }
}
const fails = out.checks.filter((c) => !c.ok).length;
out.summary = `${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`;
writeFileSync('captures/gntDEPLOY-hardening.json', JSON.stringify(out, null, 1));
console.log(out.summary);
process.exit(out.crash || fails ? 1 : 0);
