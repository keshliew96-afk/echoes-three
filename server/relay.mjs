// Relay: per-link network conditioner + byte meters + binary routing
// (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
//
// Every connection owns a LINK with two conditioners (src/net/protocol/
// conditioner.js): `up` (peer -> server: applied before the server processes a
// frame, so silence detection sees what a real lossy link would deliver) and
// `down` (server -> peer). Frames are classed by their first byte: SNAP and
// INPUT are unreliable (drop / dup / reorder), everything else — JSON control
// text, EVENTS, CMD, KEYFRAME — is reliable (loss = retransmit delay, order
// kept). An inactive conditioner is a synchronous pass-through.
//
// Routing (relay envelope `u8 channel · u8 seat`, codec.js):
//   host  -> SNAP / EVENTS  seat = destination (0xFF = every connected guest)
//   guest -> INPUT / CMD    forwarded to the host with seat := sender's seat
//   host  -> KEYFRAME       cached for migration (keyframes.mjs), never forwarded
import { BIN } from '../src/net/protocol/constants.js';
import { createConditioner } from '../src/net/protocol/conditioner.js';
import { isUnreliableChannel, withSeat, SEAT_ALL } from '../src/net/protocol/codec.js';
import { storeKeyframe, touchHost } from './keyframes.mjs';

export const MAX_FRAME = Object.freeze({
  [BIN.SNAP]: 256 * 1024,
  [BIN.INPUT]: 1024,
  [BIN.EVENTS]: 256 * 1024,
  [BIN.CMD]: 4096,
  [BIN.KEYFRAME]: 1 << 20,
});

// Bytes / packets per 1 s window, last 60 windows.
export class ByteMeter {
  constructor(now) {
    this.now = now;
    this.windows = [];
    this.cur = { t: Math.floor(now() / 1000), bytes: 0, packets: 0 };
    this.total = 0;
    this.packets = 0;
  }
  add(n) {
    this.roll();
    this.cur.bytes += n;
    this.cur.packets += 1;
    this.total += n;
    this.packets += 1;
  }
  roll() {
    const t = Math.floor(this.now() / 1000);
    while (this.cur.t < t) {
      this.windows.push(this.cur);
      if (this.windows.length > 60) this.windows.shift();
      this.cur = { t: this.cur.t + 1, bytes: 0, packets: 0 };
    }
  }
  // Mean bytes/s over the last `n` complete windows.
  perSec(n = 5) {
    this.roll();
    const w = this.windows.slice(-n);
    if (!w.length) return 0;
    return Math.round(w.reduce((s, x) => s + x.bytes, 0) / w.length);
  }
  p95(n = 60) {
    this.roll();
    const w = this.windows.slice(-n).map((x) => x.bytes).sort((a, b) => a - b);
    return w.length ? w[Math.min(w.length - 1, Math.floor(w.length * 0.95))] : 0;
  }
}

// Link timing uses the monotonic high-resolution clock and the precise pump
// (conditioner.js) so a shaped hop is accurate to ~0.1 ms even where Node's
// timers wake on a 15.6 ms system tick (Windows).
const hrNow = () => performance.now();
export function createLink({ now, up = null, down = null }) {
  const opts = { now: hrNow, precise: true };
  return {
    up: createConditioner(up, opts),
    down: createConditioner(down, opts),
    inMeter: new ByteMeter(now),
    outMeter: new ByteMeter(now),
  };
}

export function linkStats(link) {
  const u = link.up.stats();
  const d = link.down.stats();
  return {
    bytesInPerSec: link.inMeter.perSec(),
    bytesOutPerSec: link.outMeter.perSec(),
    bytesInP95: link.inMeter.p95(),
    bytesOutP95: link.outMeter.p95(),
    bytesIn: link.inMeter.total,
    bytesOut: link.outMeter.total,
    up: { spec: u.spec, appliedLossPct: u.appliedLossPct, lost: u.lost, dupes: u.dupes, reordered: u.reordered, retransmits: u.retransmits, outageDrops: u.outageDrops, bwDrops: u.bwDrops, delayMeanMs: u.delayMeanMs, delayStdMs: u.delayStdMs, sent: u.sent },
    down: { spec: d.spec, appliedLossPct: d.appliedLossPct, lost: d.lost, dupes: d.dupes, reordered: d.reordered, retransmits: d.retransmits, outageDrops: d.outageDrops, bwDrops: d.bwDrops, delayMeanMs: d.delayMeanMs, delayStdMs: d.delayStdMs, sent: d.sent },
  };
}

// routeBinary(ctx, peer, u8) — ctx: { lobby, sendBinary(peer, u8), now, counters }
export function routeBinary(ctx, peer, u8) {
  const { lobby, counters } = ctx;
  if (!u8 || u8.length < 2) return bad(counters, 'short');
  const ch = u8[0];
  const max = MAX_FRAME[ch];
  if (max === undefined) return bad(counters, 'channel');
  if (u8.length > max) return bad(counters, 'too_large');
  const room = lobby.roomOf(peer);
  if (!room || room.state === 'lobby' || room.state === 'closed') return bad(counters, 'not_in_game');
  const isHost = room.hostPeerId === peer.id;
  if (isHost) touchHost(room, ctx.now());
  switch (ch) {
    case BIN.SNAP:
    case BIN.EVENTS: {
      if (!isHost) return bad(counters, 'guest_sent_host_channel');
      const dest = u8[1];
      let n = 0;
      for (const s of room.seats) {
        if (!s.peerId || !s.connected || s.peerId === peer.id) continue;
        if (dest !== SEAT_ALL && s.index !== dest) continue;
        const target = room.peerRef.get(s.peerId);
        if (target) {
          ctx.sendBinary(target, dest === SEAT_ALL ? withSeat(u8, s.index) : u8);
          n += 1;
        }
      }
      counters.relayed += n;
      return n;
    }
    case BIN.INPUT:
    case BIN.CMD: {
      // M5b (W4): the HOST answers guests on CMD too (command_rejected,
      // party pings) — routed like EVENTS: seat = destination, 0xFF = all.
      if (isHost && ch === BIN.CMD) {
        const dest = u8[1];
        let n = 0;
        for (const s of room.seats) {
          if (!s.peerId || !s.connected || s.peerId === peer.id) continue;
          if (dest !== SEAT_ALL && s.index !== dest) continue;
          const target = room.peerRef.get(s.peerId);
          if (target) {
            ctx.sendBinary(target, dest === SEAT_ALL ? withSeat(u8, s.index) : u8);
            n += 1;
          }
        }
        counters.relayed += n;
        return n;
      }
      if (isHost) return bad(counters, 'host_sent_guest_channel');
      const host = room.peerRef.get(room.hostPeerId);
      const hs = host ? lobby.seatOf(room, host.id) : null;
      if (!host || !hs || !hs.connected) return bad(counters, 'no_host');
      ctx.sendBinary(host, withSeat(u8, peer.seat));
      counters.relayed += 1;
      return 1;
    }
    case BIN.KEYFRAME: {
      if (!isHost) return bad(counters, 'guest_sent_keyframe');
      const r = storeKeyframe(room, u8, ctx.now());
      if (r.ok) counters.keyframes += 1;
      else bad(counters, `keyframe_${r.reason}`);
      return 0;
    }
    default:
      return bad(counters, 'channel');
  }
}

function bad(counters, why) {
  counters.badFrames += 1;
  counters.badByReason[why] = (counters.badByReason[why] || 0) + 1;
  return 0;
}

export { isUnreliableChannel };
