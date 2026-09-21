// Frame scheduler (docs/gauntlet/PLAN.md §3.3 + §5). Owner: M1.
//
//   vsync:true  + limit L -> rAF-paced (three's setAnimationLoop): one render per
//                            requestAnimationFrame, skipping rAF ticks so the
//                            long-run rate is L when L is below the display rate
//                            (phase-stable accumulator: next due += 1000/L).
//   vsync:false + limit L -> uncapped MessageChannel loop (a task per frame, so
//                            input and timers interleave between frames), paced
//                            to L by performance.now() (a coarse timeout, then a
//                            short message spin); L = 0 renders back to back.
//                            Browsers still PRESENT at the display refresh and
//                            never tear — the Display tab says so (PLAN §5).
//                            It stops while the page is hidden.
// A light rAF probe keeps sampling the display cadence (rafHz) while V-Sync is
// off, so the "your display caps this" and GPU-bound notes stay measured.
// The sim is independent of this: main.js advances the 60 Hz clock by the wall
// time between rendered frames, so every limit keeps 60 ticks/s.
//
// frame(nowMs, frameMs) is main.js's per-frame body (sim advance + render).
// stats(): { renderedFps, rafHz, source, vsync, limit, applied, frameMsP50,
// frameMsP95, workMsP50, workMsP95, running, uncappedFps, uncappedWorkMsP50,
// frames } over a sliding 2 s window. workMs = wall time inside frame()
// including the WebGL submission.

const WINDOW_MS = 2000;

// Time-windowed sample buffer (amortised O(1) pruning — at 1000 fps a plain
// Array.shift() per frame would cost more than the frame).
function makeWindow() {
  const t = [];
  const v = [];
  let head = 0;
  return {
    add(ts, val) {
      t.push(ts);
      v.push(val);
      while (head < t.length && ts - t[head] > WINDOW_MS) head += 1;
      if (head > 4096) {
        t.splice(0, head);
        v.splice(0, head);
        head = 0;
      }
    },
    count(now) {
      let h = head;
      while (h < t.length && now - t[h] > WINDOW_MS) h += 1;
      return t.length - h;
    },
    rate(now) {
      let h = head;
      while (h < t.length && now - t[h] > WINDOW_MS) h += 1;
      const n = t.length - h;
      if (n < 2) return 0;
      const span = t[t.length - 1] - t[h];
      return span > 0 ? ((n - 1) * 1000) / span : 0;
    },
    pct(p, now) {
      let h = head;
      while (h < t.length && now - t[h] > WINDOW_MS) h += 1;
      if (h >= v.length) return 0;
      const s = v.slice(h).sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.floor(p * s.length))];
    },
    clear() {
      t.length = 0;
      v.length = 0;
      head = 0;
    },
  };
}

const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;

