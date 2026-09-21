// Frame scheduler (docs/gauntlet/PLAN.md §3.3 + §5). Owner: M1.
// ARCH stub: behaviour-identical to the v0.4.63 loop (three's
// renderer.setAnimationLoop = one frame per requestAnimationFrame) plus the
// measurement surface the display gates need. M1 implements configure():
//   vsync:true  + limit L -> rAF-paced, a frame is rendered on the rAF tick
//                            where accumulated time >= 1000/L (L <= display Hz)
//   vsync:false + limit L -> uncapped scheduler (MessageChannel loop, yields
//                            to input between frames), paced to L by
//                            performance.now(); L = 0 renders back to back.
//                            Browsers still PRESENT at the display refresh —
//                            the label must say so (PLAN §5).
// The sim is independent of this: main.js advances the 60 Hz clock by the
// wall time between rendered frames, so every limit keeps 60 ticks/s.
//
// frame(nowMs, frameMs) is main.js's per-frame body (sim advance + render).

const WINDOW_MS = 2000;

export function createFrameScheduler({ renderer, frame }) {
  let running = false;
  let last = null;
  const cfg = { vsync: true, limit: 0 };
  const rendered = []; // timestamps of rendered frames (last WINDOW_MS)
  const rafTicks = []; // timestamps of rAF callbacks (display cadence probe)
  const frameMs = [];
  let source = 'raf';

  function note(arr, t) {
    arr.push(t);
    while (arr.length && t - arr[0] > WINDOW_MS) arr.shift();
  }

  function onRaf(now) {
    note(rafTicks, now);
    const dt = last === null ? 1000 / 60 : now - last;
    last = now;
    note(rendered, now);
    frameMs.push(dt);
    if (frameMs.length > 240) frameMs.shift();
    source = 'raf';
    frame(now, dt);
  }

  function start() {
    if (running) return;
    running = true;
    last = null;
    renderer.setAnimationLoop(onRaf);
  }

  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
  }

  // configure({ vsync?, limit? }) — ARCH stub records the request only; M1
  // makes it real (and the Display tab must not ship before it is).
  function configure(next = {}) {
    if (typeof next.vsync === 'boolean') cfg.vsync = next.vsync;
    if (typeof next.limit === 'number') cfg.limit = next.limit;
    return { ...cfg, applied: false };
  }

  const rate = (arr) => {
    if (arr.length < 2) return 0;
    return ((arr.length - 1) * 1000) / (arr[arr.length - 1] - arr[0]);
  };
  const pct = (p) => {
    if (!frameMs.length) return 0;
    const s = [...frameMs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  };

  function stats() {
    return {
      renderedFps: Math.round(rate(rendered) * 10) / 10,
      rafHz: Math.round(rate(rafTicks) * 10) / 10,
      source,
      vsync: cfg.vsync,
      limit: cfg.limit,
      applied: false, // ARCH stub: configure() is not wired yet (M1)
      frameMsP50: Math.round(pct(0.5) * 100) / 100,
      frameMsP95: Math.round(pct(0.95) * 100) / 100,
      running,
    };
  }

  return { start, stop, configure, stats, get running() { return running; } };
}
