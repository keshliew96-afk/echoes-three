import net from 'node:net';
import { randomBytes } from 'node:crypto';
export function frame(op, payload) {
  payload = Buffer.from(payload);
  const len = payload.length; let h;
  if (len < 126) { h = Buffer.alloc(2); h[1] = 0x80 | len; }
  else if (len < 65536) { h = Buffer.alloc(4); h[1] = 0x80 | 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[1] = 0x80 | 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(len, 6); }
  h[0] = 0x80 | op;
  const mask = Buffer.alloc(4); // zero mask: payload unchanged
  return Buffer.concat([h, mask, payload]);
}
export function connect(host, port, { headers = {} } = {}) {
  return new Promise((res, rej) => {
    const s = net.connect(port, host);
    let buf = Buffer.alloc(0); const msgs = [];
    s.msgs = msgs;
    const extra = Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join('');
    s.once('connect', () => s.write(`GET /echoes HTTP/1.1\r\nHost: ${host}:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\n${extra}\r\n`));
    let up = false;
    s.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!up) { const i = buf.indexOf('\r\n\r\n'); if (i < 0) return; const head = buf.subarray(0, i).toString(); if (!head.startsWith('HTTP/1.1 101')) { rej(new Error(head.split('\r\n')[0])); s.destroy(); return; } up = true; buf = buf.subarray(i + 4); res(s); }
      for (;;) { if (buf.length < 2) break; let len = buf[1] & 0x7f, off = 2; if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; } else if (len === 127) { if (buf.length < 10) break; len = buf.readUInt32BE(6); off = 10; }
        if (buf.length < off + len) break; const op = buf[0] & 0xf; const p = buf.subarray(off, off + len); if (op === 1) { try { msgs.push(JSON.parse(p.toString())); } catch {} } buf = buf.subarray(off + len); }
    });
    s.on('error', rej);
  });
}
export const sendJ = (s, o) => s.write(frame(1, JSON.stringify(o)));
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function until(s, pred, ms = 3000) { const t = Date.now(); while (Date.now() - t < ms) { const m = s.msgs.find(pred); if (m) return m; await wait(20); } throw new Error('timeout waiting'); }
export function rss(pid) { const fs = globalThis.__fs; return null; }
