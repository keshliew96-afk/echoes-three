// Frame scheduler (docs/gauntlet/PLAN.md §3.3 + §5). Owner: M1.
//
//   vsync:true  + limit L -> rAF-paced (three's setAnimationLoop): one render per
//                            requestAnimationFrame, skipping rAF ticks so the
//                            long-run rate is L when L is below the display rate
//                            (phase-stable accumulator: next due += 1000/L).
//   vsync:false + limit L -> uncapped: one frame on each rAF plus EXTRA frames
//                            rendered back to back by a MessageChannel loop
//                            between refreshes (a task per frame, so input and
//                            timers interleave), paced to L by performance.now()
//                            when L > 0. Browsers still PRESENT at the display
//                            refresh and never tear — the Display tab says so
//                            (PLAN §5). It stops while the page is hidden (rAF
//                            stops; nothing re-arms the loop until it resumes).
// rafHz is sampled from the rAF callbacks in both modes.
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
  let uncapped = false; // MessageChannel loop active
  let timer = 0;
  const channel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
  let lastUncapped = { fps: 0, workMsP50: 0, at: 0 };
  let frames = 0;

  // DISPLAY CADENCE. rafHz (the rate rAF actually ran) drops below the
  // panel's refresh whenever frames are slower than a refresh (Chrome then
  // skips vsyncs), so the display's own rate is estimated from the SHORTEST
  // common rAF interval — the 10th percentile of the last 2 s of intervals is
  // one vsync period even when most frames take two — and the highest such
  // estimate of the last 30 s is reported as displayHz.
  const rafDeltas = makeWindow();
  const hzSamples = [];
  let lastHzSampleAt = 0;
  function noteRaf(ts) {
    if (lastRafTs !== null) {
      const d = ts - lastRafTs;
      if (d > 0 && d < 100) {
        rafIv += (d - rafIv) * 0.1;
        if (d > 2) rafDeltas.add(ts, d);
      }
    }
    lastRafTs = ts;
    rafTicks.add(ts, 0);
    if (ts - lastHzSampleAt >= 1000 && rafDeltas.count(ts) >= 20) {
      lastHzSampleAt = ts;
      const p10 = rafDeltas.pct(0.1, ts);
      if (p10 > 0) hzSamples.push({ t: ts, hz: 1000 / p10 });
      while (hzSamples.length && ts - hzSamples[0].t > 30000) hzSamples.shift();
    }
  }
  function displayHz() {
    let m = 0;
    for (const x of hzSamples) if (x.hz > m) m = x.hz;
    return m;
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
  // rAF-ANCHORED: each display refresh still runs one rAF (so the browser's
  // own rendering update — the DOM HUD, the canvas commit, the page's paint —
  // keeps the display cadence), and between two refreshes a MessageChannel
  // loop renders EXTRA frames back to back until the next refresh is due;
  // then it yields, so the browser's rendering update (and the rAF after it)
  // runs at most one frame late and commits the freshest frame. A plain
  // postMessage flood measured rAF starved to 8 Hz on this machine (the page
  // would have SHOWN 8 fps); anchoring keeps the display fed and still renders
  // as fast as the GPU allows. The extra frames are never displayed — the
  // honest copy in the Display tab says exactly that.
  let rafStart = 0; // performance-timeline start of the current refresh
  let workEma = 4; // ms, smoothed frame() cost
  let vsyncPeriod = 1000 / 60;
  // Extra frames start until the next refresh is due.
  function budgetEnd() {
    return rafStart + vsyncPeriod;
  }

  // When refreshes are already being missed (the last rAF came > 1.6 vsync
  // periods after the one before — the GPU / CPU is the bottleneck), extra
  // frames would only delay the display further: that refresh renders one
  // frame, exactly like V-Sync on, and the Display tab says the device is
  // GPU-bound.
  let extraOk = true;
  let prevRafTs = null;
  function onRafUncapped(ts) {
    const gap = prevRafTs === null ? 0 : ts - prevRafTs;
    prevRafTs = ts;
    noteRaf(ts);
    rafStart = ts;
    vsyncPeriod = 1000 / (displayHz() || 1000 / rafIv || 60);
    extraOk = !(gap > vsyncPeriod * 1.6);
    const now = performance.now();
    const tol = cfg.limit ? Math.min((1000 / cfg.limit) * 0.25, rafIv * 0.5) : 0;
    if (!cfg.limit || due(now, tol)) renderUncapped(now);
    if (channel) channel.port2.postMessage(0);
  }

  function renderUncapped(now) {
    const w0 = performance.now();
    render(now);
    const w = performance.now() - w0;
    workEma += (w - workEma) * 0.2;
  }

  function pump() {
    if (!running || cfg.vsync || !uncapped || !extraOk) return;
    const now = performance.now();
    // Another frame only until the next refresh is due; then yield — the next
    // rAF (a rendering update) takes over.
    if (now > budgetEnd()) return;
    if (cfg.limit) {
      const iv = 1000 / cfg.limit;
      if (nextDue === null || now - nextDue > iv) nextDue = now;
      if (nextDue - now > 0.25) {
        // Timer-paced: wait for the due time if it falls inside this refresh.
        if (nextDue <= budgetEnd()) {
          if (nextDue - now > 2) timer = setTimeout(pump, Math.floor(nextDue - now - 1));
          else channel.port2.postMessage(0);
        }
        return;
      }
      nextDue += iv;
    }
    renderUncapped(now);
    channel.port2.postMessage(0);
  }
  if (channel) channel.port1.onmessage = pump;

  function startUncapped() {
    if (!channel) return false;
    uncapped = true;
    nextDue = null;
    prevRafTs = null;
    renderer.setAnimationLoop(onRafUncapped);
    return true;
  }

  function stopUncapped() {
    if (!uncapped) return;
    const now = performance.now();
    if (rendered.count(now) > 30) lastUncapped = { fps: r1(rendered.rate(now)), workMsP50: r2(work.pct(0.5, now)), at: Math.round(now) };
    uncapped = false;
    if (timer) clearTimeout(timer);
    timer = 0;
  }

  function engage() {
    if (!running) return;
    if (cfg.vsync || !channel) {
      stopUncapped();
      renderer.setAnimationLoop(onRaf);
    } else {
      startUncapped();
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && running) lastRender = null; // a hidden gap is not a frame time
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
      displayHz: r1(displayHz() || rafTicks.rate(now)),
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
    get frames() {
      return frames;
    },
    get config() {
      return { ...cfg };
    },
  };
}
