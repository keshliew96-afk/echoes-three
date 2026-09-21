// Host lag compensation (docs/gauntlet/PLAN.md §3.7 "Lag compensation").
// Owner: M5b.
//
// The host keeps a ring of HOSTILE positions for the last 20 ticks, recorded
// at every tick end (the same moment snapshots are captured, so ring entry T
// is exactly what a guest interpolating at host tick T sees). A guest's
// instant shapes and projectile spawn aim resolve against hostile positions
// rewound to the input's viewTick (fractional, 1/8 tick): the two bracketing
// entries are lerped. Max rewind 15 ticks (250 ms) — further back is clamped.
// The host's own seat is never rewound; single-player never builds a ring.
// Positions only (PLAN "the rewind ring stores positions only").
import { REWIND_MAX_TICKS, REWIND_HISTORY_TICKS } from './protocol/constants.js';

export function createRewindRing({ registry, historyTicks = REWIND_HISTORY_TICKS, maxRewind = REWIND_MAX_TICKS } = {}) {
  const ring = []; // ascending { tick, pos: Map(id -> [x, z]) }
  let enabled = true;
  const stats = { queries: 0, rewound: 0, clamped: 0, ticksSum: 0 };
  let cacheKey = null;
  let cacheVal = null;

  function record(tick) {
    const pos = new Map();
    for (const e of registry.all()) {
      if (e.faction !== 'hostile' || !(e.hp > 0) || !Number.isFinite(e.x) || !Number.isFinite(e.z)) continue;
      pos.set(e.id, [e.x, e.z]);
    }
    if (ring.length && ring[ring.length - 1].tick >= tick) ring.length = 0; // time went back (restore / migration)
    ring.push({ tick, pos });
    while (ring.length > historyTicks) ring.shift();
    cacheKey = null;
  }

  function entryAt(t) {
    for (let i = ring.length - 1; i >= 0; i--) if (ring[i].tick <= t) return i;
    return -1;
  }

  // query(viewTick) -> { ticks, map: Map(id -> {x, z}) } | null (no rewind)
  function query(viewTick) {
    stats.queries += 1;
    if (!enabled || ring.length === 0 || !Number.isFinite(viewTick) || viewTick <= 0) return null;
    const now = ring[ring.length - 1].tick;
    let want = viewTick;
    if (want >= now) return null;
    if (now - want > maxRewind) {
      want = now - maxRewind;
      stats.clamped += 1;
    }
    const key = Math.round(want * 8);
    if (key === cacheKey) return cacheVal;
    const i = entryAt(want);
    if (i < 0) return null;
    const a = ring[i];
    const b = i + 1 < ring.length ? ring[i + 1] : null;
    const f = b ? (want - a.tick) / (b.tick - a.tick) : 0;
    const map = new Map();
    for (const [id, pa] of a.pos) {
      const pb = b ? b.pos.get(id) : null;
      if (pb) map.set(id, { x: pa[0] + (pb[0] - pa[0]) * f, z: pa[1] + (pb[1] - pa[1]) * f });
      else map.set(id, { x: pa[0], z: pa[1] });
    }
    const out = { ticks: now - want, map };
    stats.rewound += 1;
    stats.ticksSum += out.ticks;
    cacheKey = key;
    cacheVal = out;
    return out;
  }

  return {
    record,
    query,
    reset() {
      ring.length = 0;
      cacheKey = null;
    },
    setEnabled(on) {
      enabled = !!on;
      return enabled;
    },
    get enabled() {
      return enabled;
    },
    stats: () => ({ ...stats, avgTicks: stats.rewound ? Math.round((stats.ticksSum / stats.rewound) * 100) / 100 : 0, ring: ring.length }),
  };
}
