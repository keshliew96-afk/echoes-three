// Binary codec for the Echoes network protocol (docs/gauntlet/PLAN.md §3.7).
// Owner: M5a. ISOMORPHIC (browser client, Node server, Node bots): no DOM, no
// Node built-ins — TextEncoder / TextDecoder are globals in both.
//
// Every binary WebSocket frame is RELAYED by the session server, so it starts
// with a two-byte relay envelope:
//
//   u8 channel (BIN.*)   u8 seat
//
// host -> server : seat = DESTINATION seat (0xFF = every connected guest)
// guest -> server: seat = ignored; the server overwrites it with the sender's
//                  seat before forwarding to the host
// delivered      : seat = the seat the frame is about (the receiver's own seat
//                  on a guest, the sender's seat on the host)
//
// The channel bodies (SNAP, INPUT, EVENTS, CMD, KEYFRAME) follow the envelope;
// their layouts are documented next to each encoder below. Integers are
// little-endian. varu = unsigned LEB128 (exact up to 2^53), vari = zigzag
// varu. Readers throw a RangeError('truncated …') on short input so a corrupt
// or hostile frame can never read past its end.
import { BIN, INPUT_REDUNDANCY } from './constants.js';
import { canonicalJSON, parseCanonical } from '../../core/canonical.js';

export const SEAT_ALL = 0xff;
export const NO_SEQ = 0xffffffff;

const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: true });

export function utf8(str) {
  return te.encode(str);
}
export function fromUtf8(bytes) {
  return td.decode(bytes);
}

// ------------------------------------------------------------- writer --
export class ByteWriter {
  constructor(capacity = 256) {
    this.buf = new Uint8Array(capacity);
    this.dv = new DataView(this.buf.buffer);
    this.len = 0;
  }
  ensure(n) {
    if (this.len + n <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < this.len + n) cap *= 2;
    const nb = new Uint8Array(cap);
    nb.set(this.buf.subarray(0, this.len));
    this.buf = nb;
    this.dv = new DataView(nb.buffer);
  }
  u8(v) {
    this.ensure(1);
    this.buf[this.len++] = v & 0xff;
    return this;
  }
  u16(v) {
    this.ensure(2);
    this.dv.setUint16(this.len, v & 0xffff, true);
    this.len += 2;
    return this;
  }
  i16(v) {
    this.ensure(2);
    this.dv.setInt16(this.len, v, true);
    this.len += 2;
    return this;
  }
  u32(v) {
    this.ensure(4);
    this.dv.setUint32(this.len, v >>> 0, true);
    this.len += 4;
    return this;
  }
  f64(v) {
    this.ensure(8);
    this.dv.setFloat64(this.len, v, true);
    this.len += 8;
    return this;
  }
  // Unsigned LEB128, exact for every integer 0 .. 2^53-1 (no 32-bit ops).
  varu(v) {
    if (!(v >= 0) || !Number.isSafeInteger(v)) throw new RangeError(`varu: ${v} is not a safe unsigned integer`);
    this.ensure(8);
    while (v >= 0x80) {
      this.buf[this.len++] = (v % 0x80) | 0x80;
      v = Math.floor(v / 0x80);
      if (this.len + 1 > this.buf.length) this.ensure(8);
    }
    this.buf[this.len++] = v;
    return this;
  }
  vari(v) {
    if (!Number.isSafeInteger(v)) throw new RangeError(`vari: ${v} is not a safe integer`);
    return this.varu(v >= 0 ? v * 2 : -v * 2 - 1);
  }
  bytes(u8) {
    this.ensure(u8.length);
    this.buf.set(u8, this.len);
    this.len += u8.length;
    return this;
  }
  // Length-prefixed byte string.
  blob(u8) {
    this.varu(u8.length);
    return this.bytes(u8);
  }
  str(s) {
    return this.blob(te.encode(s));
  }
  finish() {
    return this.buf.slice(0, this.len);
  }
}

