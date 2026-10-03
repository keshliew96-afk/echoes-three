// Worker metronome (docs/gauntlet/PLAN.md §3.7 "Stale input + hidden tabs").
// Owner: M5b.
//
// Browsers clamp timers in a background tab (1 Hz, or less under intensive
// throttling) and stop requestAnimationFrame entirely. A dedicated Worker's
// timers are NOT subject to that clamp, so while a tab is hidden:
//   - a HOST keeps the shared sim running: the metronome posts at 60 Hz and
//     the session driver calls clock.advance(elapsedWallMs, simStep) per tick
//     message (snapshots and keyframes continue; render stops);
//   - a GUEST keeps its net loop alive at 20 Hz (acks, away frames, pings,
//     snapshot decode) while render and prediction stop.
// The Worker is built from an inline Blob (no extra file to serve). Where
// Workers are unavailable (Node bots, locked-down pages) it falls back to a
// plain interval — honest about the throttling in stats().fallback.
const WORKER_SRC = `
let timer = null;
let period = 16.667;
let next = 0;
function loop() {
  const now = performance.now();
  if (now >= next) {
    postMessage(now);
    next += period;
    if (now - next > period * 4) next = now + period; // never burst after a stall
  }
  timer = setTimeout(loop, Math.max(0, Math.min(period, next - performance.now())));
}
onmessage = (e) => {
  const d = e.data || {};
  if (d.cmd === 'start') {
    period = 1000 / Math.max(1, Math.min(240, d.hz || 60));
    next = performance.now() + period;
    clearTimeout(timer);
    loop();
  } else if (d.cmd === 'stop') {
    clearTimeout(timer);
    timer = null;
  }
};
`;

export function createMetronome() {
  let worker = null;
  let url = null;
  let fallback = null;
  let onTick = null;
  let running = false;
  const stats = { ticks: 0, starts: 0, fallback: false, hz: 0, lastAt: 0 };

  function ensureWorker() {
    if (worker || typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') return worker;
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = () => {
        if (!running || !onTick) return;
        stats.ticks += 1;
        stats.lastAt = performance.now();
        try {
          onTick(stats.lastAt);
        } catch (err) {
          console.warn('[net] metronome tick threw', err);
        }
      };
    } catch {
      worker = null;
    }
    return worker;
  }

  function start(hz, fn) {
    stop();
    onTick = fn;
    running = true;
    stats.starts += 1;
    stats.hz = hz;
    const w = ensureWorker();
    if (w) {
      stats.fallback = false;
      w.postMessage({ cmd: 'start', hz });
    } else {
      stats.fallback = true;
      fallback = setInterval(() => {
        if (!running || !onTick) return;
        stats.ticks += 1;
        stats.lastAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        onTick(stats.lastAt);
      }, 1000 / hz);
    }
  }

  function stop() {
    running = false;
    onTick = null;
    if (worker) worker.postMessage({ cmd: 'stop' });
    if (fallback) clearInterval(fallback);
    fallback = null;
  }

  function dispose() {
    stop();
    if (worker) worker.terminate();
    worker = null;
    if (url) URL.revokeObjectURL(url);
    url = null;
  }

  return {
    start,
    stop,
    dispose,
    get running() {
      return running;
    },
    stats: () => ({ ...stats }),
  };
}
