// gntfixDEPLOY4-proxyunit: the vite.config.js /echoes proxy, driven through Vite's own preview() API with a
// capturing logger (DEPLOY r4 F1 + PLAN §14.2 contract):
//   A (session server up):  a client socket error that means "the player left" (ECONNRESET / ECONNABORTED /
//       EPIPE / ERR_STREAM_DESTROYED, injected on the proxied client socket, and a real TCP RST) logs NOTHING;
//       an unexpected error (EFAKE) still reaches Vite's "ws proxy socket error" logger exactly once; the
//       WebSocket keeps relaying (101 + server bytes) after a quiet error.
//   B (no session server):   a WebSocket upgrade gets "HTTP/1.1 502 Bad Gateway"; a plain GET gets 502 + the
//       "not running" body; 4 attempts print exactly ONE "[echoes] ... npm run net" hint and no stack.
// usage: node tools/gntfixDEPLOY4-proxyunit.mjs [--config <vite config, default vite.config.js>] [--tag t] --net 7930 --down 7931 --portA 4395 --portB 4396 --outDir dist-gntfixDEPLOY4
import net from 'node:net';
import crypto from 'node:crypto';
import http from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { preview, createLogger } from 'vite';

const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outDir = a.outDir || 'dist-gntfixDEPLOY4';
mkdirSync('captures/gntfixDEPLOY4', { recursive: true });
const checks = {};
const check = (k, ok, detail) => {
  checks[k] = { pass: !!ok, detail };
  console.log(`${ok ? 'PASS' : 'FAIL'} ${k} ${detail === undefined ? '' : JSON.stringify(detail).slice(0, 400)}`);
};