// ------------------------------------------------------------- reader --
export class ByteReader {
  constructor(u8, offset = 0) {
    this.buf = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
    this.dv = new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength);
    this.pos = offset;
  }
  need(n) {
    if (this.pos + n > this.buf.length) throw new RangeError(`truncated frame (need ${n} at ${this.pos}/${this.buf.length})`);
  }
  get remaining() {
    return this.buf.length - this.pos;
  }
  u8() {
    this.need(1);
    return this.buf[this.pos++];
  }
  u16() {
    this.need(2);
    const v = this.dv.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  i16() {
    this.need(2);
    const v = this.dv.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32() {
    this.need(4);
    const v = this.dv.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f64() {
    this.need(8);
    const v = this.dv.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }
  varu() {
    let result = 0;
    let mul = 1;
    for (let i = 0; i < 8; i++) {
      const b = this.u8();
      result += (b & 0x7f) * mul;
      if ((b & 0x80) === 0) {
        if (!Number.isSafeInteger(result)) throw new RangeError('varu overflow');
        return result;
      }
      mul *= 0x80;
    }
    throw new RangeError('varu too long');
  }
  vari() {
    const u = this.varu();
    return u % 2 === 0 ? u / 2 : -(u + 1) / 2;
  }
  bytes(n) {
    this.need(n);
    const out = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  blob() {
    return this.bytes(this.varu());
  }
  str() {
    return td.decode(this.blob());
  }
  rest() {
    return this.bytes(this.remaining);
  }
}

// ---------------------------------------------------- relay envelope --
export function channelOf(u8) {
  return u8 && u8.length >= 2 ? u8[0] : -1;
}
export function seatOf(u8) {
  return u8 && u8.length >= 2 ? u8[1] : -1;
}
// Server-side in-place seat rewrite (guest -> host forwarding).
export function withSeat(u8, seat) {
  const out = u8.slice();
  out[1] = seat & 0xff;
  return out;
}
export function frameWriter(channel, seat, capacity = 256) {
  return new ByteWriter(capacity).u8(channel).u8(seat);
}
// Delivery class (PLAN §3.7): SNAP + INPUT are unreliable (latest-wins; the
// conditioner may drop / duplicate / reorder them), everything else reliable.
export function isUnreliableChannel(channel) {
  return channel === BIN.SNAP || channel === BIN.INPUT;
}

// hex16 <-> two u32 lanes (the §3.4 state hash on the wire as a u64).
export function writeHash(w, hex) {
  w.u32(parseInt(hex.slice(0, 8), 16));
  w.u32(parseInt(hex.slice(8, 16), 16));
}
export function readHash(r) {
  return r.u32().toString(16).padStart(8, '0') + r.u32().toString(16).padStart(8, '0');
}

// -------------------------------------------------------------- INPUT --
// Guest -> host, unreliable, one packet per guest tick carrying the newest
// <= INPUT_REDUNDANCY unacked frames (oldest first), so a lost packet costs
// nothing as long as one of the next five arrives.
//
//   envelope · u32 ackSnapSeq (newest snapshot seq decoded; NO_SEQ = none)
//   · u8 count · frames…
//   frame: varu seq (first absolute, then +delta) · varu tick (first absolute,
//          then +delta) · varu viewTick8 (interpolated host tick on screen ×8)
//          · u8 moveHeld (bits 0-3 move 0 none / 1..8 = E,NE,N,NW,W,SW,S,SE;
//            bit 4 basic held, bit 5 revive held, bit 6 away)
//          · i16 aimX · i16 aimZ (1/64 u) · u16 press bits
//
// press bits: 0 dodge, 1..8 skill_1..skill_8, 9 interact (PLAN: skill_1..4
// of the class kit today; 8 slots reserved for the 8-slot kit).
export const PRESS = Object.freeze({ dodge: 0, skill_1: 1, skill_2: 2, skill_3: 3, skill_4: 4, skill_5: 5, skill_6: 6, skill_7: 7, skill_8: 8, interact: 9 });
export const AIM_Q = 64;

function clampI16(v) {
  return v < -32768 ? -32768 : v > 32767 ? 32767 : v;
}

export function encodeInputPacket(seat, ackSnapSeq, frames) {
  const list = frames.slice(-INPUT_REDUNDANCY);
  const w = frameWriter(BIN.INPUT, seat, 16 + list.length * 12);
  w.u32(ackSnapSeq === null || ackSnapSeq === undefined ? NO_SEQ : ackSnapSeq);
  w.u8(list.length);
  let prevSeq = 0;
  let prevTick = 0;
  list.forEach((f, i) => {
    if (i === 0) {
      w.varu(f.seq);
      w.varu(f.tick >>> 0);
    } else {
      if (f.seq <= prevSeq || f.tick < prevTick) throw new RangeError('input frames must be in ascending seq/tick order');
      w.varu(f.seq - prevSeq);
      w.varu(f.tick - prevTick);
    }
    prevSeq = f.seq;
    prevTick = f.tick;
    w.varu(Math.max(0, Math.round((f.viewTick ?? 0) * 8)));
    const move = (f.move ?? 0) & 0x0f;
    w.u8(move | (f.basic ? 0x10 : 0) | (f.revive ? 0x20 : 0) | (f.away ? 0x40 : 0));
    w.i16(clampI16(Math.round((f.aimX ?? 0) * AIM_Q)));
    w.i16(clampI16(Math.round((f.aimZ ?? 0) * AIM_Q)));
    w.u16(f.press ?? 0);
  });
  return w.finish();
}

export function decodeInputPacket(u8) {
  const r = new ByteReader(u8);
  const channel = r.u8();
  if (channel !== BIN.INPUT) throw new RangeError(`not an INPUT frame (${channel})`);
  const seat = r.u8();
  const ack = r.u32();
  const n = r.u8();
  if (n > INPUT_REDUNDANCY) throw new RangeError(`too many input frames (${n})`);
  const frames = [];
  let seq = 0;
  let tick = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      seq = r.varu();
      tick = r.varu();
    } else {
      seq += r.varu();
      tick += r.varu();
    }
    const viewTick = r.varu() / 8;
    const mh = r.u8();
    const aimX = r.i16() / AIM_Q;
    const aimZ = r.i16() / AIM_Q;
    const press = r.u16();
    frames.push({ seq, tick, viewTick, move: mh & 0x0f, basic: !!(mh & 0x10), revive: !!(mh & 0x20), away: !!(mh & 0x40), aimX, aimZ, press });
  }
  return { seat, ackSnapSeq: ack === NO_SEQ ? null : ack, frames };
}

// ------------------------------------------------------------- EVENTS --
// Host -> guest, reliable, one batch per snapshot: every sim event since the
// previous batch except `sound` (each client derives its own sounds).
//   envelope · u32 batchSeq · u32 fromTick · u32 toTick · canonical JSON array
export function encodeEvents(seat, batchSeq, fromTick, toTick, events) {
  const body = te.encode(canonicalJSON(events));
  const w = frameWriter(BIN.EVENTS, seat, 16 + body.length);
  w.u32(batchSeq).u32(fromTick >>> 0).u32(toTick >>> 0).bytes(body);
  return w.finish();
}
export function decodeEvents(u8) {
  const r = new ByteReader(u8);
  if (r.u8() !== BIN.EVENTS) throw new RangeError('not an EVENTS frame');
  const seat = r.u8();
  const batchSeq = r.u32();
  const fromTick = r.u32();
  const toTick = r.u32();
  const events = parseCanonical(td.decode(r.rest()));
  if (!Array.isArray(events)) throw new RangeError('EVENTS body is not an array');
  return { seat, batchSeq, fromTick, toTick, events };
}

// ---------------------------------------------------------------- CMD --
// Guest -> host, reliable: meta commands (draft/path picks that the host
// rejects or applies, door pings, ready). envelope · u32 cmdSeq · JSON object
export function encodeCmd(seat, cmdSeq, cmd) {
  const body = te.encode(canonicalJSON(cmd));
  return frameWriter(BIN.CMD, seat, 8 + body.length).u32(cmdSeq).bytes(body).finish();
}
export function decodeCmd(u8) {
  const r = new ByteReader(u8);
  if (r.u8() !== BIN.CMD) throw new RangeError('not a CMD frame');
  const seat = r.u8();
  const cmdSeq = r.u32();
  const cmd = parseCanonical(td.decode(r.rest()));
  if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) throw new RangeError('CMD body is not an object');
  return { seat, cmdSeq, cmd };
}

