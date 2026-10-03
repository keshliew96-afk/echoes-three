// Guest interpolation clock (docs/gauntlet/PLAN.md §3.7 "Interpolation").
// Owner: M5b. Pure (the caller passes performance.now()).
//
// Remote entities render at hostTime − interpDelay, with
//   interpDelay = clamp(2 × snapshotInterval + 2 × jitterStd, 100, 250) ms.
// hostTime is estimated from snapshot arrivals: every snapshot gives one
// sample off = hostTick − localTicks(arrival). The estimate tracks the
// LEAST-delayed envelope of those samples (a fresher sample moves it up at
// once; delayed ones drift it down slowly), so jitter never drags the render
// clock backwards. The render tick itself never jumps: it advances at local
// frame time × a speed held in [0.9, 1.1] that steers it onto the target
// (a slewing PLL), and only snaps when it is more than 24 ticks off (join,
// host migration, a long stall).
const TPM = 60 / 1000; // ticks per ms

export function createInterpClock({ snapshotEveryTicks = 3, minDelayMs = 100, maxDelayMs = 250 } = {}) {
  let offEst = null;
  let residAbs = 0; // EWMA of |sample − envelope| in ticks
  let rt = null;
  let lastNow = null;
  let every = snapshotEveryTicks;
  const stats = { samples: 0, snaps: 0, speedMin: 1, speedMax: 1 };

  function onSnapshot(tick, nowMs) {
    const off = tick - nowMs * TPM;
    stats.samples += 1;
    if (offEst === null) {
      offEst = off;
      return;
    }
    const r = off - offEst;
    if (r > 0) offEst += r * 0.5;
    else offEst += r * 0.1;
    residAbs += (Math.abs(r) - residAbs) * 0.1;
  }

  // Mean absolute deviation -> σ (normal: σ ≈ 1.25 × MAD), in ms.
  const jitterStdMs = () => (residAbs * 1.25) / TPM;
  function delayMs() {
    const d = 2 * (every / TPM) + 2 * jitterStdMs();
    return Math.max(minDelayMs, Math.min(maxDelayMs, d));
  }

  function renderTick(nowMs) {
    if (offEst === null) return null;
    const target = offEst + nowMs * TPM - delayMs() * TPM;
    if (rt === null || lastNow === null || Math.abs(target - rt) > 24) {
      if (rt !== null) stats.snaps += 1;
      rt = target;
    } else {
      const dt = Math.max(0, Math.min(100, nowMs - lastNow)) * TPM;
      const speed = Math.max(0.9, Math.min(1.1, 1 + (target - rt) * 0.05));
      if (speed < stats.speedMin) stats.speedMin = speed;
      if (speed > stats.speedMax) stats.speedMax = speed;
      rt += dt * speed;
    }
    lastNow = nowMs;
    return rt;
  }

  // Host tick of the freshest data "now" (the latency envelope, no delay).
  const hostNow = (nowMs) => (offEst === null ? null : offEst + nowMs * TPM);

  return {
    onSnapshot,
    renderTick,
    hostNow,
    delayMs,
    jitterStdMs,
    setSnapshotEvery(n) {
      every = Math.max(1, n | 0);
    },
    reset() {
      offEst = null;
      residAbs = 0;
      rt = null;
      lastNow = null;
    },
    stats: () => ({ ...stats, delayMs: Math.round(delayMs() * 10) / 10, jitterMs: Math.round(jitterStdMs() * 10) / 10, rt, offEst }),
  };
}
