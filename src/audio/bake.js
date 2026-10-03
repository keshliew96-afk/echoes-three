// Sample bake cache (docs/gauntlet/PLAN.md §3.5 / gate G3.10 "engine
// main-thread <= 1 ms/frame p95"). Owner: M3.
//
// Why: every procedural cue and music note used to be synthesised LIVE on
// each trigger — 3-12 Web Audio nodes plus ~10 automation calls built on the
// main thread (profile in docs/gauntlet/fix-M3-r1.md: node construction was
// most of the engine's frame cost in a boss fight). Shipped games play
// SAMPLES; this module turns our recipes into samples at runtime (no audio
// files — BUILD_BRIEF ruling A9 still holds: the recipe IS the asset), and
// does the heavy part off the main thread:
//
//   request(key, build, { hi, variants })
//                 queue a recipe `build(kit, t, dest) -> end`. `hi` = it is
//                 playing live right now / a fight needs it first.
//   addJob(fn)    fn(deadline) -> done: incremental producer work (the music
//                 state note enumeration) run inside pump.
//   pump(deadline)  on the main thread only RECORDS queued recipes (render.js
//                 record kit: the primitive calls, a few microseconds each)
//                 and posts them to the render worker, which synthesises
//                 them with a DSP twin of the Web Audio primitives.
//   get(key)      -> { buffer, sid, o, d, peak } (round-robin over the variants) or
//                 null. The engine plays a cue in the sampler worklet (sid —
//                 the worker's array is transferred there, no copy) and a
//                 music note as ONE AudioBufferSourceNode (buffer).
//
// Variants are progressive: every key's FIRST variant is rendered before any
// key's extra variants (recipes with noise get NOISE_VARIANTS in total, so
// repeats never share a waveform; the engine adds the usual +-2.5 % pitch
// jitter through playbackRate). Samples are mono at the context rate (every
// recipe is mono up to its panner). Memory is capped: least-recently-played
// variants are evicted first, and an evicted key is simply baked again the
// next time it plays live. A recipe that is not replayable (it reads more
// than params.pitch / params.kit, or builds nodes itself) is refused and
// stays live-synthesised.
import { createRecordKit, createRenderer } from './render.js';

export const BAKE = Object.freeze({
  maxBytes: 24 * 1024 * 1024, // rendered sample budget (Float32 mono, ~130 s at 48 kHz)
  maxKeySec: 3.2, // longer recipes (pads, drones) stay live
  noiseVariants: 2,
  jobItems: 12, // recipes per worker request
  maxInFlight: 2, // worker requests in flight
  maxFilesPerPump: 4, // rendered samples filed per frame (an AudioBuffer copy / worklet transfer each)
});