export function createFrameScheduler({ renderer, frame }) {
  let running = false;
  const cfg = { vsync: true, limit: 0 };
  const rendered = makeWindow(); // rendered-frame timestamps (value = frameMs)
  const work = makeWindow();
  const rafTicks = makeWindow();
  let lastRender = null; // timestamp of the last rendered frame
  let lastNow = 0; // monotonic guard across rAF / performance.now() sources
  let nextDue = null; // limiter accumulator
  let rafIv = 1000 / 60; // smoothed rAF interval (display cadence)
  let lastRafTs = null;
  let probeId = 0; // rAF probe while V-Sync is off
  let uncapped = false; // MessageChannel loop active
  let timer = 0;
  const channel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
  let lastUncapped = { fps: 0, workMsP50: 0, at: 0 };
  let frames = 0;

  function noteRaf(ts) {
    if (lastRafTs !== null) {
      const d = ts - lastRafTs;
      if (d > 0 && d < 100) rafIv += (d - rafIv) * 0.1;
    }
    lastRafTs = ts;
    rafTicks.add(ts, 0);
  }

  function render(now) {
    const t = Math.max(now, lastNow);
    lastNow = t;
    const dt = lastRender === null ? 1000 / 60 : t - lastRender;
    lastRender = t;
    rendered.add(t, dt);
    frames += 1;
    const w0 = performance.now();
    frame(t, dt);
    work.add(t, performance.now() - w0);
  }

  // Limiter: true when a frame is due at `now`. The accumulator advances one
  // interval per rendered frame, so the long-run rate is exactly the limit
  // whenever the source can go faster; a stall resyncs instead of bursting.
  function due(now, tol) {
    if (!cfg.limit) return true;
    const iv = 1000 / cfg.limit;
    if (nextDue === null || now - nextDue > iv) nextDue = now;
    if (now >= nextDue - tol) {
      nextDue += iv;
      return true;
    }
    return false;
  }

  // ------------------------------------------------------- V-Sync on (rAF) --
  function onRaf(ts) {
    noteRaf(ts);
    const tol = cfg.limit ? Math.min((1000 / cfg.limit) * 0.25, rafIv * 0.5) : 0;
    if (due(ts, tol)) render(ts);
  }

  // ---------------------------------------------- V-Sync off (uncapped loop) --
  function probe(ts) {
    noteRaf(ts);
    if (uncapped) probeId = requestAnimationFrame(probe);
  }

  function pump() {
    timer = 0;
    if (!running || cfg.vsync || !uncapped) return;
    if (typeof document !== 'undefined' && document.hidden) {
      uncapped = false; // resumes on visibilitychange
      return;
    }
    const now = performance.now();
    if (!cfg.limit) {
      render(now);
      channel.port2.postMessage(0);
      return;
    }
    const iv = 1000 / cfg.limit;
    if (nextDue === null || now - nextDue > iv) nextDue = now;
    const wait = nextDue - now;
    if (wait <= 0.25) {
      nextDue += iv;
      render(now);
      channel.port2.postMessage(0);
    } else if (wait > 2.5) {
      timer = setTimeout(pump, Math.floor(wait - 1.5));
    } else {
      channel.port2.postMessage(0); // short spin for sub-ms accuracy
    }
  }
  if (channel) channel.port1.onmessage = pump;

  function startUncapped() {
    if (!channel) return false;
    if (uncapped) return true;
    uncapped = true;
    nextDue = null;
    cancelAnimationFrame(probeId);
    probeId = requestAnimationFrame(probe);
    channel.port2.postMessage(0);
    return true;
  }

  function stopUncapped() {
    if (!uncapped) return;
    const now = performance.now();
    if (rendered.count(now) > 30) lastUncapped = { fps: r1(rendered.rate(now)), workMsP50: r2(work.pct(0.5, now)), at: Math.round(now) };
    uncapped = false;
    cancelAnimationFrame(probeId);
    if (timer) clearTimeout(timer);
    timer = 0;
  }

  function engage() {
    if (!running) return;
    if (cfg.vsync || !channel) {
      stopUncapped();
      renderer.setAnimationLoop(onRaf);
    } else {
      renderer.setAnimationLoop(null);
      startUncapped();
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && running && !cfg.vsync) {
        lastRender = null; // a hidden gap is not a frame time
        startUncapped();
      }
    });
  }

  function start() {
    if (running) return;
    running = true;
    lastRender = null;
    nextDue = null;
    engage();
  }

  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
    stopUncapped();
  }

  // configure({ vsync?, limit? }) -> the applied config. A switch between the
  // two sources resets the measurement windows so stats never average across
  // two regimes.
  function configure(next = {}) {
    const prevV = cfg.vsync;
    const prevL = cfg.limit;
    if (typeof next.vsync === 'boolean') cfg.vsync = next.vsync;
    if (typeof next.limit === 'number' && Number.isFinite(next.limit) && next.limit >= 0) cfg.limit = Math.round(next.limit);
    if (cfg.vsync !== prevV || cfg.limit !== prevL) {
      if (cfg.vsync !== prevV && cfg.vsync) stopUncapped(); // keep its last measurement
      if (cfg.vsync !== prevV && !cfg.vsync) lastUncapped = { fps: 0, workMsP50: 0, at: 0 };
      rendered.clear();
      work.clear();
      nextDue = null;
      if (cfg.vsync !== prevV) engage();
    }
    return { ...cfg, applied: true };
  }

  function stats() {
    const now = performance.now();
    const renderedFps = r1(rendered.rate(now));
    const workP50 = r2(work.pct(0.5, now));
    if (!cfg.vsync && rendered.count(now) > 30) lastUncapped = { fps: renderedFps, workMsP50: workP50, at: Math.round(now) };
    return {
      renderedFps,
      rafHz: r1(rafTicks.rate(now)),
      source: cfg.vsync ? 'raf' : 'uncapped',
      vsync: cfg.vsync,
      limit: cfg.limit,
      applied: true,
      frameMsP50: r2(rendered.pct(0.5, now)),
      frameMsP95: r2(rendered.pct(0.95, now)),
      workMsP50: workP50,
      workMsP95: r2(work.pct(0.95, now)),
      running,
      uncappedFps: lastUncapped.fps,
      uncappedWorkMsP50: lastUncapped.workMsP50,
      samples: rendered.count(now),
      frames,
    };
  }

  return {
    start,
    stop,
    configure,
    stats,
    get running() {
      return running;
    },
    get config() {
      return { ...cfg };
    },
  };
}
