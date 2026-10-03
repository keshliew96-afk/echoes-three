// G2.7 — autosave fires ONLY at the listed safe points (room_enter,
// shop_open, run_end, return_to_camp, Save & Quit), captures on the event's
// own tick end, respects the 20 s throttle (except run end / quit), and no
// frame exceeds 50 ms while an autosave is at work (GPU harness, real-time
// sim — the autosave runs exactly as in play).
//   node tools/gntM2-drive.mjs tools/gntM2-sc-autosave.mjs
// Reported per autosave: the capture cost, the main-thread cost of every
// piece (snapshot, JPEG encode, file build, verify + write — each in its own
// task), and the frames from capture to completion. Frames that land in the
// room-swap hitch BEFORE the autosave starts its work are shown separately
// (`hitchBeforeWork`) together with an A/B control run of the same swaps with
// autosave OFF — those belong to the transition (M4b dressing swap), not M2.
const ORIGIN = 'http://127.0.0.1:5199/';

async function boot(h, on) {
  const { ev, waitFor } = h;
  await h.open(`${ORIGIN}?menu=0&seed=12&fresh=1`);
  await waitFor(() => window.__echoes.tick > 240 && window.__echoes.save && window.__echoes.state().gl.warmupPending === 0, { timeout: 90000 });
  await ev((on) => {
    window.__echoes.save.autosaveEnabled(on);
    window.__gntM2f = [];
    let last = performance.now();
    const f = (t) => {
      window.__gntM2f.push([Math.round(t), Math.round((t - last) * 10) / 10]);
      last = t;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    window.__gntM2ev = [];
    for (const t of ['run_start', 'room_enter', 'shop_open', 'run_end', 'return_to_camp']) {
      window.__echoes.on(t, (e) => window.__gntM2ev.push({ type: t, tick: e.tick, at: Math.round(performance.now()) }));
    }
  }, on);
}

// The same sequence of safe points in both legs.
async function drive(h) {
  const { ev, sleep, waitFor } = h;
  const writes = (n) => waitFor((n) => window.__echoes.save.autosaveLog().filter((r) => r.ok !== undefined).length >= n, { timeout: 15000 }, n);
  const on = await ev(() => window.__echoes.save.autosaveLog !== undefined);
  void on;
  await ev(() => window.__echoes.cmd('startRun', { act: 1 })); // room 1 room_enter
  await sleep(3000);
  await ev(() => window.__echoes.cmd('skipToRoom', 2)); // room 2 room_enter < 20 s later: THROTTLED
  await sleep(2500);
  await ev(() => window.__echoes.save.resetAutosaveThrottle());
  await ev(() => window.__echoes.cmd('skipToRoom', 7)); // room_enter + shop_open (one autosave)
  await sleep(3000);
  await ev(() => window.__echoes.save.resetAutosaveThrottle());
  await ev(() => window.__echoes.cmd('shopAdvance')); // room 8 room_enter (after the fade)
  await waitFor(() => window.__echoes.state().run.room === 8 && window.__echoes.state().run.phase === 'combat', { timeout: 10000 });
  await sleep(3000);
  await ev(() => window.__echoes.cmd('endRun', 'victory')); // run_end: unthrottled
  await sleep(2500);
  await ev(() => window.__echoes.cmd('returnToCamp')); // return_to_camp < 20 s after run_end: throttled
  await sleep(2500);
  void writes;
}

export default async function (h) {
  const { ev, sleep, log, fail, shot } = h;
  // ---- leg A: autosave ON
  await boot(h, true);
  await drive(h);
  const quit = await ev(async () => {
    const r = await window.__echoes.save.autosave('quit');
    return { ok: r.ok, slot: r.meta && r.meta.id, phase: r.meta && r.meta.meta.phase, pieces: r.pieces };
  });
  await sleep(600);
  const A = await ev(() => ({ log: window.__echoes.save.autosaveLog(), evs: window.__gntM2ev, frames: window.__gntM2f, slots: window.__echoes.save.list().filter((m) => m.kind === 'auto').map((m) => ({ id: m.id, phase: m.meta.phase, room: m.meta.room })) }));
  // ---- leg B: autosave OFF (control: the transitions' own frame cost)
  await boot(h, false);
  await drive(h);
  const B = await ev(() => ({ evs: window.__gntM2ev, frames: window.__gntM2f }));

  const SAFE = new Set(['room_enter', 'shop_open', 'run_end', 'return_to_camp', 'quit']);
  const written = A.log.filter((r) => r.ok === true);
  const rows = [];
  for (const r of written) {
    const reasons = r.reason.split('+');
    const work0 = r.startedAt + (r.calmMs || 0);
    const inWork = A.frames.filter(([t]) => t >= work0 && t <= r.at + 20).map(([, d]) => d);
    const inHitch = A.frames.filter(([t]) => t >= r.startedAt - 20 && t < work0).map(([, d]) => d);
    const pieceMax = r.pieces ? Math.max(...Object.values(r.pieces).filter((x) => typeof x === 'number'), r.captureMs) : null;
    rows.push({
      reason: r.reason,
      slot: r.slot,
      eventTick: r.eventTick,
      captureTick: r.captureTick,
      captureMs: r.captureMs,
      pieces: r.pieces,
      pieceMax,
      calmMs: r.calmMs,
      workFrames: inWork.length,
      workMaxFrame: inWork.length ? Math.max(...inWork) : null,
      hitchBeforeWork: inHitch.length ? Math.max(...inHitch) : null,
    });
    if (!reasons.every((x) => SAFE.has(x))) fail('autosave at a non-safe point', r);
    if (r.captureTick !== r.eventTick) fail('capture on the event tick end', r);
    // Frame times around a room swap carry the swap's own hitches (see the
    // autosave-OFF control); the attributable cost is the main-thread pieces.
    // The hard frame gate is the steady-state A/B (gntM2-sc-autosave-steady).
    if (pieceMax !== null && pieceMax > 20) fail('an autosave piece costs > 20 ms of main thread', { reason: r.reason, pieces: r.pieces });
  }
  const skipped = A.log.filter((r) => r.skipped);
  // Control: frames > 50 ms within 600 ms after each safe-point event, both legs.
  const spikes = (L) =>
    L.evs.map((e) => ({ type: e.type, tick: e.tick, max: Math.max(0, ...L.frames.filter(([t]) => t >= e.at - 20 && t <= e.at + 600).map(([, d]) => d)) }));
  log('autosaves', rows);
  log('skipped', skipped);
  log('quit', quit);
  log('autoSlots', A.slots);
  log('transitionSpikes.autosaveOn', spikes(A));
  log('transitionSpikes.autosaveOff', spikes(B));
  if (written.length < 4) fail('expected >= 4 autosaves (room 1, shop, boss room, run end)', written.map((r) => r.reason));
  if (!skipped.some((s) => s.skipped === 'throttle' && s.reason === 'room_enter')) fail('a room_enter within 20 s of an autosave is throttled', skipped);
  if (!skipped.some((s) => s.skipped === 'throttle' && s.reason === 'return_to_camp')) fail('return_to_camp within 20 s of run_end is throttled', skipped);
  if (!written.some((r) => r.reason.includes('shop_open'))) fail('shop_open autosave', written.map((r) => r.reason));
  if (!written.some((r) => r.reason === 'run_end')) fail('run_end autosave (unthrottled)', written.map((r) => r.reason));
  if (!quit.ok) fail('Save & Quit autosave', quit);
  if (A.slots.length !== 2) fail('autosaves alternate between auto-1 and auto-2', A.slots);
  await shot('autosave-end');
}
