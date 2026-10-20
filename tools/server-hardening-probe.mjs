// SERVER HARDENING probe (docs/CODE_REVIEW.md #1-#5, v0.5.307), headless,
// no browser. Starts the real server (node server/index.mjs) as a child on a
// spare port and plays the abuse cases the code review proved, each from its
// own made-up client address (X-Forwarded-For from loopback = one trusted
// proxy hop, the way Caddy or Render deliver it):
//   - a client that stops reading cannot grow the server's memory (pings
//     before hello, or a room's snapshots), and is cut off;
//   - player addresses come from the trusted proxy hop, never a spoofed one;
//   - a cloud upload is refused before its body is read (rate, size, slots);
//   - the daily board takes a few new ids per address a day and refuses old builds;
//   - one address cannot hold every room; new connections per address are rate-limited;
//   - quick match sends its once-a-second status; /health from afar is trimmed.
//
//   node tools/server-hardening-probe.mjs [--port 7961] [--out captures/server-hardening-probe.json]
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const PORT = Number(arg('port', 7961));
const OUT = arg('out', join(ROOT, 'captures', 'server-hardening-probe.json'));

const { PROTOCOL_VERSION, BIN } = await import(u('src/net/protocol/constants.js'));
const { SEAT_ALL } = await import(u('src/net/protocol/codec.js'));
const { clientIp, defaultTrustProxy } = await import(u('server/server.mjs'));
const { dailySeed, dailyKey } = await import(u('src/data/daily.js'));
const { VERSION } = await import(u('src/version.js'));
const { MAX_ROOMS_PER_IP } = await import(u('server/lobby.mjs'));
const { NEW_IDS_PER_IP_DAY } = await import(u('server/daily.mjs'));

const results = [];
function check(id, what, ok, detail = null) {
  results.push({ id, what, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${what}${detail ? `  ${JSON.stringify(detail)}` : ''}`);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ipSeq = 10;
const newIp = () => `203.0.113.${ipSeq++}`;

// ------------------------------------------------------------ the server --
const cloudDir = mkdtempSync(join(tmpdir(), 'echoes-hardening-'));
const child = spawn(process.execPath, [join(ROOT, 'server/index.mjs'), '--port', String(PORT), '--cloud-dir', cloudDir], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, RENDER: '', ECHOES_TRUST_PROXY: '' } });
let childOut = '';
child.stdout.on('data', (d) => (childOut += d));
child.stderr.on('data', (d) => (childOut += d));
for (let i = 0; i < 100 && !childOut.includes('[echoes-net] ready'); i++) await wait(50);
const rss = () => Math.round(Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${child.pid}/status`, 'utf8'))[1]) / 1024);