// ----------------------------------------------------------- KEYFRAME --
// Host -> server only (cached for reconnect / host migration, never
// forwarded): envelope(seat 0) · u32 tick · canonical JSON of the complete
// state tree (save.capture()). Exact — no quantisation, so a migrated host
// continues from bit-identical state.
export function encodeKeyframe(tick, tree) {
  const body = te.encode(canonicalJSON(tree));
  return frameWriter(BIN.KEYFRAME, 0, 8 + body.length).u32(tick >>> 0).bytes(body).finish();
}
export function decodeKeyframe(u8) {
  const r = new ByteReader(u8);
  if (r.u8() !== BIN.KEYFRAME) throw new RangeError('not a KEYFRAME frame');
  r.u8();
  const tick = r.u32();
  const tree = parseCanonical(td.decode(r.rest()));
  return { tick, tree };
}
export function keyframeTick(u8) {
  if (!u8 || u8.length < 6 || u8[0] !== BIN.KEYFRAME) return null;
  return new DataView(u8.buffer, u8.byteOffset, u8.byteLength).getUint32(2, true);
}

// base64 for binary payloads carried inside JSON control messages
// (become_host.keyframe). Isomorphic: no Buffer, no btoa dependency on bytes.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64R = new Int16Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) B64R[B64.charCodeAt(i)] = i;
export function toBase64(u8) {
  let out = '';
  let i = 0;
  for (; i + 2 < u8.length; i += 3) {
    const n = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  if (i < u8.length) {
    const n = (u8[i] << 16) | ((i + 1 < u8.length ? u8[i + 1] : 0) << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < u8.length ? B64[(n >> 6) & 63] : '=') + '=';
  }
  return out;
}
export function fromBase64(s) {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64R[clean.charCodeAt(i)];
    const b = B64R[clean.charCodeAt(i + 1)];
    const c = i + 2 < clean.length ? B64R[clean.charCodeAt(i + 2)] : 0;
    const d = i + 3 < clean.length ? B64R[clean.charCodeAt(i + 3)] : 0;
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new RangeError('bad base64');
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}