function capturingLogger() {
  const base = createLogger('info', { allowClearScreen: false });
  const lines = [];
  const wrap = (lvl) => (msg, opts) => {
    lines.push({ lvl, msg: String(msg).replace(/\x1b\[[0-9;]*m/g, ''), code: opts?.error?.code });
  };
  return { lines, logger: { ...base, info: wrap('info'), warn: wrap('warn'), warnOnce: wrap('warn'), error: wrap('error'), hasErrorLogged: () => false, clearScreen() {} } };
}

function upgrade(port) {
  return new Promise((res, rej) => {
    const s = net.connect(port, '127.0.0.1');
    let buf = '';
    const t = setTimeout(() => rej(new Error('no upgrade answer')), 8000);
    s.on('error', () => {});
    s.on('close', () => {
      clearTimeout(t);
      res({ s, status: buf.split('\r\n')[0] || '(closed without an answer)', raw: buf });
    });
    s.on('data', function first(d) {
      buf += d.toString('latin1');
      if (buf.includes('\r\n\r\n')) {
        clearTimeout(t);
        s.off('data', first);
        res({ s, status: buf.split('\r\n')[0], raw: buf });
      }
    });
    s.write(`GET /echoes HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\nOrigin: http://127.0.0.1:${port}\r\n\r\n`);
  });
}
function wsText(o) {
  const mask = crypto.randomBytes(4);
  const body = Buffer.from(JSON.stringify(o));
  const head = body.length < 126 ? Buffer.from([0x81, 0x80 | body.length]) : Buffer.from([0x81, 0x80 | 126, body.length >> 8, body.length & 255]);
  for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
  return Buffer.concat([head, mask, body]);
}
const httpGet = (port, path) =>
  new Promise((res) => {
    const r = http.get({ host: '127.0.0.1', port, path }, (resp) => {
      let body = '';
      resp.on('data', (d) => (body += d));
      resp.on('end', () => res({ status: resp.statusCode, body }));
    });
    r.on('error', (e) => res({ status: 0, body: String(e.code || e) }));
  });

async function startPreview(netPort, port) {
  process.env.ECHOES_NET_PORT = String(netPort);
  const cap = capturingLogger();
  const server = await preview({ configFile: a.config || 'vite.config.js', customLogger: cap.logger, logLevel: 'info', build: { outDir }, preview: { port, strictPort: true, host: '127.0.0.1' } });
  // Every upgraded client socket, in arrival order (registered after Vite's proxy upgrade handler).
  const sockets = [];
  server.httpServer.on('upgrade', (_req, socket) => sockets.push(socket));
  return { server, cap, sockets };
}

// ---------------- A: session server up ----------------
{
  const A = await startPreview(+(a.net || 7930), +(a.portA || 4395));
  const port = +(a.portA || 4395);
  const injected = ['ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ETIMEDOUT', 'ERR_STREAM_DESTROYED', 'ERR_STREAM_WRITE_AFTER_END'];
  const results = {};
  // how: 'destroy' = what Node does on a real socket error (emit 'error', then close; http-proxy ends the
  // upstream). 'emit' = the error event while the client keeps sending (the upstream is already ended by
  // http-proxy, so the client's next frame hits it: a teardown artifact on the upstream side).
  const trial = async (code, how) => {
    const before = A.cap.lines.length;
    const c = await upgrade(port);
    let got = 0;
    c.s.on('data', (d) => (got += d.length));
    c.s.write(wsText({ t: 'hello', v: 3, name: 'gntfixDEPLOY4', build: null }));
    await sleep(300);
    const sock = A.sockets[A.sockets.length - 1];
    const listeners = sock.listeners('error').length;
    const err = Object.assign(new Error(`synthetic ${code}`), { code });
    if (how === 'destroy') sock.destroy(err);
    else {
      sock.emit('error', err);
      await sleep(100);
      c.s.write(wsText({ t: 'ping', ts: Date.now() }));
    }
    await sleep(400);
    const lines = A.cap.lines.slice(before);
    const r = { status: c.status, got, listeners, newLogs: lines.length, heads: lines.map((l) => `${l.msg.split('\n')[0]} [${l.code}]`).slice(0, 3) };
    c.s.resetAndDestroy();
    await sleep(400);
    r.logsAfterRst = A.cap.lines.slice(before + lines.length).length;
    return r;
  };
  for (const how of ['destroy', 'emit']) {
    for (const code of injected) {
      const r = (results[`${how}.${code}`] = await trial(code, how));
      check(`A.quiet.${how}.${code}`, / 101 /.test(r.status) && r.got > 0 && r.newLogs === 0 && r.logsAfterRst === 0, r);
    }
  }
  const f = (results['destroy.EFAKE'] = await trial('EFAKE', 'destroy'));
  // Vite's own behaviour for a genuine error: reported (on its proxy-error and socket-error paths), never swallowed
  check('A.unexpected.EFAKE.reported', f.newLogs >= 1 && f.heads.some((h) => h.startsWith('ws proxy socket error:') && h.endsWith('[EFAKE]')) && f.logsAfterRst === 0, f);
  check('A.listenerCountUnchanged', Object.values(results).every((r) => r.listeners === f.listeners), Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.listeners])));
  // the proxy still relays after all of the above: a fresh socket gets 101 and a pong
  {
    const c = await upgrade(port);
    let got = '';
    c.s.on('data', (d) => (got += d.toString('latin1')));
    c.s.write(wsText({ t: 'hello', v: 3, name: 'gntfixDEPLOY4', build: null }));
    await sleep(300);
    const g0 = got.length;
    c.s.write(wsText({ t: 'ping', ts: 12345 }));
    await sleep(400);
    check('A.stillRelays', / 101 /.test(c.status) && got.length > g0, { status: c.status, bytesAfterPing: got.length - g0 });
    c.s.write(Buffer.from([0x88, 0x82, 0, 0, 0, 0, 0x03, 0xe8]));
    await sleep(200);
    c.s.end();
  }
  checks.A = results;
  await A.server.close();
}

// ---------------- B: no session server ----------------
{
  const port = +(a.portB || 4396);
  const logs = [];
  const orig = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
    orig(...args);
  };
  const B = await startPreview(+(a.down || 7931), port);
  const ups = [];
  for (let i = 0; i < 3; i++) ups.push(await upgrade(port));
  const get = await httpGet(port, '/echoes');
  await sleep(300);
  console.log = orig;
  const hints = logs.filter((l) => /\[echoes\] \/echoes -> .*npm run net/.test(l));
  check('B.ws502', ups.every((u) => /^HTTP\/1\.1 502/.test(u.status)), ups.map((u) => u.status));
  check('B.http502', get.status === 502 && /not running \(npm run net\)/.test(get.body), get);
  check('B.oneHint', hints.length === 1, hints);
  check('B.noViteErrors', B.cap.lines.filter((l) => l.lvl === 'error').length === 0, B.cap.lines.map((l) => l.msg.split('\n')[0]));
  await B.server.close();
}

const pass = Object.values(checks).filter((c) => c && typeof c.pass === 'boolean' && c.pass).length;
const tot = Object.values(checks).filter((c) => c && typeof c.pass === 'boolean').length;
writeFileSync(`captures/gntfixDEPLOY4/gntfixDEPLOY4-proxyunit-${a.tag || 'run'}.json`, JSON.stringify({ when: new Date().toISOString(), summary: `${pass}/${tot}`, checks }, null, 2));
console.log('SUMMARY', `${pass}/${tot}`);
process.exit(pass === tot ? 0 : 1);