// ------------------------------------------------- raw WebSocket client --
function frame(op, payload) {
  payload = Buffer.from(payload);
  const len = payload.length;
  let h;
  if (len < 126) {
    h = Buffer.alloc(2);
    h[1] = 0x80 | len;
  } else if (len < 65536) {
    h = Buffer.alloc(4);
    h[1] = 0x80 | 126;
    h.writeUInt16BE(len, 2);
  } else {
    h = Buffer.alloc(10);
    h[1] = 0x80 | 127;
    h.writeUInt32BE(len, 6);
  }
  h[0] = 0x80 | op;
  return Buffer.concat([h, Buffer.alloc(4), payload]); // zero mask
}
function connect(ip) {
  return new Promise((res, rej) => {
    const s = net.connect(PORT, '127.0.0.1');
    let buf = Buffer.alloc(0);
    s.msgs = [];
    s.closedAt = null;
    s.on('close', () => (s.closedAt = Date.now()));
    s.once('connect', () => s.write(`GET /echoes HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nX-Forwarded-For: ${ip}\r\n\r\n`));
    let up = false;
    s.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!up) {
        const i = buf.indexOf('\r\n\r\n');
        if (i < 0) return;
        const head = buf.subarray(0, i).toString();
        if (!head.startsWith('HTTP/1.1 101')) {
          s.destroy();
          return rej(Object.assign(new Error(head.split('\r\n')[0]), { status: Number(head.split(' ')[1]) }));
        }
        up = true;
        buf = buf.subarray(i + 4);
        res(s);
      }
      for (;;) {
        if (buf.length < 2) break;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) break;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) break;
          len = buf.readUInt32BE(6);
          off = 10;
        }
        if (buf.length < off + len) break;
        if ((buf[0] & 0xf) === 1) {
          try {
            s.msgs.push(JSON.parse(buf.subarray(off, off + len).toString()));
          } catch {
            /* not JSON */
          }
        }
        buf = buf.subarray(off + len);
      }
    });
    s.on('error', (e) => (up ? null : rej(e)));
  });
}
const sendJ = (s, o) => s.write(frame(1, JSON.stringify(o)));
async function until(s, pred, ms = 3000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const m = s.msgs.find(pred);
    if (m) return m;
    await wait(20);
  }
  return null;
}
async function hello(ip, name = 'probe') {
  const s = await connect(ip);
  sendJ(s, { t: 'hello', v: PROTOCOL_VERSION, build: VERSION, name });
  s.welcome = await until(s, (m) => m.t === 'welcome');
  return s;
}
function httpReq(method, path, { ip, body = null, headers = {} } = {}) {
  return new Promise((res) => {
    const t0 = Date.now();
    const req = http.request({ host: '127.0.0.1', port: PORT, method, path, headers: { 'x-forwarded-for': ip, ...(body !== null ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...headers } }, (r) => {
      let text = '';
      r.on('data', (d) => (text += d));
      r.on('end', () => res({ status: r.statusCode, text, ms: Date.now() - t0 }));
      r.on('error', () => res({ status: r.statusCode, text, ms: Date.now() - t0 }));
    });
    req.on('error', (e) => res({ status: 0, error: e.code, ms: Date.now() - t0 }));
    if (body !== null) req.end(body);
    else req.end();
  });
}

try {
  check('boot', 'the server starts on its port', childOut.includes('[echoes-net] ready'), { port: PORT });

  // -------------------------------------------- 1. clients that stop reading
  {
    const before = rss();
    const s = await connect(newIp());
    s.pause(); // never reads again
    const ping = frame(9, Buffer.alloc(125));
    const t0 = Date.now();
    let sent = 0;
    while (Date.now() - t0 < 4000 && !s.closedAt) {
      for (let i = 0; i < 200; i++) s.write(ping);
      sent += 200;
      await wait(5);
    }
    await wait(300);
    const after = rss();
    check('pings', 'a client pinging before hello and never reading is cut off, and the server stays small', !!s.closedAt && after - before < 120, { sent, cutAfterMs: s.closedAt ? s.closedAt - t0 : null, rssBefore: before, rssAfter: after });
    s.destroy();
  }
  {
    const before = rss();
    const ip = newIp();
    const h = await hello(ip, 'host');
    sendJ(h, { t: 'create_room', visibility: 'private' });
    const code = (await until(h, (m) => m.t === 'room_state'))?.room?.code;
    const gs = [];
    for (let i = 0; i < 3; i++) {
      const g = await hello(newIp(), `g${i}`);
      sendJ(g, { t: 'join_room', code });
      await until(g, (m) => m.t === 'room_state');
      sendJ(g, { t: 'set_ready', ready: true });
      gs.push(g);
    }
    await wait(200);
    sendJ(h, { t: 'start_game' });
    await wait(1800);
    for (const g of gs) g.pause();
    const keep = setInterval(() => sendJ(h, { t: 'ping', ts: Date.now() }), 500);
    const snap = Buffer.alloc(200 * 1024);
    snap[0] = BIN.SNAP;
    snap[1] = SEAT_ALL;
    const f = frame(2, snap);
    const t0 = Date.now();
    let n = 0;
    let peak = before;
    while (Date.now() - t0 < 6000) {
      for (let i = 0; i < 20; i++) h.write(f);
      n += 20;
      await wait(40);
      if (n % 200 === 0) peak = Math.max(peak, rss());
    }
    clearInterval(keep);
    await wait(500);
    peak = Math.max(peak, rss());
    check('snapshots', 'three guests that stop reading while the host streams 200 KB snapshots keep the server small', !!code && peak - before < 150, { code, frames: n, mbUp: Math.round((n * 200) / 1024), rssBefore: before, rssPeak: peak });
    check('host', 'the host that keeps reading stays connected', !h.closedAt && gs.every((g) => !g.closedAt || g.closedAt), { hostClosed: !!h.closedAt });
    for (const s of [h, ...gs]) s.destroy();
  }

  // ------------------------------------------------- 2. client addresses --
  {
    const req = (direct, xff) => ({ socket: { remoteAddress: direct }, headers: xff ? { 'x-forwarded-for': xff } : {} });
    const a = clientIp(req('10.0.0.5', '198.51.100.7'), 1).ip;
    const b = clientIp(req('10.0.0.5', '6.6.6.6, 198.51.100.7'), 1).ip;
    const c = clientIp(req('10.0.0.5', '198.51.100.7'), 0).ip;
    const d = clientIp(req('127.0.0.1', '1.1.1.1, 198.51.100.8'), 0).ip;
    check('address', 'behind one trusted proxy the client is the last hop; a hop the client wrote is never read', a === '198.51.100.7' && b === '198.51.100.7' && c === '10.0.0.5' && d === '198.51.100.8', { a, b, c, d });
    check('render', 'on Render one proxy hop is trusted by default (ECHOES_TRUST_PROXY overrides)', defaultTrustProxy({ RENDER: 'true' }) === 1 && defaultTrustProxy({}) === 0 && defaultTrustProxy({ RENDER: 'true', ECHOES_TRUST_PROXY: '2' }) === 2);
  }

  // ------------------------------------------------------ 3. cloud saves --
  {
    const big = JSON.stringify({ bundle: { kind: 'echoes-cloud', v: 1, profile: null, slots: { 'manual-1': 'x'.repeat(3 * 1024 * 1024 - 200) } } });
    const ip = newIp();
    const before = rss();
    let peak = before;
    const watch = setInterval(() => (peak = Math.max(peak, rss())), 50);
    const rs = await Promise.all(Array.from({ length: 80 }, () => httpReq('POST', '/cloud/save', { ip, body: big })));
    clearInterval(watch);
    const by = {};
    for (const r of rs) by[r.status] = (by[r.status] || 0) + 1;
    // A refused upload is answered, then its connection is closed mid-body:
    // a client still writing may see the reset (status 0) instead, so a reset
    // counts as a refusal. Any other failure (refused connect, a dead server)
    // does not.
    const resets = rs.filter((r) => r.status === 0 && (r.error === 'ECONNRESET' || r.error === 'EPIPE')).length;
    const failed = rs.filter((r) => r.status === 0).length - resets;
    const refused = (by[429] || 0) + (by[503] || 0) + resets;
    check('uploads', '80 concurrent 3 MB uploads from one address: most refused unread (answered or reset), memory stays small', peak - before < 150 && (by[200] || 0) <= 30 && refused >= 50 && failed === 0, { statuses: by, resets, failed, rssBefore: before, rssPeak: peak });
    const tooBig = await httpReq('POST', '/cloud/save', { ip: newIp(), body: '{}', headers: { 'content-length': String(8 * 1024 * 1024) } });
    check('declared', 'an upload declaring more than the cap is refused before its body', tooBig.status === 413, { status: tooBig.status });
    const small = await httpReq('POST', '/cloud/save', { ip: newIp(), body: JSON.stringify({ bundle: { kind: 'echoes-cloud', v: 1, profile: '{}', slots: {} } }) });
    const code = small.status === 200 ? JSON.parse(small.text).code : null;
    const back = code ? await httpReq('GET', `/cloud/save/${code}`, { ip: newIp() }) : null;
    check('cloud', 'a normal save and load still work', small.status === 200 && back && back.status === 200, { save: small.status, load: back && back.status });
  }

  // ----------------------------------------------------- 4. daily board --
  {
    const key = dailyKey(Date.now());
    const ip = newIp();
    const post = (i, extra = {}) => httpReq('POST', '/daily/score', { ip, body: JSON.stringify({ key, id: `probe-player-${String(i).padStart(4, '0')}-xx`, name: `P${i}`, cls: 'archer', depth: 5, won: false, ticks: 9000, seed: dailySeed(key), version: VERSION, ...extra }) });
    const st = [];
    for (let i = 0; i < NEW_IDS_PER_IP_DAY + 2; i++) st.push((await post(i)).status);
    check('ids', `one address puts at most ${NEW_IDS_PER_IP_DAY} new players on a day's board`, st.slice(0, NEW_IDS_PER_IP_DAY).every((s) => s === 200) && st.slice(NEW_IDS_PER_IP_DAY).every((s) => s === 429), { statuses: st });
    const again = await post(0);
    check('retry', 'the same run sent again from that address is still answered', again.status === 200, { status: again.status });
    const old = await httpReq('POST', '/daily/score', { ip: newIp(), body: JSON.stringify({ key, id: 'probe-player-old-build-x', name: 'Old', cls: 'archer', depth: 40, won: true, ticks: 9600, seed: dailySeed(key), version: '0.5.0' }) });
    check('version', 'a post from a build far behind the server is refused', old.status === 400 && JSON.parse(old.text).error === 'bad_version', { status: old.status, body: old.text });
  }

  // ------------------------------------------- 5. rooms and connections --
  {
    const ip = newIp();
    const got = [];
    for (let i = 0; i < MAX_ROOMS_PER_IP + 2; i++) {
      const s = await hello(ip, `r${i}`);
      sendJ(s, { t: 'create_room', visibility: 'private' });
      const m = await until(s, (x) => x.t === 'room_state' || x.t === 'join_rejected');
      got.push(m ? (m.t === 'room_state' ? 'room' : m.reason) : 'none');
      s.destroy(); // the room is held 10 s for a reload
    }
    const other = await hello(newIp(), 'other');
    sendJ(other, { t: 'create_room', visibility: 'private' });
    const om = await until(other, (x) => x.t === 'room_state' || x.t === 'join_rejected');
    other.destroy();
    check('rooms', `one address holds at most ${MAX_ROOMS_PER_IP} rooms; another address still gets one`, got.slice(0, MAX_ROOMS_PER_IP).every((g) => g === 'room') && got.slice(MAX_ROOMS_PER_IP).every((g) => g === 'server_full') && om && om.t === 'room_state', { got, other: om && om.t });
  }
  {
    const ip = newIp();
    const s = await hello(ip);
    check('ids64', 'peer ids are 64-bit', /^p[0-9a-f]{16}$/.test(s.welcome?.peerId || ''), { peerId: s.welcome?.peerId });
    s.destroy();
    let refused = 0;
    let first = null;
    for (let i = 0; i < 70; i++) {
      try {
        const c = await connect(ip);
        c.destroy();
      } catch (e) {
        refused += 1;
        if (first === null) first = i + 2;
        if (e.status !== 429) refused += 1000;
      }
    }
    check('connrate', 'new connections from one address are capped at 60 a minute (429 after; the hello above is the first)', refused === 11 && first === 61, { refused, firstRefused: first });
  }

  // ---------------------------------------- 6. quick match and /health --
  {
    const q = await hello(newIp(), 'quick');
    sendJ(q, { t: 'quick_match' });
    await wait(3500);
    const st = q.msgs.filter((m) => m.t === 'match_status' && m.queued);
    check('quick', 'a lone quick-match host gets its once-a-second status', st.length >= 3, { statuses: st.length });
    q.destroy();
    const far = JSON.parse((await httpReq('GET', '/health', { ip: newIp() })).text);
    const near = await new Promise((res) => http.get(`http://127.0.0.1:${PORT}/health`, (r) => {
      let t = '';
      r.on('data', (d) => (t += d));
      r.on('end', () => res(JSON.parse(t)));
    }));
    check('health', '/health from afar shows liveness and build only; this machine still sees the counts', far.ok && far.peers === undefined && far.lanUrls === undefined && near.ok && typeof near.peers === 'number', { far: Object.keys(far), near: Object.keys(near).length });
  }
} finally {
  child.kill('SIGTERM');
  await wait(300);
  rmSync(cloudDir, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ version: VERSION, port: PORT, results }, null, 2));
console.log(`${results.length - failed.length}/${results.length} ${failed.length ? 'FAILED' : 'ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
