// Ambient beds (docs/gauntlet/PLAN.md §3.5 `engine.ambient.setBed`;
// BUILD_BRIEF §21 "a low ambient bed per scene"). Owner: M3.
//
// Beds are continuous, non-spatial, on the AMBIENT bus, built from looped
// noise buffers, filters and slow LFOs, plus sparse one-shot details
// scheduled from update() (owl, drips, a distant bell):
//   camp   — hearth: fire roar (brown noise, flickering), crackle, warm drone
//   wood   — Act I: night wind through trees, faint leaf hiss, an owl
//   mill   — Act II: running water, babble, drips from the weir
//   barrow — Act III: cold low wind, a thin whistle, a distant tolling bell
// Crossfades between beds are equal-power over 2.5 s. BED_TRIM levels each
// bed to about -18 dBFS RMS pre-bus (decision D18, docs/gauntlet/build-M3.md:
// PLAN §3.5 says -24; the beds carry part of the combat master level G3.4
// asks for, 5 dB under the score).

export const BED_TRIM = {
  // @trim begin
  barrow: -3.2,
  camp: -0.3,
  mill: 0.5,
  wood: 3.1,
  // @trim end
};

function loop(ctx, buffer, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = buffer;
  s.loop = true;
  s.playbackRate.value = rate;
  s.start(ctx.currentTime, Math.random() * buffer.duration);
  return s;
}
function filt(ctx, type, f, q = 0.7) {
  const n = ctx.createBiquadFilter();
  n.type = type;
  n.frequency.value = f;
  n.Q.value = q;
  return n;
}
function gainN(ctx, v) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}
function lfo(ctx, param, rate, depth, type = 'sine') {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = rate;
  const g = gainN(ctx, depth);
  o.connect(g);
  g.connect(param);
  o.start();
  return o;
}

