// Host keyframe cache (docs/gauntlet/PLAN.md §3.7 "Reconnect + host drop").
// Owner: M5a.
//
// The host sends a KEYFRAME (complete, exact state tree — codec.js
// encodeKeyframe) every 120 ticks (2 s). The server keeps the newest one per
// room; on migration it rides inside become_host { keyframe: { tick, b64,
// bytes, stateAgeMs } } so the new host `save.apply()`s state at most ~2 s
// older than the moment the old host went silent.
import { keyframeTick, toBase64 } from '../src/net/protocol/codec.js';

export const MAX_KEYFRAME_BYTES = 1 << 20;

export function storeKeyframe(room, u8, now) {
  if (!u8 || u8.length > MAX_KEYFRAME_BYTES) return { ok: false, reason: 'too_large' };
  const tick = keyframeTick(u8);
  if (tick === null) return { ok: false, reason: 'malformed' };
  if (room.keyframe && tick < room.keyframe.tick && room.keyframe.hostPeerId === room.hostPeerId) return { ok: false, reason: 'stale' };
  const bytes = u8.slice();
  let b64 = null;
  room.keyframe = {
    tick,
    bytes,
    receivedAt: now,
    hostLastSeenAt: now,
    hostPeerId: room.hostPeerId,
    b64: () => (b64 === null ? (b64 = toBase64(bytes)) : b64),
  };
  return { ok: true, tick };
}

// Called for every frame the room's host sends, so stateAgeMs measures the
// keyframe's age at the moment the host went quiet (not at migration time).
export function touchHost(room, now) {
  if (room.keyframe && room.keyframe.hostPeerId === room.hostPeerId) room.keyframe.hostLastSeenAt = now;
}
