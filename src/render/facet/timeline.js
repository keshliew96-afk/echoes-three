// ABILITY TIMELINES (docs/MODEL_STANDARD.md). An ability is a list of named
// phases (anticipation, strike, hold, settle, ...) with durations. The pose at
// any moment is a PURE function of the time into the ability, so the model lab
// can play it forward, scrub it, freeze it and rewind it, and the game can
// enter it at any phase (a sim telegraph drives the anticipation, the strike
// starts when the telegraph ends). Render only: nothing here reads or writes
// sim state, and nothing reads the wall clock.

const clamp01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);

// phases: [{ id, label, dur }]; cues: [{ at, id }] fire when a forward
// playhead crosses `at` (seconds into the ability).
export function createTimeline(id, label, phases, { cues = [] } = {}) {
  const starts = [];
  let total = 0;
  for (const p of phases) {
    starts.push(total);
    total += p.dur;
  }
  const byId = new Map(phases.map((p, i) => [p.id, i]));
  const tl = {
    id,
    label,
    phases,
    cues,
    duration: total,
    // Seconds into the ability where a phase begins (for entering mid-way).
    startOf(phaseId) {
      const i = byId.get(phaseId);
      return i === undefined ? 0 : starts[i];
    },
    // { t, index, id, label, k } with k = 0..1 inside the phase. A time past
    // the end samples the last phase at k = 1 (the settle has landed). `out`
    // (optional) is filled instead of a new object (a pose every frame).
    sample(t, out = null) {
      const tt = t < 0 ? 0 : t > total ? total : t;
      let i = phases.length - 1;
      for (let j = 0; j < phases.length; j++) {
        if (tt < starts[j] + phases[j].dur) {
          i = j;
          break;
        }
      }
      const p = phases[i];
      const k = p.dur > 0 ? clamp01((tt - starts[i]) / p.dur) : 1;
      if (!out) return { t: tt, index: i, id: p.id, label: p.label, k };
      out.t = tt;
      out.index = i;
      out.id = p.id;
      out.label = p.label;
      out.k = k;
      return out;
    },
    // The lab's readout, e.g. "0.8s · Ash Breath: strike".
    readout(t) {
      const s = tl.sample(t);
      return `${s.t.toFixed(1)}s · ${label}: ${s.label}`;
    },
  };
  return tl;
}

// A playhead over one timeline: rate 1 plays, 0 holds (Still), -1 rewinds.
// Cues fire only on a forward crossing, so a rewind and replay re-fires them
// exactly once each, the way the video's "Time Stop: rewind" replays.
export function createPlayhead(timeline, { loop = false, onCue = null } = {}) {
  let t = 0;
  let rate = 1;
  return {
    get t() {
      return t;
    },
    get rate() {
      return rate;
    },
    get timeline() {
      return timeline;
    },
    setRate(r) {
      rate = r;
    },
    seek(s) {
      t = Math.max(0, Math.min(timeline.duration, s));
    },
    restart() {
      t = 0;
      rate = 1;
    },
    get done() {
      return rate > 0 && t >= timeline.duration;
    },
    update(dt) {
      const before = t;
      t += dt * rate;
      if (loop && t > timeline.duration) t -= timeline.duration;
      if (t < 0) t = 0;
      if (!loop && t > timeline.duration) t = timeline.duration;
      if (onCue && rate > 0) {
        for (const c of timeline.cues) if (before < c.at && t >= c.at) onCue(c.id, c);
      }
      return timeline.sample(t);
    },
  };
}

// Easing shared by the ability poses.
export const ease = Object.freeze({
  out: (k) => 1 - (1 - k) * (1 - k),
  in: (k) => k * k,
  inOut: (k) => k * k * (3 - 2 * k),
  // Overshoot past 1 then settle back (the follow-through of a heavy swing).
  back: (k) => {
    const s = 1.7;
    const x = k - 1;
    return 1 + x * x * ((s + 1) * x + s);
  },
});
