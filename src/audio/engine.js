// Audio engine (docs/gauntlet/PLAN.md §3.5) — replaces the v0.4.63
// constant-volume synth. Owner: M3.
//
//   const engine = createAudioEngine({ bus, settings, stage, app, world, registry, params });
//   provide('audio', engine);             // main.js @gnt:AUDIO
//
// Contract (PLAN §3.5, binding): state · unlock(event) · update(nowMs) ·
// play(cueId, { x?, z?, gainDb, pitch, bus? }) -> voiceId|null · stop(id) ·
// setListener(x, z) · music.{setState,setIntensity,setTheme} ·
// ambient.setBed · registerEventCue · registerCue · debug.
//
// GRAPH (Web Audio, created lazily inside the first user gesture):
//
//   voices ─► SFX in ─┐   each bus: in ─► level (channel slider) ─► mute
//   music ─► duck ─► MUSIC in ─┤        ─► send (= Master slider × Master mute
//   beds ─► AMBIENT in ─┤                   × focus-loss mute) ─► tap ─► sum
//   UI ─► UI in ─┘
//   sum ─► limiter (DynamicsCompressor −6 dBFS, knee 6, ratio 12, 3 ms / 150 ms)
//       ─► makeup-compensation (cancels the compressor's built-in makeup gain,
//          measured once per context in an OfflineAudioContext, so the limiter
//          is unity below threshold) ─► prelimit tap (= clipper input, G3.3)
//       ─► tanh soft-knee ceiling (|y| < 1 by construction, 4x oversampled)
//       ─► master tap ─► destination
//
// MASTER placement (decision recorded in docs/gauntlet/build-M3.md): the
// Master slider is applied on each bus's `send` gain rather than once on the
// sum, so every channel tap reads channel × master — gate G3.2 ("Master moves
// every tap by the same dB") and G3.1's per-tap testTone check both measure
// the real effective gain. The four send params always carry the same value;
// busGain('master') reports it. Channels never multiply each other.
//
// AUTOPLAY (PLAN §3.5, binding): no AudioContext exists before the first
// user-activation gesture. The committed app gesture hook (src/app/app.js)
// calls unlock(e) synchronously inside the gesture, ahead of M1's input gate.
// Escape grants no activation, so it never creates a context (Chrome would
// create it suspended and log an autoplay warning). Under
// --autoplay-policy=no-user-gesture-required a silent media-element trial at
// boot (no AudioContext, no console output when blocked) detects the policy
// in ~50 ms and the context is created at once, so no prompt ever shows.
// While locked every cue is still logged (dropped: 'locked') and still
// emitted as a `sound` event.
import { V } from '../app/settings.js';
import { appEvents } from '../app/events.js';
import { sliderToGain, sliderToDb, gainToDb, dbToGain, dbToSlider, MODES } from './mixmath.js';
import { createVoiceKit } from './voices.js';
import { DEFAULT_CUES, DEFAULT_EVENT_CUES, NAV_CUES, CUE_CAL } from './cues.js';
import { createSpatial, cameraFocus, SPATIAL } from './spatial.js';
import { createMeterTap, createReductionMonitor, loadMeterWorklet } from './meter.js';
import { createMusic, MUSIC_STATES, registerMusicTheme, STINGER_SEC, MUSIC_BUS } from './music.js';
import { createAmbient, registerAmbientBed } from './ambient.js';

export const AUDIO_BUSES = Object.freeze(['music', 'sfx', 'ambient', 'ui']);
export const AUDIO_CHANNELS = Object.freeze(['master', ...AUDIO_BUSES]);
export const AUDIO_DEFAULT_LEVELS = Object.freeze({ master: 0.8, music: 0.6, sfx: 0.8, ambient: 0.6, ui: 0.7 });
export const LIMITER = Object.freeze({ threshold: -6, knee: 6, ratio: 12, attack: 0.003, release: 0.15 });
export const VOICE_CAP = 48;
const RAMP_TAU = 0.03; // PLAN §3.5: setTargetAtTime(target, now, 0.03)
const BLUR_TAU = 0.1;
const CLIP_KNEE = 0.85;
const LEGACY_SLOT = { shoot: 'shoot', impact: 'hit', hurt: 'hit', kill: 'kill', boss_death: 'kill', heal: 'heal', heal_crit: 'heal' };
const LOBBY_SCREENS = new Set(['mp-menu', 'lobby', 'mp-join']);
const THEME_BY_ACT = { 1: 'wood', 2: 'mill', 3: 'barrow' };
// A live hostile body (enemy / boss / add) — not its shots, not neutral
// hazards or breakables. Enemy kinds are their etype ('boar', 'mantis', …).
const isHostileBody = (e) => e.faction === 'hostile' && e.hp > 0 && e.kind !== 'eshot' && e.hittable !== false;
const isBossBody = (e) => e.kind === 'stag' || e.kind === 'boss' || e.boss === true;

// Registers the audio.* settings keys (PLAN §3.2 table). Idempotent.
export function registerAudioSettings(settings) {
  for (const ch of AUDIO_CHANNELS) {
    settings.register(`audio.${ch}.level`, { default: AUDIO_DEFAULT_LEVELS[ch], validate: V.num(0, 1, 0.01) });
    settings.register(`audio.${ch}.mode`, { default: 'log', validate: V.oneOf([...MODES]) });
    settings.register(`audio.${ch}.muted`, { default: false, validate: V.bool() });
  }
  settings.register('audio.muteOnBlur', { default: true, validate: V.bool() });
}

function clipCurve(n = 4096) {
  const c = new Float32Array(n);
  const k = CLIP_KNEE;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= k ? a : k + (1 - k) * Math.tanh((a - k) / (1 - k));
    c[i] = Math.sign(x) * y;
  }
  return c;
}

// Silent-media autoplay probe: resolves 'allowed' | 'blocked' | 'unknown'.
// Blocked players reject with NotAllowedError synchronously-fast (< 5 ms);
// an allowed play stays pending while the blob loads, so 60 ms without a
// NotAllowedError means the policy lets audio start without a gesture.
function autoplayTrial() {
  return new Promise((resolve) => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.getAutoplayPolicy === 'function') {
        const p = navigator.getAutoplayPolicy('audiocontext');
        resolve(p === 'allowed' ? 'allowed' : 'blocked');
        return;
      }
    } catch {
      /* fall through to the media trial */
    }
    if (typeof Audio === 'undefined' || typeof Blob === 'undefined') {
      resolve('unknown');
      return;
    }
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    try {
      const n = 64;
      const buf = new ArrayBuffer(44 + n * 2);
      const dv = new DataView(buf);
      const w = (o, s) => {
        for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
      };
      w(0, 'RIFF');
      dv.setUint32(4, 36 + n * 2, true);
      w(8, 'WAVE');
      w(12, 'fmt ');
      dv.setUint32(16, 16, true);
      dv.setUint16(20, 1, true);
      dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true);
      dv.setUint32(28, 16000, true);
      dv.setUint16(32, 2, true);
      dv.setUint16(34, 16, true);
      w(36, 'data');
      dv.setUint32(40, n * 2, true);
      const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
      const el = new Audio();
      el.src = url;
      const cleanup = () => {
        try {
          el.pause();
          el.removeAttribute('src');
          el.load();
        } catch {
          /* ignore */
        }
        URL.revokeObjectURL(url);
      };
      const pr = el.play();
      if (pr && typeof pr.then === 'function') {
        pr.then(
          () => {
            cleanup();
            finish('allowed');
          },
          (err) => {
            cleanup();
            finish(err && err.name === 'NotAllowedError' ? 'blocked' : 'allowed');
          }
        );
        setTimeout(() => finish('allowed'), 60);
      } else finish('unknown');
    } catch {
      finish('unknown');
    }
  });
}