const BEDS = {
  camp(ctx, kit, out) {
    const srcs = [];
    const roar = loop(ctx, kit.buffers.brown, 0.8);
    const roarF = filt(ctx, 'lowpass', 360);
    const roarG = gainN(ctx, 0.55);
    roar.connect(roarF).connect(roarG).connect(out);
    srcs.push(roar, lfo(ctx, roarG.gain, 0.37, 0.14), lfo(ctx, roarF.frequency, 0.23, 80));
    const crk = loop(ctx, kit.buffers.crackle, 1);
    const crkF = filt(ctx, 'bandpass', 2300, 0.6);
    const crkG = gainN(ctx, 0.5);
    crk.connect(crkF).connect(crkG).connect(out);
    srcs.push(crk);
    for (const [f, v] of [[73.42, 0.06], [110, 0.045]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = gainN(ctx, v);
      o.connect(g).connect(out);
      o.start();
      srcs.push(o, lfo(ctx, g.gain, 0.05 + f / 4000, v * 0.3));
    }
    return { srcs };
  },
  wood(ctx, kit, out) {
    const srcs = [];
    const wind = loop(ctx, kit.buffers.brown, 1);
    const wf = filt(ctx, 'bandpass', 480, 0.8);
    const wg = gainN(ctx, 0.8);
    wind.connect(wf).connect(wg).connect(out);
    srcs.push(wind, lfo(ctx, wf.frequency, 0.061, 170), lfo(ctx, wg.gain, 0.11, 0.3));
    const hiss = loop(ctx, kit.buffers.white, 1);
    const hf = filt(ctx, 'highpass', 5200, 0.7);
    const hg = gainN(ctx, 0.035);
    hiss.connect(hf).connect(hg).connect(out);
    srcs.push(hiss, lfo(ctx, hg.gain, 0.083, 0.018));
    return {
      srcs,
      details: { every: [14, 26], play: (t) => [0, 0.32].map((o, i) => kit.tone(out, t + o, { f0: 390 - i * 25, f1: 360 - i * 25, a: 0.04, d: 0.3, gain: 0.05 })) },
    };
  },
  mill(ctx, kit, out) {
    const srcs = [];
    const flow = loop(ctx, kit.buffers.brown, 1.4);
    const ff = filt(ctx, 'lowpass', 650);
    const fg = gainN(ctx, 0.5);
    flow.connect(ff).connect(fg).connect(out);
    srcs.push(flow);
    const bab = loop(ctx, kit.buffers.white, 1);
    const bf = filt(ctx, 'bandpass', 1400, 1.1);
    const bg = gainN(ctx, 0.22);
    bab.connect(bf).connect(bg).connect(out);
    srcs.push(bab, lfo(ctx, bf.frequency, 6.3, 420, 'triangle'), lfo(ctx, bg.gain, 4.1, 0.1));
    return {
      srcs,
      details: { every: [0.5, 1.6], play: (t) => kit.tone(out, t, { f0: 1100 + Math.random() * 700, f1: 1900 + Math.random() * 500, glide: 0.03, d: 0.12, gain: 0.07 }) },
    };
  },
  barrow(ctx, kit, out) {
    const srcs = [];
    const wind = loop(ctx, kit.buffers.brown, 0.7);
    const wf = filt(ctx, 'lowpass', 260);
    const wg = gainN(ctx, 0.75);
    wind.connect(wf).connect(wg).connect(out);
    srcs.push(wind, lfo(ctx, wg.gain, 0.07, 0.25));
    const wh = loop(ctx, kit.buffers.white, 1);
    const whf = filt(ctx, 'bandpass', 900, 5);
    const whg = gainN(ctx, 0.16);
    wh.connect(whf).connect(whg).connect(out);
    srcs.push(wh, lfo(ctx, whf.frequency, 0.049, 320), lfo(ctx, whg.gain, 0.09, 0.08));
    return {
      srcs,
      details: { every: [10, 16], play: (t) => kit.bell(out, t, { f: 196, ratio: 2.76, index: 1.4, d: 3.2, gain: 0.08 }) },
    };
  },
};

export function registerAmbientBed(id, builder) {
  BEDS[id] = builder;
}

export function bedIds() {
  return Object.keys(BEDS);
}

export function createAmbient({ ctx, kit, dest, trims = BED_TRIM }) {
  let bed = null;
  let cur = null; // { id, out, srcs, details, nextDetail }
  const fading = [];

  function build(id) {
    const b = BEDS[id];
    if (!b) return null;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(dest);
    const inner = ctx.createGain();
    inner.gain.value = Math.pow(10, (trims[id] ?? 0) / 20);
    inner.connect(out);
    const r = b(ctx, kit, inner) || {};
    return { id, out, srcs: r.srcs || [], details: r.details || null, nextDetail: ctx.currentTime + 2 + Math.random() * 4 };
  }

  function fade(p, to, sec) {
    const now = ctx.currentTime;
    const g = p.out.gain;
    const from = g.value;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else {
      g.cancelScheduledValues(now);
      g.setValueAtTime(from, now);
    }
    const n = 32;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      c[i] = to > from ? from + (to - from) * Math.sin((x * Math.PI) / 2) : to + (from - to) * Math.cos((x * Math.PI) / 2);
    }
    try {
      g.setValueCurveAtTime(c, now + 0.001, Math.max(0.05, sec));
    } catch {
      g.setTargetAtTime(to, now, sec / 3);
    }
  }

  function dispose(p) {
    for (const s of p.srcs) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    try {
      p.out.disconnect();
    } catch {
      /* gone */
    }
  }

  function setBed(id, { crossfadeSec = 2.5 } = {}) {
    const next = id && BEDS[id] ? id : null;
    if (next === bed) return bed;
    bed = next;
    if (cur) {
      fade(cur, 0, crossfadeSec);
      cur.stopAt = ctx.currentTime + crossfadeSec + 0.1;
      fading.push(cur);
      cur = null;
    }
    if (next) {
      cur = build(next);
      if (cur) fade(cur, 1, crossfadeSec);
    }
    return bed;
  }

  function update() {
    const now = ctx.currentTime;
    if (cur && cur.details && now >= cur.nextDetail) {
      try {
        cur.details.play(now + 0.05);
      } catch {
        /* cosmetic */
      }
      const [a, b] = cur.details.every;
      cur.nextDetail = now + a + Math.random() * (b - a);
    }
    for (let i = fading.length - 1; i >= 0; i--) {
      if (now >= fading[i].stopAt) {
        dispose(fading[i]);
        fading.splice(i, 1);
      }
    }
  }

  return {
    setBed,
    update,
    get bed() {
      return bed;
    },
    debug: () => ({ bed, layers: cur ? cur.srcs.length : 0, fading: fading.length }),
  };
}