// sampler: src/audio/sampler.js — cue samples (keys 'c:') are transferred to
// the sampler worklet and played there; everything else (music notes 'n:', or
// cues while the worklet is unavailable) becomes an AudioBuffer.
// All main-thread work happens inside pump() (the engine's frame budget), so
// it is filed with the frame's cost; onCost is kept for callers that pass it.
export function createBaker({ ctx, onCost = null, sampler = null }) { // eslint-disable-line no-unused-vars
  const sr = ctx.sampleRate;
  const rec = createRecordKit();
  const renderer = createRenderer({ sampleRate: sr });
  const cache = new Map(); // key -> { regs: [{ buffer, sid, o, d, bytes, lastUse }], rr }
  const pending = new Map(); // key -> { key, build, want, taken, done, urgent, measured, score, dur }
  const hi = []; // first variants: keys playing live right now / needed by a fight
  const lo = []; // first variants: prebakes
  const extra = []; // further variants (variety), after every first variant
  const jobs = [];
  const refused = new Set(); // keys that stay live (not replayable / too long / render error)
  let bytes = 0;
  let enabled = typeof Worker !== 'undefined' && typeof Blob !== 'undefined';
  let nextId = 1;
  const inFlight = new Map(); // job id -> key
  const ready = []; // rendered results waiting to be filed (in pump, inside the frame budget)
  const stats = { requested: 0, baked: 0, variants: 0, jobs: 0, hits: 0, refused: 0, evicted: 0, failed: 0, recordMs: 0, recorded: 0, renderedSec: 0 };
  const byKind = { c: 0, n: 0, other: 0 };
  const kindOf = (key) => (key[0] === 'c' ? 'c' : key[0] === 'n' ? 'n' : 'other');

  function get(key) {
    if (!enabled) return null;
    const e = cache.get(key);
    if (!e || !e.regs.length) return null;
    e.rr = (e.rr + 1) % e.regs.length;
    const r = e.regs[e.rr];
    r.lastUse = ctx.currentTime;
    stats.hits += 1;
    return r;
  }

  function has(key) {
    return cache.has(key);
  }

  // Queue a recipe (cheap: nothing is recorded here). Returns false for keys
  // that are known to stay live.
  function request(key, build, { hi: urgent = false, variants } = {}) {
    if (!enabled || refused.has(key)) return false;
    if (cache.has(key)) return true;
    const p = pending.get(key);
    if (p) {
      if (urgent && !p.urgent && p.taken === 0) {
        p.urgent = true;
        hi.push(key);
      }
      return true;
    }
    stats.requested += 1;
    pending.set(key, { key, build, want: variants, taken: 0, done: 0, urgent, measured: false, score: null, dur: 0 });
    (urgent ? hi : lo).push(key);
    return true;
  }

  function addJob(fn) {
    if (enabled && typeof fn === 'function') jobs.push(fn);
  }

  function refuse(key) {
    pending.delete(key);
    refused.add(key);
    stats.refused += 1;
  }

  // Next variant to render: pending record or null. First variants (hi, then
  // lo) before any extra variant; the recipe is recorded when first taken.
  function nextItem() {
    for (const q of [hi, lo, extra]) {
      while (q.length) {
        const key = q[0];
        const p = pending.get(key);
        if (!p || (q !== extra && p.taken > 0) || (p.measured && p.taken >= p.want)) {
          q.shift();
          continue;
        }
        if (!p.measured) {
          const t0 = performance.now();
          let r = null;
          try {
            r = rec.record(p.build);
          } catch {
            r = null;
          }
          stats.recordMs += performance.now() - t0;
          stats.recorded += 1;
          p.measured = true;
          if (!r || !(r.dur > 0) || r.dur > BAKE.maxKeySec || !r.score.length) {
            q.shift();
            refuse(key);
            continue;
          }
          p.score = r.score;
          p.dur = r.dur;
          p.want = Math.max(1, p.want ?? (r.noise > 0 ? BAKE.noiseVariants : 1));
        }
        q.shift();
        return p;
      }
    }
    return null;
  }

  // Main-thread part: file rendered samples, record + post new recipes,
  // until `deadline` (performance.now()).
  function pump(deadline) {
    if (!enabled || renderer.dead) return false;
    let worked = false;
    let filed = 0;
    while (ready.length && filed < BAKE.maxFilesPerPump && performance.now() < deadline) {
      file(ready.shift());
      filed += 1;
      worked = true;
    }
    if (filed) evict();
    while (performance.now() < deadline) {
      if (!hi.length && jobs.length) {
        let done = true;
        try {
          done = jobs[0](deadline) !== false;
        } catch {
          done = true;
        }
        if (done) jobs.shift();
        worked = true;
        continue;
      }
      if (!renderer.ok || renderer.inFlight >= BAKE.maxInFlight) return worked;
      const batch = [];
      while (batch.length < BAKE.jobItems && performance.now() < deadline) {
        const p = nextItem();
        if (!p) break;
        p.taken += 1;
        if (p.taken < p.want) extra.push(p.key);
        const id = nextId++;
        inFlight.set(id, p.key);
        batch.push({ id, dur: p.dur, score: p.score });
      }
      if (!batch.length) return worked;
      stats.jobs += 1;
      worked = true;
      renderer.render(batch).then((res) => ready.push(...res), () => {
        for (const j of batch) {
          const key = inFlight.get(j.id);
          inFlight.delete(j.id);
          if (key && pending.has(key)) refuse(key);
        }
        stats.failed += 1;
      });
    }
    return worked;
  }

  function file(r) {
    {
      const key = inFlight.get(r.id);
      inFlight.delete(r.id);
      if (!key) return;
      const p = pending.get(key);
      if (!p) return; // invalidated meanwhile
      if (r.error || !r.data) {
        refuse(key);
        return;
      }
      const data = r.data;
      const n = data.length - 1; // last frame = interpolation guard
      // peak: the rendered sample's |x| max (render worker) — the engine plays
      // a UI-bus cue at exactly its levelDb from it (fix-M3-r5).
      const reg = { buffer: null, sid: null, o: 0, d: p.dur, bytes: data.length * 4, lastUse: ctx.currentTime, kind: kindOf(key), peak: Number.isFinite(r.peak) ? r.peak : null };
      // Cues and notes both play in the sampler worklets when available (the
      // music players' layer samplers share its sample memory).
      if (sampler && sampler.ok) reg.sid = sampler.uploadOwned(data);
      if (reg.sid == null) {
        const buf = ctx.createBuffer(1, n, sr);
        buf.copyToChannel(data.subarray(0, n), 0);
        reg.buffer = buf;
      }
      let e = cache.get(key);
      if (!e) {
        e = { regs: [], rr: -1 };
        cache.set(key, e);
        stats.baked += 1;
      }
      e.regs.push(reg);
      bytes += reg.bytes;
      byKind[reg.kind] += reg.bytes;
      stats.variants += 1;
      stats.renderedSec += p.dur;
      p.done += 1;
      if (p.done >= p.want) pending.delete(key);
    }
  }

  function dropReg(key, e, reg) {
    e.regs.splice(e.regs.indexOf(reg), 1);
    bytes -= reg.bytes;
    byKind[reg.kind] -= reg.bytes;
    if (reg.sid != null && sampler) sampler.drop(reg.sid);
    if (!e.regs.length) cache.delete(key);
    stats.evicted += 1;
  }

  function evict() {
    if (bytes <= BAKE.maxBytes) return;
    const all = [];
    for (const [key, e] of cache) for (const reg of e.regs) all.push([key, e, reg]);
    all.sort((a, b) => a[2].lastUse - b[2].lastUse);
    for (const [key, e, reg] of all) {
      if (bytes <= BAKE.maxBytes * 0.85) break;
      dropReg(key, e, reg);
    }
  }

  // Forget every baked / queued key starting with `prefix` (a cue redefined
  // by registerCue must never replay the old recipe's samples).
  function invalidate(prefix) {
    for (const [key, e] of [...cache.entries()]) if (key.startsWith(prefix)) for (const reg of [...e.regs]) dropReg(key, e, reg);
    for (const key of [...pending.keys()]) if (key.startsWith(prefix)) pending.delete(key);
    for (const key of [...refused]) if (key.startsWith(prefix)) refused.delete(key);
  }

  function setEnabled(v) {
    enabled = !!v && typeof Worker !== 'undefined';
    return enabled;
  }

  function info() {
    const mb = (v) => Math.round((v / 1048576) * 100) / 100;
    const r1 = (v) => Math.round(v * 10) / 10;
    return {
      enabled,
      worker: renderer.ok ? 'ready' : renderer.dead ? 'failed' : 'starting',
      keys: cache.size,
      pending: pending.size,
      queuedHi: hi.length,
      queuedLo: lo.length,
      queuedExtra: extra.length,
      jobsQueued: jobs.length,
      inFlight: renderer.inFlight,
      mb: mb(bytes),
      cueMb: mb(byKind.c),
      noteMb: mb(byKind.n),
      capMb: BAKE.maxBytes / 1048576,
      ...stats,
      readyToFile: ready.length,
      recordMs: r1(stats.recordMs),
      renderedSec: r1(stats.renderedSec),
    };
  }

  return {
    get,
    has,
    request,
    addJob,
    pump,
    invalidate,
    setEnabled,
    info,
    get idle() {
      return !hi.length && !lo.length && !extra.length && !jobs.length && !ready.length && renderer.inFlight === 0;
    },
  };
}