// Chrome/Firefox DynamicsCompressor apply an automatic makeup gain (spec
// §1.19: pow(1/fullRangeGain, 0.6)). Measure it for our settings so the
// limiter can be made unity-gain below its threshold.
async function measureMakeupDb(sampleRate) {
  const OAC = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : typeof webkitOfflineAudioContext !== 'undefined' ? webkitOfflineAudioContext : null; // eslint-disable-line no-undef
  if (!OAC) return 0;
  const sr = Math.min(48000, sampleRate || 48000);
  const len = Math.floor(sr * 0.3);
  const off = new OAC(1, len, sr);
  const osc = off.createOscillator();
  osc.frequency.value = 997;
  const g = off.createGain();
  const inDb = -30;
  g.gain.value = Math.SQRT2 * Math.pow(10, inDb / 20); // sine RMS -30 dBFS
  const c = off.createDynamicsCompressor();
  c.threshold.value = LIMITER.threshold;
  c.knee.value = LIMITER.knee;
  c.ratio.value = LIMITER.ratio;
  c.attack.value = LIMITER.attack;
  c.release.value = LIMITER.release;
  osc.connect(g).connect(c).connect(off.destination);
  osc.start(0);
  const buf = await off.startRendering();
  const d = buf.getChannelData(0);
  let s = 0;
  let n = 0;
  for (let i = Math.floor(len * 0.5); i < len; i++) {
    s += d[i] * d[i];
    n += 1;
  }
  const outDb = 10 * Math.log10(s / Math.max(1, n));
  const m = outDb - inDb;
  return Number.isFinite(m) && Math.abs(m) < 24 ? m : 0;
}

