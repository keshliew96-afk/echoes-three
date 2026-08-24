// WebAudio SFX synth (§21, ruling A9): procedural one-shots only, no files.
// §9 juice contract #5: every hit lands with a sound slot. Slots wired now
// (combat-juice block): shoot (basic fire), hit (impact), kill (death pop),
// heal (heal chime). Each trigger ALSO emits a `sound` event into the sim
// event bus — headless captures have no audible output, so the event ring IS
// the observable contract for critics.
//
// Autoplay policy: the AudioContext unlocks on the first user gesture
// (pointer/key); until then triggers still emit their events, they just make
// no sound. Master volume is a constant (§21: no volume UI).
const MASTER_VOLUME = 0.4;

export function createSynth(bus) {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(ctx.destination);
  }

  function unlock() {
    ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    const len = Math.floor(ctx.sampleRate * 0.25);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  // Envelope helper: gain node with exponential-ish decay.
  function envGain(t0, peak, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + decay);
    g.connect(master);
    return g;
  }

  function osc(type, f0, f1, t0, dur, gain) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    o.connect(envGain(t0, gain, dur));
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(filterFreq, q, t0, dur, gain) {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq;
    f.Q.value = q;
    src.connect(f);
    f.connect(envGain(t0, gain, dur));
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // --- Slot voices (short filtered-noise + osc one-shots, §21).
  const VOICES = {
    shoot: (t) => {
      osc('triangle', 760, 340, t, 0.08, 0.5);
      noise(2400, 1.2, t, 0.05, 0.18);
    },
    hit: (t) => {
      noise(1700, 1.0, t, 0.07, 0.6);
      osc('square', 240, 150, t, 0.05, 0.22);
    },
    kill: (t) => {
      osc('square', 210, 58, t, 0.17, 0.55);
      noise(900, 0.8, t, 0.14, 0.5);
    },
    heal: (t) => {
      // Soft major chime (root + third).
      osc('sine', 523.25, 523.25, t, 0.14, 0.3);
      osc('sine', 659.25, 659.25, t + 0.04, 0.14, 0.24);
    },
  };

  // Emits the observable `sound` event, then synthesizes if the context runs.
  function trigger(slot, tick) {
    bus.emit(tick, 'sound', { slot });
    if (!ctx || ctx.state !== 'running' || !VOICES[slot]) return;
    VOICES[slot](ctx.currentTime);
  }

  bus.on('basic_fire', (ev) => trigger('shoot', ev.tick));
  bus.on('hit', (ev) => trigger('hit', ev.tick));
  bus.on('death', (ev) => trigger('kill', ev.tick));
  bus.on('heal', (ev) => trigger('heal', ev.tick));

  return { trigger };
}
