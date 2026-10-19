// Zero-dependency RFC 6455 WebSocket server transport (docs/gauntlet/PLAN.md
// §3.7). Owner: M5a. Node built-ins only (node:crypto, node:events).
//
//   acceptUpgrade(req, socket, head, { path, maxPayload }) -> WsConnection | null
//
// Implements the server side of RFC 6455 without extensions: the opening
// handshake (Sec-WebSocket-Accept = base64(SHA-1(key + GUID)), version 13
// only, 426 otherwise), masked client frames (an unmasked client frame is a
// protocol error, 1002), 7/16/64-bit lengths, fragmentation with
// continuation frames, interleaved control frames, ping -> pong, the close
// handshake (echo the peer's code, 1 s grace, then end the socket), UTF-8
// validation of text messages (1007), and a per-message size cap (1009).
// Server frames are never masked. TCP_NODELAY is set: the game sends small
// latency-sensitive frames and must never wait for Nagle.
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OP = { CONT: 0x0, TEXT: 0x1, BIN: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xa };
const td = new TextDecoder('utf-8', { fatal: true });
const te = new TextEncoder();

// SERVER HARDENING (docs/CODE_REVIEW.md #1): bytes queued for a peer that
// is not reading. Above SOFT the server's droppable frames (snapshots,
// inputs, pongs) are skipped; above HARD the peer is cut off. Without this a
// client that stops reading made Node queue every frame (1.3 GB in 5 s).
export const BUFFER_SOFT_BYTES = 1 << 20;
export const BUFFER_HARD_BYTES = 4 << 20;
// Pings a peer may send (each answered with a pong): a bucket refilled at
// PING_RATE.perSec; past killAfter dropped pings in 10 s the peer is cut off.
const PING_RATE = { perSec: 5, burst: 20, killAfter: 200 };

export const CLOSE = Object.freeze({
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL: 1002,
  UNSUPPORTED: 1003,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  BAD_DATA: 1007,
  POLICY: 1008,
  TOO_BIG: 1009,
  INTERNAL: 1011,
  // application codes (4000-4999)
  TIMEOUT: 4000,
  VERSION: 4001,
  SERVER_FULL: 4002,
  SUPERSEDED: 4003,
  NO_HELLO: 4004,
  ADMIN_DROP: 4005,
  KILLED_HOST: 4006,
  SHUTDOWN: 4007,
});

function validCloseCode(c) {
  return (c >= 1000 && c <= 1003) || (c >= 1007 && c <= 1011) || (c >= 3000 && c <= 4999);
}

export function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

function httpError(socket, status, text, extra = '') {
  try {
    socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Type: text/plain\r\n${extra}Content-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}`);
  } catch {
    socket.destroy();
  }
}

// Validates the opening handshake and completes it. Returns the connection or
// null (after answering with an HTTP error).
export function acceptUpgrade(req, socket, head, { path = '/echoes', maxPayload = 1 << 20 } = {}) {
  let pathname = '/';
  try {
    pathname = new URL(req.url, 'http://x').pathname;
  } catch {
    /* keep '/' */
  }
  if (pathname !== path) {
    httpError(socket, 404, 'Not Found');
    return null;
  }
  const upgrade = String(req.headers.upgrade || '').toLowerCase();
  const connection = String(req.headers.connection || '').toLowerCase();
  if (req.method !== 'GET' || upgrade !== 'websocket' || !connection.split(/\s*,\s*/).includes('upgrade')) {
    httpError(socket, 400, 'Bad Request');
    return null;
  }
  if (String(req.headers['sec-websocket-version']) !== '13') {
    httpError(socket, 426, 'Upgrade Required', 'Sec-WebSocket-Version: 13\r\n');
    return null;
  }
  const key = String(req.headers['sec-websocket-key'] || '');
  let keyOk = false;
  try {
    keyOk = Buffer.from(key, 'base64').length === 16;
  } catch {
    keyOk = false;
  }
  if (!keyOk) {
    httpError(socket, 400, 'Bad Request');
    return null;
  }
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`
  );
  socket.setNoDelay(true);
  const conn = new WsConnection(socket, { maxPayload, remoteAddress: socket.remoteAddress });
  if (head && head.length) conn._onData(head);
  return conn;
}