export function createAudioEngine({ bus, settings, stage = null, app = null, world = null, registry = null, params = {} } = {}) {
  registerAudioSettings(settings);
  const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  const forceMuteAtBoot = params && params.audio === false; // ?audio=0
  let forceMuted = forceMuteAtBoot;

  let ctx = null;
  let kit = null;
  let spatial = null;
  let graph = null;
  let music = null;
  let ambient = null;
  let unlockInfo = null; // { via, at }
  let autoplay = { trial: 'pending', ms: null };
  const bootT0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const stateFns = new Set();
  let lastState = null;

  const cues = new Map(Object.entries(DEFAULT_CUES));
  const eventCues = new Map(); // type -> { defaults: fn|null, extra: fn[] }
  const subscribed = new Set();
  const active = []; // one-shot voices
  const lastPlayed = new Map(); // cueId -> performance.now()
  const cueLog = [];
  const counters = { requested: 0, played: 0, stolen: 0, dropped: { locked: 0, suspended: 0, cooldown: 0, cap: 0, unavailable: 0, error: 0 }, peakVoices: 0, soundEvents: 0 };
  let nextVoiceId = 1;
  const toneVoices = new Map();

  // Focus-loss mute (audio.muteOnBlur): page hidden OR window blurred.
  let windowBlurred = false;
  const pageHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
  const blurMuted = () => settings.get('audio.muteOnBlur') && (pageHidden() || windowBlurred);

  // Pinned music state (debug / external callers); auto-derivation resumes
  // when its inputs change.
  let pin = null;
  let derived = null;
  let lastDerive = -1e9;
  let lastIntensity = -1e9;
  let stinger = null; // { state, until }
  let themeOverride = null;
  let fight = { hostiles: 0, bossHpPct: null, partyHpPct: null }; // last intensity inputs (debug)
  let intensityOverride = null; // null = derived from the fight (hostiles, boss HP, party HP)
  let runAct = null;

  // Cost accounting (G3.10): wall time spent inside engine code per frame.
  let frameCost = 0;
  let eventCost = 0;
  const costRing = [];
  const parts = { listener: 0, derive: 0, schedule: 0, meters: 0, events: 0, frames: 0 };

  // ------------------------------------------------------------ state --
  function stateNow() {
    if (!AC) return 'unavailable';
    if (!ctx) return 'locked';
    return ctx.state === 'running' ? 'running' : 'suspended';
  }
  const stateLog = [];
  function notifyState() {
    const s = stateNow();
    if (s === lastState) return;
    lastState = s;
    stateLog.push({ state: s, atMs: Math.round((performance.now() - bootT0) * 10) / 10 });
    if (stateLog.length > 20) stateLog.shift();
    for (const fn of stateFns) {
      try {
        fn(s);
      } catch {
        /* listener errors never reach the page */
      }
    }
    appEvents.emit('audio_state', { state: s, gestureNeeded: engine.gestureNeeded });
  }

  // ------------------------------------------------------------ graph --
  function busChain(name) {
    const input = ctx.createGain();
    const level = ctx.createGain();
    const mute = ctx.createGain();
    const send = ctx.createGain();
    send.channelCount = 2;
    send.channelCountMode = 'explicit';
    send.channelInterpretation = 'speakers';
    input.connect(level);
    level.connect(mute);
    mute.connect(send);
    return { name, input, level, mute, send };
  }

  function buildGraph() {
    const g = { buses: {} };
    g.sum = ctx.createGain();
    g.limiter = ctx.createDynamicsCompressor();
    g.limiter.threshold.value = LIMITER.threshold;
    g.limiter.knee.value = LIMITER.knee;
    g.limiter.ratio.value = LIMITER.ratio;
    g.limiter.attack.value = LIMITER.attack;
    g.limiter.release.value = LIMITER.release;
    g.makeup = ctx.createGain();
    g.clipper = ctx.createWaveShaper();
    g.clipper.curve = clipCurve();
    g.clipper.oversample = '4x';
    g.out = ctx.createGain();
    g.sum.connect(g.limiter);
    g.limiter.connect(g.makeup);
    g.makeup.connect(g.clipper);
    g.clipper.connect(g.out);
    g.out.connect(ctx.destination);
    for (const b of AUDIO_BUSES) {
      const c = busChain(b);
      c.send.connect(g.sum);
      g.buses[b] = c;
    }
    // Keep-alive: Chrome stops rendering (and advancing the automation of)
    // gain nodes whose input is silent, so a slider moved during silence
    // would only start its ramp when sound next flows and AudioParam.value
    // would read stale. A -180 dBFS DC source keeps every bus chain rendered
    // (inaudible, far below any meter threshold).
    g.keepAlive = ctx.createConstantSource();
    g.keepAlive.offset.value = 1e-9;
    for (const b of AUDIO_BUSES) g.keepAlive.connect(g.buses[b].input);
    g.keepAlive.start();
    // Music ducking while a single-player pause overlay is up (Hades-style:
    // the score keeps playing, low-passed and a little quieter). Sits BEFORE
    // the music bus input, so test tones and the tap math are unaffected.
    g.duckGain = ctx.createGain();
    g.duckFilter = ctx.createBiquadFilter();
    g.duckFilter.type = 'lowpass';
    g.duckFilter.frequency.value = 20000;
    g.duckFilter.Q.value = 0.5;
    g.duckGain.connect(g.duckFilter);
    g.duckFilter.connect(g.buses.music.input);
    g.ducked = false;
    // Music content path (pre-fader insert, like a Wwise/FMOD music-bus
    // effect): players -> glue compressor -> fixed post gain -> duck -> bus.
    // The compressor trims the score's 13-14 dB crest factor so it can sit
    // loud enough for the combat mix (G3.4) without hammering the master
    // limiter at 100 % sliders (G3.3). Test tones enter the bus input
    // directly, so slider / tap maths (G3.1 / G3.2) never see it.
    g.musicIn = ctx.createGain();
    g.musicComp = ctx.createDynamicsCompressor();
    for (const [k, v] of Object.entries(MUSIC_BUS.compressor)) g.musicComp[k].value = v;
    g.musicPost = ctx.createGain();
    g.musicPost.gain.value = dbToGain(MUSIC_BUS.postDb);
    g.musicIn.connect(g.musicComp);
    g.musicComp.connect(g.musicPost);
    g.musicPost.connect(g.duckGain);
    g.musicCompOn = true;
    // Meter taps: AudioWorklet accumulators (audio thread) once the module
    // loads (a few ms), analyser fallback otherwise. Their silent outputs
    // feed a zero-gain sink so every browser keeps them rendered.
    g.taps = {};
    g.meterMode = 'loading';
    g.meterSink = ctx.createGain();
    g.meterSink.gain.value = 0;
    g.meterSink.connect(ctx.destination);
    const makeTaps = (worklet) => {
      g.meterMode = worklet ? 'worklet' : 'analyser';
      const opt = (name, centroid = false) => ({ name, worklet, centroid, sink: g.meterSink });
      g.taps.master = createMeterTap(ctx, g.out, opt('master', true));
      g.taps.prelimit = createMeterTap(ctx, g.makeup, opt('prelimit'));
      for (const b of AUDIO_BUSES) g.taps[b] = createMeterTap(ctx, g.buses[b].send, opt(b, b === 'music' || b === 'sfx'));
    };
    loadMeterWorklet(ctx).then(makeTaps, () => makeTaps(false));
    g.reduction = createReductionMonitor(ctx, g.limiter);
    g.makeupDb = null;
    measureMakeupDb(ctx.sampleRate)
      .then((db) => {
        g.makeupDb = Math.round(db * 100) / 100;
        g.makeup.gain.setValueAtTime(dbToGain(-db), ctx.currentTime);
      })
      .catch(() => {
        g.makeupDb = 0;
      });
    return g;
  }

  // ------------------------------------------------------------ gains --
  const lvl = (ch) => settings.get(`audio.${ch}.level`);
  const mode = (ch) => settings.get(`audio.${ch}.mode`);
  const isMuted = (ch) => !!settings.get(`audio.${ch}.muted`);
  const chGain = (ch) => sliderToGain(lvl(ch), mode(ch));
  const masterMuted = () => isMuted('master') || forceMuted;
  const masterSend = () => (masterMuted() || blurMuted() ? 0 : chGain('master'));

  function ramp(param, target, tau = RAMP_TAU) {
    const now = ctx.currentTime;
    try {
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else {
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
      }
      param.setTargetAtTime(target, now, tau);
      param.setValueAtTime(target, now + tau * 9); // land exactly (residual < 0.02 %)
    } catch {
      param.value = target;
    }
  }

  let lastSend = null;
  let lastBlur = false;
  function applyGains() {
    if (!graph) return;
    const send = masterSend();
    const blur = !!blurMuted();
    // Focus-loss fades are gentler (0.1 s) than slider moves (0.03 s).
    const sendTau = lastSend !== null && blur !== lastBlur ? BLUR_TAU : RAMP_TAU;
    for (const b of AUDIO_BUSES) {
      const n = graph.buses[b];
      ramp(n.level.gain, chGain(b));
      ramp(n.mute.gain, isMuted(b) ? 0 : 1);
      ramp(n.send.gain, send, sendTau);
    }
    lastSend = send;
    lastBlur = blur;
  }

  // Mode switch keeps loudness (PLAN §3.5): the slider moves to
  // dbToSlider(currentDb, newMode). Not on reset / revert (those restore
  // stored pairs verbatim).
  settings.subscribe('audio', (value, path, prev, source) => {
    const seg = path.split('.');
    const ch = seg[1];
    const key = seg[2];
    if (key === 'mode' && AUDIO_CHANNELS.includes(ch) && source !== 'reset' && source !== 'revert' && prev && prev !== value) {
      const db = sliderToDb(lvl(ch), prev);
      const s = dbToSlider(db, value);
      settings.set(`audio.${ch}.level`, Math.round(s * 100) / 100, { source: 'system' });
    }
    if (ch === 'master' && key === 'muted' && value === false) forceMuted = false; // an explicit unmute ends ?audio=0
    applyGains();
  });
  // Any tab's player-driven change (display, gameplay, audio toggles and
  // curve switches) gets a UI click; audio level sliders preview their own
  // channel instead (src/ui/menu/tabs/audio.js).
  settings.subscribe('*', (value, path, prev, source) => {
    if (source !== 'ui') return;
    if (path.startsWith('audio.') && path.endsWith('.level')) return;
    uiSettingCue(value);
  });
  let lastNavCueAt = -1e9;
  function uiSettingCue(value) {
    const now = performance.now();
    if (now - lastNavCueAt < 45) return; // the nav confirm that caused it already clicked
    trigger(typeof value === 'boolean' ? 'ui_toggle' : 'ui_slider', {}, 'settings');
  }

  // ------------------------------------------------------------ voices --
  function liveVoices() {
    let n = 0;
    for (const v of active) if (!v.stopped) n += 1;
    return n;
  }

  function stopVoice(v, fade = 0.02) {
    if (!v || v.stopped || !ctx) return;
    v.stopped = true;
    const now = ctx.currentTime;
    try {
      v.out.gain.cancelScheduledValues(now);
      v.out.gain.setValueAtTime(v.out.gain.value, now);
      v.out.gain.linearRampToValueAtTime(0, now + fade);
    } catch {
      /* ignore */
    }
    v.end = Math.min(v.end, now + fade + 0.03);
  }

  function reap() {
    const now = ctx.currentTime;
    for (let i = active.length - 1; i >= 0; i--) {
      const v = active[i];
      if (now > v.end + 0.05) {
        try {
          v.out.disconnect();
          if (v.pan) v.pan.disconnect();
        } catch {
          /* ignore */
        }
        active.splice(i, 1);
      }
    }
  }

  function spawn(cueId, def, opts) {
    const b = opts.bus && graph.buses[opts.bus] ? opts.bus : def.bus;
    const spatialOn = b === 'sfx' && Number.isFinite(opts.x) && Number.isFinite(opts.z);
    // Same-cue cap: steal this cue's oldest.
    const same = active.filter((v) => v.cue === cueId && !v.stopped);
    if (same.length >= (def.maxVoices || 6)) {
      stopVoice(same[0]);
      counters.stolen += 1;
    }
    // Global cap: steal the lowest-priority, oldest voice — or drop the new
    // cue when everything playing outranks it.
    if (liveVoices() >= VOICE_CAP) {
      let victim = null;
      for (const v of active) {
        if (v.stopped) continue;
        if (!victim || v.prio < victim.prio || (v.prio === victim.prio && v.t0 < victim.t0)) victim = v;
      }
      if (victim && victim.prio > (def.priority || 1)) return { dropped: 'cap' };
      stopVoice(victim);
      counters.stolen += 1;
    }
    const t = ctx.currentTime + 0.003;
    const out = ctx.createGain();
    // calDb: the recipe's measured design peak (CUE_CAL for built-ins; a
    // registerCue caller may pass its own) so the cue peaks at levelDb.
    const lvlDb = (def.levelDb ?? -12) - (def.calDb ?? CUE_CAL[cueId] ?? 0) + (Number(opts.gainDb) || 0);
    out.gain.value = dbToGain(lvlDb) * (spatialOn ? SPATIAL.trim : 1);
    let pan = null;
    const dest = graph.buses[b].input;
    if (spatialOn) {
      pan = spatial.panner(opts.x, opts.z, dest);
      out.connect(pan);
    } else out.connect(dest);
    // Cosmetic pitch jitter (±2.5 %) so repeats never machine-gun.
    const pitch = (Number(opts.pitch) || 1) * (opts.exactPitch ? 1 : 1 + (Math.random() - 0.5) * 0.05);
    let end;
    try {
      const r = def.voice(ctx, t, out, { ...opts, pitch, kit });
      end = typeof r === 'number' && Number.isFinite(r) ? r : r && Number.isFinite(r.dur) ? t + r.dur : r && Number.isFinite(r.end) ? r.end : t + 2;
    } catch (err) {
      try {
        out.disconnect();
      } catch {
        /* ignore */
      }
      warnOnce(`cue ${cueId}`, err);
      return { dropped: 'error' };
    }
    const v = { id: nextVoiceId++, cue: cueId, bus: b, out, pan, end: Math.max(end, t + 0.02), prio: def.priority || 1, t0: t, stopped: false };
    active.push(v);
    counters.played += 1;
    counters.peakVoices = Math.max(counters.peakVoices, liveVoices());
    return { voice: v, spatial: spatialOn, levelDb: lvlDb };
  }

  const warned = new Set();
  function warnOnce(key, err) {
    if (warned.has(key)) return;
    warned.add(key);
    console.info(`[audio] ${key} failed: ${err && err.message ? err.message : err}`);
  }

  // One cue request: cooldown / lock checks, voice, cueLog, `sound` event.
  function trigger(cueId, opts = {}, source = 'api') {
    const t0 = performance.now();
    counters.requested += 1;
    const def = cues.get(cueId);
    if (!def) return null;
    let dropped = null;
    let res = null;
    const now = performance.now();
    if (!AC) dropped = 'unavailable';
    else if (!ctx || !graph) dropped = 'locked';
    else if (ctx.state !== 'running') dropped = 'suspended';
    else {
      const last = lastPlayed.get(cueId);
      if (last !== undefined && now - last < (def.cooldownMs ?? 30)) dropped = 'cooldown';
    }
    if (!dropped) {
      res = spawn(cueId, def, opts);
      if (res.dropped) dropped = res.dropped;
      else lastPlayed.set(cueId, now);
    }
    if (dropped) counters.dropped[dropped] = (counters.dropped[dropped] || 0) + 1;
    const x = Number.isFinite(opts.x) ? Math.round(opts.x * 100) / 100 : null;
    const z = Number.isFinite(opts.z) ? Math.round(opts.z * 100) / 100 : null;
    const busName = opts.bus || def.bus;
    const entry = {
      t: Math.round(now - bootT0),
      cue: cueId,
      bus: busName,
      x,
      z,
      pan: x !== null && spatial && busName === 'sfx' ? spatial.predict(x, z).pan : null,
      gainDb: Math.round(((def.levelDb ?? -12) + (Number(opts.gainDb) || 0)) * 10) / 10,
      voices: ctx ? liveVoices() : 0,
      voice: res && res.voice ? res.voice.id : null,
      source,
      ...(opts.event ? { event: opts.event } : {}),
      ...(dropped ? { dropped } : {}),
    };
    cueLog.push(entry);
    if (cueLog.length > 600) cueLog.shift();
    // Observable contract: every cue request is a `sound` event on the sim
    // bus ({ slot } for the four legacy slots, + cue for everything).
    if (bus && opts.emit !== false) {
      const tick = Number.isFinite(opts.tick) ? opts.tick : world && Number.isFinite(world.tick) ? world.tick : 0;
      const payload = { slot: LEGACY_SLOT[cueId] || def.slot || cueId, cue: cueId };
      if (entry.voice) payload.voice = entry.voice;
      if (dropped) payload.dropped = dropped;
      counters.soundEvents += 1;
      bus.emit(tick, 'sound', payload);
    }
    const dt = performance.now() - t0;
    frameCost += dt;
    eventCost += dt;
    return res && res.voice ? res.voice.id : null;
  }

  // ------------------------------------------------------ event → cues --
  const helpers = {
    pos(id) {
      if (id === null || id === undefined || !registry) return null;
      const e = registry.byId ? registry.byId(id) : null;
      return e && Number.isFinite(e.x) ? { x: e.x, z: e.z } : null;
    },
    player() {
      const p = world && world.player;
      return p && Number.isFinite(p.x) ? { x: p.x, z: p.z } : null;
    },
    kind(id) {
      const e = registry && registry.byId ? registry.byId(id) : null;
      return e ? e.kind : null;
    },
  };

  function onSimEvent(ev) {
    const rec = eventCues.get(ev.type);
    if (!rec) return;
    const t0 = performance.now();
    let reqs = null;
    for (const fn of rec.extra) {
      try {
        const r = fn(ev, helpers);
        if (r) {
          reqs = (reqs || []).concat(r);
        }
      } catch (err) {
        warnOnce(`event cue ${ev.type}`, err);
      }
    }
    if (!reqs && rec.defaults) {
      try {
        reqs = rec.defaults(ev, helpers);
      } catch (err) {
        warnOnce(`event cue ${ev.type}`, err);
      }
    }
    const dtE = performance.now() - t0;
    frameCost += dtE;
    eventCost += dtE;
    if (!reqs) return;
    for (const r of Array.isArray(reqs) ? reqs : [reqs]) {
      if (r && r.cue) trigger(r.cue, { ...r, tick: ev.tick, event: ev.type }, 'sim');
    }
    if (ev.type === 'run_start' || ev.type === 'layout_enter') {
      if (Number.isFinite(ev.act)) runAct = ev.act;
    }
    if (ev.type === 'run_end') onRunEnd(ev);
  }

  function ensureSubscribed(type) {
    if (subscribed.has(type) || !bus) return;
    subscribed.add(type);
    bus.on(type, onSimEvent);
  }

  // @gnt:M2 RESTORE-RESYNC begin — a loaded save never replays run_start /
  // layout_enter, so the act theme is re-read from the restored run, a
  // stinger of the moment that left is dropped, and the music re-derives now.
  if (bus) {
    bus.on('state_restored', () => {
      const run = world && world.runSystem ? world.runSystem() : null;
      runAct = run && run.isActive() && typeof run.act === 'function' ? run.act() : null;
      stinger = null;
      if (music) driveMusic(true);
    });
  }
  // @gnt:M2 RESTORE-RESYNC end

  // registerEventCue(type, fn): fn(ev, helpers) -> [{ cue, x?, z?, gainDb?, pitch? }] | null.
  // Registered handlers run before the built-in map for that event; a
  // non-null result replaces the built-in cues for that event instance (a
  // null result leaves them). New event types need nothing else.
  function registerEventCue(type, fn) {
    let rec = eventCues.get(type);
    if (!rec) {
      rec = { defaults: null, extra: [] };
      eventCues.set(type, rec);
    }
    rec.extra.push(fn);
    ensureSubscribed(type);
    return () => {
      const i = rec.extra.indexOf(fn);
      if (i >= 0) rec.extra.splice(i, 1);
    };
  }

  for (const [type, fn] of Object.entries(DEFAULT_EVENT_CUES)) {
    eventCues.set(type, { defaults: fn, extra: [] });
    ensureSubscribed(type);
  }

  // registerCue(id, { bus, voice(ctx, t, dest, params), maxVoices=6, cooldownMs=30, priority=1, levelDb?, calDb?, slot? })
  // calDb = the recipe's own peak at unity (dBFS); debug.measureCue(id) measures it.
  function registerCue(id, def) {
    if (!id || !def || typeof def.voice !== 'function') throw new TypeError('registerCue(id, { bus, voice }) required');
    cues.set(id, { bus: 'sfx', slot: id, maxVoices: 6, cooldownMs: 30, priority: 1, levelDb: -12, ...def });
    return () => cues.delete(id);
  }

  // App navigation → UI bus (the engine listens to app events; never the
  // other way round). M1 may emit on appEvents and/or the screen manager —
  // both are heard, de-duplicated within 12 ms.
  let lastNav = { action: null, at: -1e9 };
  function onNav(p) {
    if (!p || !p.action) return;
    const now = performance.now();
    if (p.action === lastNav.action && now - lastNav.at < 12) return;
    lastNav = { action: p.action, at: now };
    const ae = typeof document !== 'undefined' ? document.activeElement : null;
    if ((p.action === 'left' || p.action === 'right') && ae && typeof ae.__navAdjust === 'function') return; // the control's own tick plays
    const cueId = NAV_CUES[p.action];
    if (!cueId) return;
    lastNavCueAt = now;
    trigger(cueId, {}, 'nav');
  }
  appEvents.on('nav', onNav);
  if (app && app.screens && typeof app.screens.on === 'function') app.screens.on('nav', onNav);

  // ----------------------------------------------------- music driver --
  function deriveMusic() {
    const st = app ? app.state : 'playing';
    if (st === 'farewell') return 'silence';
    if (st === 'boot' || st === 'title') return 'menu';
    let stack = [];
    try {
      stack = app && app.screens ? app.screens.stack() : [];
    } catch {
      stack = [];
    }
    if (stack.some((id) => LOBBY_SCREENS.has(id))) return 'lobby';
    if (stinger && ctx && ctx.currentTime < stinger.until) return stinger.state;
    const run = world && world.runSystem ? world.runSystem() : null;
    const view = run ? run.view() : null;
    if (view && view.active) {
      if (view.room === (view.rooms || 8) && view.mode === 'boss' && view.phase === 'combat') return 'boss';
      if (view.room === (view.rooms || 8) && view.phase === 'combat') return 'boss';
      return 'combat';
    }
    // ?room= / ?scene=arena harness wave rooms run without a run frame.
    if (run && typeof run.combatAllowed === 'function' && run.combatAllowed() && !(view && view.active)) {
      const reg = registry && registry.all ? registry.all() : [];
      if (reg.some((e) => isHostileBody(e) && isBossBody(e))) return 'boss';
      if (reg.some((e) => isHostileBody(e))) return 'combat';
    }
    return 'camp';
  }

  function deriveTheme() {
    if (themeOverride) return themeOverride;
    return THEME_BY_ACT[runAct] || 'wood';
  }

  function deriveBed(musicState) {
    const st = app ? app.state : 'playing';
    if (st === 'farewell') return null;
    if (musicState === 'combat' || musicState === 'boss') return deriveTheme();
    const run = world && world.runSystem ? world.runSystem() : null;
    if (run && run.isActive && run.isActive()) return deriveTheme();
    return 'camp';
  }

  function computeIntensity(musicState) {
    if (musicState !== 'combat' && musicState !== 'boss') return 0;
    const run = world && world.runSystem ? world.runSystem() : null;
    const view = run ? run.view() : null;
    const inCombat = !view || !view.active || view.phase === 'combat';
    if (!inCombat) return 0.08; // reward / path / shop pages: low intensity
    const all = registry && registry.all ? registry.all() : [];
    let hostiles = 0;
    let boss = null;
    let hp = 0;
    let max = 0;
    for (const e of all) {
      if (isHostileBody(e)) {
        hostiles += 1;
        if (isBossBody(e)) boss = e;
      }
      if (e.partyIndex !== undefined && e.maxHp > 0) {
        hp += Math.max(0, e.hp);
        max += e.maxHp;
      }
    }
    const partyLow = max > 0 ? 1 - hp / max : 0;
    fight = { hostiles, bossHpPct: boss && boss.maxHp ? Math.round((boss.hp / boss.maxHp) * 100) : null, partyHpPct: max > 0 ? Math.round((hp / max) * 100) : null };
    if (musicState === 'boss') {
      const bf = boss && boss.maxHp ? 1 - boss.hp / boss.maxHp : 0;
      return Math.min(1, 0.45 + 0.4 * bf + 0.03 * hostiles + 0.3 * partyLow);
    }
    return Math.min(1, 0.18 + 0.075 * hostiles + 0.4 * partyLow);
  }

  function onRunEnd(ev) {
    const st = ev.result === 'victory' ? 'victory' : ev.result === 'defeat' ? 'defeat' : null;
    if (!st) return;
    if (!ctx) {
      stinger = null;
      return;
    }
    stinger = { state: st, until: ctx.currentTime + STINGER_SEC[st] };
    pin = null;
    driveMusic(true);
  }

  function driveMusic(force = false) {
    if (!music) return;
    const now = ctx.currentTime;
    if (!force && now - lastDerive < 0.1) return;
    lastDerive = now;
    const d = deriveMusic();
    if (pin && d !== pin.derivedAtPin) pin = null; // gameplay moved on: auto resumes
    derived = d;
    const target = pin ? pin.state : d;
    const th = deriveTheme();
    if (target === 'combat' || target === 'boss') music.setTheme(th);
    if (music.state !== target) music.setState(target);
    if (ambient) ambient.setBed(pin && pin.bed !== undefined ? pin.bed : deriveBed(target));
    // Pause duck (single-player blocking overlay while playing).
    let duck = false;
    try {
      duck = !!(app && app.state === 'playing' && app.screens && app.screens.isBlocking() && !(app.screens.stack() || []).some((id) => LOBBY_SCREENS.has(id)));
    } catch {
      duck = false;
    }
    if (duck !== graph.ducked) {
      graph.ducked = duck;
      ramp(graph.duckGain.gain, duck ? dbToGain(-5) : 1, 0.12);
      ramp(graph.duckFilter.frequency, duck ? 1300 : 20000, 0.12);
    }
    if (now - lastIntensity > 0.25) {
      lastIntensity = now;
      music.setIntensity(intensityOverride !== null ? intensityOverride : computeIntensity(target));
    }
  }

  // ------------------------------------------------------- lifecycle --
  function createContext(via, eventTs = null) {
    if (ctx || !AC) return;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch (err) {
      warnOnce('AudioContext', err);
      ctx = null;
      return;
    }
    unlockInfo = { via, atMs: Math.round(performance.now() - bootT0), eventAtMs: Number.isFinite(eventTs) ? Math.round((eventTs - bootT0) * 10) / 10 : null, buildMs: null };
    ctx.onstatechange = () => notifyState();
    // Only the context itself must be created inside the gesture; the graph,
    // noise tables, music and beds are built in the next task so the gesture
    // handler returns at once and the context reaches 'running' fast (G3.8).
    setTimeout(buildAll, 0);
    notifyState();
  }

  function buildAll() {
    if (graph || !ctx) return;
    const t0 = performance.now();
    kit = createVoiceKit(ctx);
    const t1 = performance.now();
    spatial = createSpatial(ctx);
    graph = buildGraph();
    lastSend = null;
    applyGains();
    const t2 = performance.now();
    music = createMusic({ ctx, kit, dest: graph.musicIn });
    ambient = createAmbient({ ctx, kit, dest: graph.buses.ambient.input });
    const f = stage && stage.camera ? cameraFocus(stage.camera) : { x: 0, z: 0 };
    spatial.setListener(f.x, f.z);
    const t3 = performance.now();
    // Music + bed start in their own task (a third slice of the unlock work).
    setTimeout(() => {
      const t4 = performance.now();
      driveMusic(true);
      if (unlockInfo) unlockInfo.buildParts.start = Math.round((performance.now() - t4) * 10) / 10;
    }, 0);
    const r1 = (v) => Math.round(v * 10) / 10;
    unlockInfo.buildMs = r1(t3 - t0);
    unlockInfo.buildParts = { kit: r1(t1 - t0), graph: r1(t2 - t1), music: r1(t3 - t2) };
    // Remaining noise tables in idle slices (one per task).
    const warm = () => {
      if (kit && !kit.prewarm()) setTimeout(warm, 30);
    };
    setTimeout(warm, 30);
    notifyState();
  }

  function unlock(e) {
    if (!AC) return 'unavailable';
    if (e && typeof e === 'object' && e.type) {
      // Only events that grant user activation may create/resume a context.
      const ua = typeof navigator !== 'undefined' ? navigator.userActivation : null;
      if (ua ? !ua.isActive : e.type === 'keydown' && e.key === 'Escape') return stateNow();
      if (e.type === 'keydown' && e.key === 'Escape' && !ctx) return stateNow();
      windowBlurred = false; // a gesture means the window has focus
    }
    if (!ctx) createContext(e && e.type ? e.type : 'api', e && Number.isFinite(e.timeStamp) ? e.timeStamp : null);
    else if (ctx.state === 'suspended') {
      ctx.resume().then(notifyState, () => {});
    }
    if (graph) applyGains();
    notifyState();
    return stateNow();
  }

  // Boot-time autoplay detection (flagged harnesses, kiosk / policy-allowed
  // browsers): no AudioContext is created unless the policy allows it.
  if (AC) {
    const t0 = performance.now();
    autoplayTrial().then((r) => {
      autoplay = { trial: r, ms: Math.round(performance.now() - t0) };
      if (r === 'allowed' && !ctx) createContext('autoplay');
      notifyState();
    });
  } else autoplay = { trial: 'unavailable', ms: 0 };

  // Focus loss.
  if (typeof window !== 'undefined') {
    window.addEventListener('blur', () => {
      windowBlurred = true;
      applyGains();
    });
    window.addEventListener('focus', () => {
      windowBlurred = false;
      applyGains();
    });
    document.addEventListener('visibilitychange', () => {
      applyGains();
      if (!pageHidden() && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      manageBackgroundTimer();
    });
  }
  // Hidden tabs stop rAF: a slow timer keeps music/beds scheduled (with a
  // long look-ahead) when the player chose to keep sound on in the background.
  let bgTimer = null;
  function manageBackgroundTimer() {
    const need = pageHidden();
    if (need && !bgTimer) {
      bgTimer = setInterval(() => {
        if (!ctx) return;
        if (music) music.update(1.6);
        if (ambient) ambient.update();
        reap();
      }, 250);
    } else if (!need && bgTimer) {
      clearInterval(bgTimer);
      bgTimer = null;
    }
  }

  let lastUpdateAt = null;
  let centroidTick = 0;
  let metersArmed = false;
  const CENTROID_TAPS = ['music', 'sfx', 'master'];
  function update(nowMs) {
    const t0 = performance.now();
    if (!ctx || !graph) {
      pushCost(t0);
      return;
    }
    if (stage && stage.camera) {
      const f = cameraFocus(stage.camera);
      spatial.setListener(f.x, f.z);
    }
    if (stinger && ctx.currentTime >= stinger.until) stinger = null;
    const t1 = performance.now();
    driveMusic(false);
    const t2 = performance.now();
    music.update(0.2);
    ambient.update();
    reap();
    const t3 = performance.now();
    const now = ctx.currentTime;
    for (const k in graph.taps) graph.taps[k].read(now);
    // Spectral centroid is a probe metric: sampled only once a probe asked
    // for meters, one tap every 4th frame (an FFT each), never in play.
    if (metersArmed && ++centroidTick % 4 === 0) {
      const keys = CENTROID_TAPS;
      const tap = graph.taps[keys[(centroidTick >> 2) % keys.length]];
      if (tap) tap.sampleCentroid();
    }
    graph.reduction.read(now);
    for (const [id, tv] of toneVoices) if (now > tv.end + 0.1) toneVoices.delete(id);
    const t4 = performance.now();
    parts.listener += t1 - t0;
    parts.derive += t2 - t1;
    parts.schedule += t3 - t2;
    parts.meters += t4 - t3;
    parts.events += eventCost;
    parts.frames += 1;
    eventCost = 0;
    lastUpdateAt = nowMs;
    pushCost(t0);
  }
  function pushCost(t0) {
    frameCost += performance.now() - t0;
    costRing.push(frameCost);
    if (costRing.length > 900) costRing.shift();
    frameCost = 0;
  }

  // --------------------------------------------------------- testTone --
  function testTone(busName = 'sfx', { freq = 440, dbfs = -18, ms = 1000, x, z } = {}) {
    if (!ctx || !graph) return { ok: false, error: 'locked' };
    const b = graph.buses[busName] ? busName : 'sfx';
    const t = ctx.currentTime + 0.01;
    const dur = Math.max(0.05, ms / 1000);
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = ctx.createGain();
    const amp = Math.SQRT2 * dbToGain(dbfs); // sine RMS = dbfs
    const spatialOn = Number.isFinite(x) && Number.isFinite(z);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp * (spatialOn ? SPATIAL.trim : 1), t + 0.01);
    g.gain.setValueAtTime(amp * (spatialOn ? SPATIAL.trim : 1), t + dur - 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g);
    let pan = null;
    if (spatialOn) {
      pan = spatial.panner(x, z, graph.buses[b].input);
      g.connect(pan);
    } else g.connect(graph.buses[b].input);
    o.start(t);
    o.stop(t + dur + 0.02);
    const id = `tone${nextVoiceId++}`;
    toneVoices.set(id, { end: t + dur, o, g, pan });
    o.onended = () => {
      try {
        g.disconnect();
        if (pan) pan.disconnect();
      } catch {
        /* ignore */
      }
    };
    const chDb = isMuted(b) ? -Infinity : sliderToDb(lvl(b), mode(b));
    const mDb = gainToDb(masterSend());
    return {
      ok: true,
      id,
      bus: b,
      freq,
      dbfs,
      ms,
      spatial: spatialOn ? { x, z, predicted: spatial.predict(x, z) } : null,
      expectedTapRmsDb: Math.round((dbfs + chDb + mDb) * 100) / 100,
      startsAt: t,
    };
  }

  // Audio-tab helpers: a short representative sample per channel.
  function testChannel(ch) {
    const f = spatial ? spatial.listener : { x: 0, z: 0 };
    switch (ch) {
      case 'music':
        return trigger('test_music', {}, 'test');
      case 'ambient':
        return trigger('test_ambient', {}, 'test');
      case 'ui':
        return trigger('test_ui', {}, 'test');
      case 'sfx': {
        // left -> centre -> right: the test also demonstrates the panning.
        trigger('test_sfx', { x: f.x - 6, z: f.z, exactPitch: true }, 'test');
        setTimeout(() => trigger('test_sfx', { x: f.x, z: f.z, exactPitch: true, pitch: 1.12 }, 'test'), 260);
        setTimeout(() => trigger('test_sfx', { x: f.x + 6, z: f.z, exactPitch: true, pitch: 1.26 }, 'test'), 520);
        return true;
      }
      default: // master: one of each bus that is audible
        trigger('test_ui', {}, 'test');
        setTimeout(() => trigger('test_sfx', { exactPitch: true }, 'test'), 300);
        return true;
    }
  }
  let lastPreview = 0;
  function previewChannel(ch) {
    const now = performance.now();
    if (now - lastPreview < 90) return null;
    lastPreview = now;
    if (ch === 'sfx') return trigger('test_sfx', { gainDb: -4, exactPitch: true }, 'preview');
    if (ch === 'music' || ch === 'ambient') return trigger('ui_slider', {}, 'preview');
    return trigger('ui_slider', {}, 'preview');
  }

  // ------------------------------------------------------------ debug --
  function channelInfo(ch) {
    const l = lvl(ch);
    const m = mode(ch);
    const mutedNow = ch === 'master' ? masterMuted() : isMuted(ch);
    const gainDb = sliderToDb(l, m);
    const masterDb = mutedNow && ch === 'master' ? -Infinity : gainToDb(masterSend());
    let effectiveDb;
    if (ch === 'master') effectiveDb = masterDb;
    else effectiveDb = mutedNow ? -Infinity : gainDb + masterDb;
    const r = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : v > 0 ? 999 : -999);
    return {
      level: l,
      mode: m,
      muted: !!settings.get(`audio.${ch}.muted`),
      ...(ch === 'master' ? { forceMuted, blurMuted: !!blurMuted() } : {}),
      gainDb: r(gainDb),
      effectiveDb: r(effectiveDb),
    };
  }

  function busGain(name) {
    const r = (v) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : v > 0 ? 999 : -999);
    if (!graph) {
      const expected = name === 'master' ? gainToDb(masterSend()) : sliderToDb(lvl(name), mode(name));
      return { param: null, db: r(expected), locked: true };
    }
    if (name === 'master') {
      const p = graph.buses.music.send.gain.value;
      return { param: p, db: r(gainToDb(p)), sends: AUDIO_BUSES.map((b) => graph.buses[b].send.gain.value) };
    }
    const n = graph.buses[name];
    if (!n) return null;
    const p = n.level.gain.value;
    const eff = p * n.mute.gain.value * n.send.gain.value;
    return { param: p, db: r(gainToDb(p)), mute: n.mute.gain.value, send: n.send.gain.value, effectiveDb: r(gainToDb(eff)) };
  }

  function costStats() {
    const s = [...costRing].sort((a, b) => a - b);
    const q = (p) => (s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 1000) / 1000 : 0);
    const f = Math.max(1, parts.frames);
    const avg = (v) => Math.round((v / f) * 10000) / 10000;
    return {
      frames: s.length,
      p50Ms: q(0.5),
      p95Ms: q(0.95),
      maxMs: s.length ? Math.round(s[s.length - 1] * 1000) / 1000 : 0,
      avgPartsMs: { listener: avg(parts.listener), derive: avg(parts.derive), schedule: avg(parts.schedule), meters: avg(parts.meters), events: avg(parts.events) },
    };
  }

  function voicesInfo() {
    const byBus = {};
    const byCue = {};
    for (const v of active) {
      if (v.stopped) continue;
      byBus[v.bus] = (byBus[v.bus] || 0) + 1;
      byCue[v.cue] = (byCue[v.cue] || 0) + 1;
    }
    return { active: ctx ? liveVoices() : 0, cap: VOICE_CAP, byBus, byCue, peak: counters.peakVoices, stolen: counters.stolen, played: counters.played, requested: counters.requested, dropped: { ...counters.dropped }, soundEvents: counters.soundEvents, testTones: toneVoices.size };
  }

  const debug = {
    get state() {
      return stateNow();
    },
    get gestureNeeded() {
      return engine.gestureNeeded;
    },
    unlock: () => unlock(null),
    autoplay: () => ({ ...autoplay, unlockedVia: unlockInfo ? unlockInfo.via : null, unlockedAtMs: unlockInfo ? unlockInfo.atMs : null, gestureAtMs: unlockInfo ? unlockInfo.eventAtMs : null, buildMs: unlockInfo ? unlockInfo.buildMs : null, buildParts: unlockInfo ? unlockInfo.buildParts : null, runningAtMs: (stateLog.find((x) => x.state === 'running') || {}).atMs ?? null, stateLog: stateLog.slice(), contextState: ctx ? ctx.state : null, sampleRate: ctx ? ctx.sampleRate : null, baseLatency: ctx && ctx.baseLatency ? Math.round(ctx.baseLatency * 10000) / 10 : null }),
    buses: () => Object.fromEntries(AUDIO_CHANNELS.map((c) => [c, channelInfo(c)])),
    busGain,
    meter: (tap = 'master') => {
      metersArmed = true;
      return graph && graph.taps[tap] ? graph.taps[tap].stats() : null;
    },
    meters: () => {
      metersArmed = true;
      return graph ? Object.fromEntries(Object.entries(graph.taps).map(([k, v]) => [k, v.stats()])) : null;
    },
    history: (tap = 'master', n = 50) => (graph && graph.taps[tap] ? graph.taps[tap].history(n) : null),
    limiter: () => (graph ? { ...graph.reduction.stats(), makeupCompDb: graph.makeupDb, settings: { ...LIMITER }, clipperKnee: CLIP_KNEE, meterMode: graph.meterMode } : null),
    meterReset: () => {
      metersArmed = true;
      if (!graph) return false;
      for (const t of Object.values(graph.taps)) t.reset();
      graph.reduction.reset();
      return true;
    },
    testTone,
    cueLog: (n = 50) => cueLog.slice(-n),
    cueLogClear: () => {
      cueLog.length = 0;
      return true;
    },
    music: () => (music ? { ...music.debug(), derived, pinned: pin ? pin.state : null, stinger: stinger ? stinger.state : null, intensityOverride, fight: { ...fight }, ducked: !!(graph && graph.ducked), musicCompReductionDb: graph ? Math.round(graph.musicComp.reduction * 100) / 100 : null } : { state: null, locked: true }),
    setMusic: (st, opts = {}) => {
      if (!MUSIC_STATES.includes(st)) return null;
      pin = { state: st, derivedAtPin: derived ?? deriveMusic(), bed: opts.bed };
      if (opts.theme) themeOverride = opts.theme;
      if (music) {
        if (opts.theme) music.setTheme(opts.theme);
        music.setState(st, opts.crossfadeSec !== undefined ? { crossfadeSec: opts.crossfadeSec } : {});
        if (opts.bed !== undefined && ambient) ambient.setBed(opts.bed);
      }
      if (Number.isFinite(opts.intensity)) setIntensityOverride(opts.intensity);
      return st;
    },
    releaseMusic: () => {
      pin = null;
      themeOverride = null;
      intensityOverride = null;
      return true;
    },
    setIntensity: (v) => setIntensityOverride(v),
    // Calibration only: route the score around the glue compressor (post
    // gain 0 dB) to measure the raw per-state level.
    musicComp: (on) => {
      if (!graph) return null;
      const want = on !== false;
      if (want === graph.musicCompOn) return want;
      try {
        graph.musicIn.disconnect();
      } catch {
        /* ignore */
      }
      if (want) {
        graph.musicIn.connect(graph.musicComp);
        graph.musicPost.gain.setValueAtTime(dbToGain(MUSIC_BUS.postDb), ctx.currentTime);
      } else {
        graph.musicIn.connect(graph.musicPost);
        graph.musicPost.gain.setValueAtTime(1, ctx.currentTime);
      }
      graph.musicCompOn = want;
      return want;
    },
    musicCompReduction: () => (graph ? Math.round(graph.musicComp.reduction * 100) / 100 : null),
    setBed: (id) => (ambient ? ambient.setBed(id) : null),
    ambient: () => (ambient ? ambient.debug() : null),
    voices: voicesInfo,
    cost: costStats,
    costReset: () => {
      costRing.length = 0;
      for (const k in parts) parts[k] = 0;
      return true;
    },
    play: (cue, opts = {}) => trigger(cue, opts, 'debug'),
    stop: (id) => stop(id),
    cues: () => [...cues.keys()],
    // measureCue(id) -> the cue's design peak at unity gain (pass it to
    // registerCue as calDb). Silences the score for ~1.5 s; probe use only.
    measureCue: async (id) => {
      const def = cues.get(id);
      if (!def || !graph) return null;
      const b = def.bus || 'sfx';
      const S = settings;
      const keep = { lvl: lvl(b), mode: mode(b), m: lvl('master'), mm: mode('master') };
      debug.quiet();
      await new Promise((r) => setTimeout(r, 400));
      S.set(`audio.${b}.mode`, 'log', { persist: false, source: 'system' });
      S.set(`audio.${b}.level`, 1, { persist: false, source: 'system' });
      S.set('audio.master.mode', 'log', { persist: false, source: 'system' });
      S.set('audio.master.level', 1, { persist: false, source: 'system' });
      await new Promise((r) => setTimeout(r, 300));
      graph.taps[b].reset();
      trigger(id, { exactPitch: true, emit: false }, 'measure');
      await new Promise((r) => setTimeout(r, 1200));
      const peak = graph.taps[b].stats().peakDb;
      S.set(`audio.${b}.mode`, keep.mode, { source: 'revert' });
      S.set(`audio.${b}.level`, keep.lvl, { source: 'revert' });
      S.set('audio.master.mode', keep.mm, { source: 'revert' });
      S.set('audio.master.level', keep.m, { source: 'revert' });
      debug.releaseMusic();
      const applied = (def.levelDb ?? -12) - (def.calDb ?? CUE_CAL[id] ?? 0);
      return { cue: id, bus: b, measuredPeakDb: peak, designPeakDb: Math.round((peak - applied) * 10) / 10 };
    },
    eventTypes: () => [...eventCues.keys()],
    listener: () => (spatial ? spatial.listener : null),
    setListener: (x, z) => (spatial ? spatial.setListener(x, z) : null),
    predictPan: (x, z) => (spatial ? spatial.predict(x, z) : null),
    spatialModel: () => ({ ...SPATIAL }),
    quiet: () => {
      debug.setMusic('silence', { bed: null, crossfadeSec: 0.2 });
      for (const v of active) stopVoice(v, 0.01);
      return true;
    },
    config: () => ({ buses: [...AUDIO_BUSES], channels: [...AUDIO_CHANNELS], defaults: { ...AUDIO_DEFAULT_LEVELS }, voiceCap: VOICE_CAP, rampTau: RAMP_TAU, limiter: { ...LIMITER } }),
    get lastUpdateAt() {
      return lastUpdateAt;
    },
  };

  // Explicit intensity (0..1) overrides the derived value; null releases it.
  function setIntensityOverride(v) {
    intensityOverride = v === null || v === undefined ? null : Math.max(0, Math.min(1, Number(v) || 0));
    if (music) music.setIntensity(intensityOverride !== null ? intensityOverride : music.intensity);
    return intensityOverride;
  }

  function stop(voiceId) {
    const v = active.find((a) => a.id === voiceId);
    if (!v) return false;
    stopVoice(v);
    return true;
  }

  const engine = {
    get state() {
      return stateNow();
    },
    // True only when the UI must ask for a key/click: locked AND the boot
    // autoplay trial has finished without permission.
    get gestureNeeded() {
      return !!AC && !ctx && autoplay.trial !== 'pending' && autoplay.trial !== 'allowed';
    },
    get context() {
      return ctx;
    },
    get forceMuted() {
      return forceMuted;
    },
    // Ends the ?audio=0 visit mute (the Audio tab's Master Mute button).
    clearForceMute() {
      if (!forceMuted) return false;
      forceMuted = false;
      applyGains();
      appEvents.emit('audio_state', { state: stateNow(), gestureNeeded: engine.gestureNeeded, forceMuted });
      return true;
    },
    unlock,
    update,
    play: (cueId, opts = {}) => trigger(cueId, opts, 'play'),
    stop,
    setListener: (x, z) => (spatial ? spatial.setListener(x, z) : null),
    music: {
      setState: (st, opts = {}) => debug.setMusic(st, opts),
      setIntensity: (v) => setIntensityOverride(v),
      setTheme: (id) => {
        themeOverride = id;
        return music ? music.setTheme(id) : id;
      },
      release: () => debug.releaseMusic(),
      get state() {
        return music ? music.state : null;
      },
    },
    registerMusicTheme,
    ambient: {
      setBed: (id) => {
        if (pin) pin.bed = id;
        else pin = { state: music ? music.state : 'camp', derivedAtPin: derived ?? deriveMusic(), bed: id };
        return ambient ? ambient.setBed(id) : id;
      },
      get bed() {
        return ambient ? ambient.bed : null;
      },
    },
    registerAmbientBed,
    registerEventCue,
    registerCue,
    testChannel,
    previewChannel,
    level: (ch) => (graph && graph.taps[ch] ? graph.taps[ch].uiLevel : 0),
    onState(fn) {
      stateFns.add(fn);
      return () => stateFns.delete(fn);
    },
    debug,
  };
  lastState = stateNow();
  return engine;
}
