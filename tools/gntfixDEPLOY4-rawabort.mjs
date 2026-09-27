// gntfixDEPLOY4-rawabort: browser-free probe for DEPLOY r4 F1 (PLAN §14.2 "client aborts log nothing").
// Raw TCP clients upgrade /echoes THROUGH a vite dev/preview proxy (101 from the real session server), say
// hello (protocol v3) and keep the server writing to them (pings -> pongs), then leave in one of several ways.
// After each trial the proxy's terminal log is diffed: every new line is a failure unless it is expected.
//
//   closeframe   a clean WebSocket close frame, then FIN            (a player who clicks Leave)
//   fin          FIN without a close frame                          (a tab whose process is torn down politely)
//   rst          TCP RST                                            (a killed / crashed browser, a dropped network)
//   rst-stream   stop reading, flood pings so the server writes, RST (the "write ECONNABORTED" race)
//   burst        6 sockets streaming at once, all RST in the same tick (a browser with several tabs closing)
//   halfframe    half a frame written, then RST                     (a client dying mid-message)
//
// usage: node tools/gntfixDEPLOY4-rawabort.mjs --port 4394 --log <proxy log> --reps 5 --tag before
//        [--modes closeframe,fin,rst,rst-stream,burst,halfframe]
// Writes captures/gntfixDEPLOY4/gntfixDEPLOY4-rawabort-<tag>.json and prints one JSON line per trial + a total.
import net from 'node:net';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = +(a.port || 4394);
const reps = +(a.reps || 5);
const tag = a.tag || 'raw';
const modes = (a.modes || 'closeframe,fin,rst,rst-stream,burst,halfframe').split(',');
mkdirSync('captures/gntfixDEPLOY4', { recursive: true });
const logLines = () => readFileSync(a.log, 'utf8').replace(/\x1b\[[0-9;]*m/g, '').split('\n');

function frame(op, payload) {
  const mask = crypto.randomBytes(4);
  const body = Buffer.from(payload);
  const len = body.length;
  const head = len < 126 ? Buffer.from([0x80 | op, 0x80 | len]) : Buffer.from([0x80 | op, 0x80 | 126, len >> 8, len & 255]);
  for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
  return Buffer.concat([head, mask, body]);
}
const text = (o) => frame(1, JSON.stringify(o));

function upgrade() {
  return new Promise((res, rej) => {
    const s = net.connect(port, '127.0.0.1');
    let buf = '';
    const t = setTimeout(() => rej(new Error('no upgrade answer in 8 s')), 8000);
    s.on('error', () => {});
    s.on('data', function first(d) {
      buf += d.toString('latin1');
      if (buf.includes('\r\n\r\n')) {
        clearTimeout(t);
        s.off('data', first);
        res({ s, status: buf.split('\r\n')[0] });
      }
    });
    s.write(
      `GET /echoes HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n` +
        `Origin: http://127.0.0.1:${port}\r\n\r\n`,
    );
  });
}

async function streamingSocket() {
  const { s, status } = await upgrade();
  let got = 0;
  s.on('data', (d) => {
    got += d.length;
  });
  s.write(text({ t: 'hello', v: 3, name: 'gntfixDEPLOY4', build: null }));
  s.write(text({ t: 'create_room', name: 'gntfixDEPLOY4' }));
  for (let k = 0; k < 5; k++) s.write(text({ t: 'ping', ts: Date.now() + k }));
  return { s, status, got: () => got };
}

async function leave(mode) {
  if (mode === 'burst') {
    const socks = await Promise.all(Array.from({ length: 6 }, () => streamingSocket()));
    await sleep(600);
    for (const { s } of socks) {
      s.pause();
      for (let k = 0; k < 30; k++) s.write(text({ t: 'ping', ts: Date.now() + k }));
    }
    await sleep(120);
    for (const { s } of socks) s.resetAndDestroy();
    return { status: socks[0].status, sockets: socks.length, bytesFromServer: socks.reduce((n, x) => n + x.got(), 0) };
  }
  const { s, status, got } = await streamingSocket();
  await sleep(700);
  if (mode === 'closeframe') {
    s.write(frame(8, Buffer.from([0x03, 0xe9])));
    await sleep(300);
    s.end();
  } else if (mode === 'fin') s.end();
  else if (mode === 'rst') s.resetAndDestroy();
  else if (mode === 'rst-stream') {
    s.pause();
    for (let k = 0; k < 40; k++) s.write(text({ t: 'ping', ts: Date.now() + k }));
    await sleep(150);
    s.resetAndDestroy();
  } else if (mode === 'halfframe') {
    const f = text({ t: 'ping', ts: Date.now() });
    s.write(f.subarray(0, 5));
    await sleep(50);
    s.resetAndDestroy();
  } else throw new Error(`unknown mode ${mode}`);
  return { status, sockets: 1, bytesFromServer: got() };
}

const results = [];
const total = { trials: 0, upgraded: 0, newLines: 0, traces: 0, stackLines: 0, hintLines: 0 };
for (const mode of modes) {
  for (let i = 1; i <= reps; i++) {
    const rec = { mode, i };
    const before = logLines().length;
    try {
      Object.assign(rec, await leave(mode));
      await sleep(1500);
      const lines = logLines().slice(before - 1).filter((l) => l.trim());
      rec.newLines = lines.length;
      rec.traces = lines.filter((l) => /proxy socket error|proxy error/.test(l)).length;
      rec.stackLines = lines.filter((l) => /^\s+at /.test(l)).length;
      rec.heads = [...new Set(lines.filter((l) => !/^\s+at /.test(l)).map((l) => l.trim().replace(/^\d+:\d+:\d+ [ap]m /, '')))].slice(0, 6);
    } catch (e) {
      rec.fatal = String(e.message || e);
    }
    total.trials += 1;
    if (/ 101 /.test(rec.status || '')) total.upgraded += 1;
    total.newLines += rec.newLines || 0;
    total.traces += rec.traces || 0;
    total.stackLines += rec.stackLines || 0;
    console.log(JSON.stringify(rec));
    results.push(rec);
  }
}
const byMode = {};
for (const r of results) {
  const m = (byMode[r.mode] ||= { trials: 0, withLog: 0, traces: 0, stackLines: 0 });
  m.trials += 1;
  if (r.newLines) m.withLog += 1;
  m.traces += r.traces || 0;
  m.stackLines += r.stackLines || 0;
}
const out = { tag, port, when: new Date().toISOString(), total, byMode, results };
writeFileSync(`captures/gntfixDEPLOY4/gntfixDEPLOY4-rawabort-${tag}.json`, JSON.stringify(out, null, 2));
console.log('TOTAL', JSON.stringify(total), JSON.stringify(byMode));