export class WsConnection extends EventEmitter {
  constructor(socket, { maxPayload = 1 << 20, remoteAddress = null } = {}) {
    super();
    this.socket = socket;
    this.maxPayload = maxPayload;
    this.remoteAddress = remoteAddress;
    this.buf = Buffer.alloc(0);
    this.frag = null; // { opcode, parts: Buffer[], size }
    this.closeSent = false;
    this.closeReceived = false;
    this.closed = false;
    this.closeCode = CLOSE.ABNORMAL;
    this.closeReason = '';
    this.bytesIn = 0;
    this.bytesOut = 0;
    this._closeTimer = null;
    this.maxBuffered = BUFFER_HARD_BYTES;
    this.overflowed = false;
    this._ping = { tokens: PING_RATE.burst, last: Date.now(), dropped: 0, windowStart: Date.now() };
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => this._finish());
    socket.on('error', (err) => {
      this.emit('socketError', err);
      this._finish();
    });
    socket.on('end', () => {
      if (!this.closeReceived) this.closeCode = CLOSE.ABNORMAL;
      // DEPLOY: the peer half-closed (TCP FIN, no close frame). The upgraded
      // socket of an http server allows half-open, so without this it would
      // linger until the silence sweep (5 s) — holding a per-IP slot.
      if (!this.closed) this.socket.end();
    });
  }

  get open() {
    return !this.closed && !this.closeSent;
  }
  get bufferedAmount() {
    return this.socket.writableLength || 0;
  }
  // True while the peer is behind on reading: droppable frames are skipped.
  get congested() {
    return this.bufferedAmount > BUFFER_SOFT_BYTES;
  }

  // send(string | Uint8Array, { droppable }) — one unfragmented frame. A
  // droppable frame is skipped (false) while the peer is congested.
  send(data, { droppable = false } = {}) {
    if (!this.open) return false;
    if (droppable && this.congested) return false;
    if (typeof data === 'string') return this._frame(OP.TEXT, Buffer.from(te.encode(data)));
    return this._frame(OP.BIN, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  }
  ping(payload = Buffer.alloc(0)) {
    if (!this.open) return false;
    return this._frame(OP.PING, Buffer.from(payload).subarray(0, 125));
  }

  // close(code, reason): starts the close handshake; the socket ends when the
  // peer answers or after 1 s.
  close(code = CLOSE.NORMAL, reason = '') {
    if (this.closed || this.closeSent) return;
    const r = Buffer.from(te.encode(String(reason))).subarray(0, 123);
    const payload = Buffer.alloc(2 + r.length);
    payload.writeUInt16BE(validCloseCode(code) ? code : CLOSE.NORMAL, 0);
    r.copy(payload, 2);
    this._frame(OP.CLOSE, payload);
    this.closeSent = true;
    if (!this.closeReceived) {
      this.closeCode = code;
      this.closeReason = String(reason);
    }
    if (this.closeReceived) this.socket.end();
    else {
      this._closeTimer = setTimeout(() => this.socket.destroy(), 1000);
      this._closeTimer.unref?.();
    }
  }
  terminate() {
    this.socket.destroy();
    this._finish();
  }

  _frame(opcode, payload) {
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeUInt32BE(Math.floor(len / 2 ** 32), 2);
      header.writeUInt32BE(len >>> 0, 6);
    }
    header[0] = 0x80 | opcode;
    // A peer this far behind is not reading: cut it off before its queue
    // eats the server's memory (its seat is held like any dropped link).
    if (this.bufferedAmount + header.length + len > this.maxBuffered) {
      if (!this.overflowed) {
        this.overflowed = true;
        this.closeCode = CLOSE.POLICY;
        this.closeReason = 'not reading';
        this.emit('overflow', { buffered: this.bufferedAmount });
      }
      this.terminate();
      return false;
    }
    this.bytesOut += header.length + len;
    try {
      // One write per frame (header + payload) keeps the queue at one entry.
      if (!len) this.socket.write(header);
      else this.socket.write(Buffer.concat([header, payload], header.length + len));
      return true;
    } catch {
      return false;
    }
  }

  // The ping bucket: 'ok', 'drop' (no pong) or 'kill'.
  _takePing() {
    const b = this._ping;
    const t = Date.now();
    b.tokens = Math.min(PING_RATE.burst, b.tokens + ((t - b.last) / 1000) * PING_RATE.perSec);
    b.last = t;
    if (t - b.windowStart > 10000) {
      b.windowStart = t;
      b.dropped = 0;
    }
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return 'ok';
    }
    b.dropped += 1;
    return b.dropped > PING_RATE.killAfter ? 'kill' : 'drop';
  }

  _fail(code, reason) {
    this.closeCode = code;
    this.closeReason = reason;
    this.emit('protocolError', { code, reason });
    this.close(code, reason);
    // Stop parsing anything else from a misbehaving peer.
    this.buf = Buffer.alloc(0);
    this._failed = true;
  }

  _onData(chunk) {
    if (this.closed || this._failed) return;
    this.bytesIn += chunk.length;
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : Buffer.from(chunk);
    for (;;) {
      if (this._failed || this.closed) return;
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0;
      const rsv = b[0] & 0x70;
      const opcode = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let off = 2;
      if (rsv) return this._fail(CLOSE.PROTOCOL, 'reserved bits set (no extensions negotiated)');
      if (!masked) return this._fail(CLOSE.PROTOCOL, 'client frames must be masked');
      if (len === 126) {
        if (b.length < 4) return;
        len = b.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (b.length < 10) return;
        const hi = b.readUInt32BE(2);
        const lo = b.readUInt32BE(6);
        if (hi !== 0 || lo > this.maxPayload) return this._fail(CLOSE.TOO_BIG, 'frame too large');
        len = lo;
        off = 10;
      }
      const isControl = opcode >= 0x8;
      if (isControl && (!fin || len > 125)) return this._fail(CLOSE.PROTOCOL, 'bad control frame');
      if (![OP.CONT, OP.TEXT, OP.BIN, OP.CLOSE, OP.PING, OP.PONG].includes(opcode)) return this._fail(CLOSE.PROTOCOL, `unknown opcode ${opcode}`);
      if (len > this.maxPayload) return this._fail(CLOSE.TOO_BIG, 'frame too large');
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4);
      const payload = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      this._onFrame(fin, opcode, payload);
    }
  }

  _onFrame(fin, opcode, payload) {
    switch (opcode) {
      case OP.PING: {
        // Rate-limited, and never answered into a congested queue.
        const r = this._takePing();
        if (r === 'kill') return this._fail(CLOSE.POLICY, 'ping flood');
        if (r === 'ok' && !this.congested) this._frame(OP.PONG, payload);
        return;
      }
      case OP.PONG:
        this.emit('pong', payload);
        return;
      case OP.CLOSE: {
        this.closeReceived = true;
        let code = CLOSE.NO_STATUS;
        let reason = '';
        if (payload.length === 1) return this._fail(CLOSE.PROTOCOL, 'bad close payload');
        if (payload.length >= 2) {
          code = payload.readUInt16BE(0);
          if (!validCloseCode(code)) return this._fail(CLOSE.PROTOCOL, 'invalid close code');
          try {
            reason = td.decode(payload.subarray(2));
          } catch {
            return this._fail(CLOSE.BAD_DATA, 'close reason is not UTF-8');
          }
        }
        if (!this.closeSent) {
          this.closeCode = code;
          this.closeReason = reason;
          this.close(code === CLOSE.NO_STATUS ? CLOSE.NORMAL : code, reason);
        }
        this.socket.end();
        return;
      }
      case OP.TEXT:
      case OP.BIN:
        if (this.frag) return this._fail(CLOSE.PROTOCOL, 'new data frame inside a fragmented message');
        if (!fin) {
          this.frag = { opcode, parts: [payload], size: payload.length };
          return;
        }
        this._deliver(opcode, payload);
        return;
      case OP.CONT: {
        if (!this.frag) return this._fail(CLOSE.PROTOCOL, 'continuation without a start frame');
        this.frag.size += payload.length;
        if (this.frag.size > this.maxPayload) return this._fail(CLOSE.TOO_BIG, 'message too large');
        this.frag.parts.push(payload);
        if (fin) {
          const { opcode: op, parts } = this.frag;
          this.frag = null;
          this._deliver(op, Buffer.concat(parts));
        }
        return;
      }
      default:
        return undefined;
    }
  }

  _deliver(opcode, payload) {
    if (opcode === OP.TEXT) {
      let text;
      try {
        text = td.decode(payload);
      } catch {
        return this._fail(CLOSE.BAD_DATA, 'text message is not valid UTF-8');
      }
      this.emit('message', text, false);
    } else {
      this.emit('message', new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength), true);
    }
    return undefined;
  }

  _finish() {
    if (this.closed) return;
    this.closed = true;
    if (this._closeTimer) clearTimeout(this._closeTimer);
    this.emit('close', this.closeReceived || this.closeSent ? this.closeCode : CLOSE.ABNORMAL, this.closeReason);
  }
}
