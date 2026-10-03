// Voice sampler worklet (docs/gauntlet/PLAN.md §3.5 / gate G3.10). Owner: M3.
//
// Baked cue samples (src/audio/bake.js) are mixed ON THE AUDIO THREAD: the
// main thread only queues compact ops — play / stop / buffer upload / drop —
// and posts them ONCE per rendered frame (engine.update -> flush()). A cue
// start therefore builds no Web Audio node at all (a buffer-source start was
// ~40-60 us of main-thread node construction per voice in a boss fight).
//
// One AudioWorkletNode, four stereo outputs -> the SFX / UI / MUSIC / AMBIENT
// bus inputs (the same bus chains, meters and limiter as every other voice).
// Per voice: a region of an uploaded sample, a playback rate (the +-2.5 %
// pitch jitter; linear interpolation, like AudioBufferSourceNode), and a
// left / right gain pair. Spatial voices get the PannerNode's own model
// computed on the main thread at the start (spatial.js gains(): equal-power
// azimuth + inverse distance, identical to spatial.predict and to the
// PannerNode maths gate G3.6 measures); flat voices play L = R (the mono ->
// stereo up-mix a bus applies). A stop fades linearly over the given frames.
// Start times are sample-accurate (currentFrame); a start already in the past
// when its op arrives plays at once, as AudioBufferSourceNode.start does.

export const SAMPLER_WORKLET_SOURCE = `
// Samples live in the worklet GLOBAL scope: every sampler node (the bus
// sampler and each music player's layer sampler) plays from the same set.
const BUFS = new Map();
class EchoesSampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.voices = [];
    this.waiting = []; // plays whose sample upload (another port) has not landed yet
    this.alive = true;
    this.port.onmessage = (e) => this.onMsg(e.data);
  }
  voice(op) {
    const data = BUFS.get(op[2]);
    if (!data) return false;
    this.voices.push({ id: op[1], data, pos: op[3], end: op[3] + op[4], rate: op[5], gL: op[6], gR: op[7], out: op[8], start: op[9], fade: 1, step: 0 });
    return true;
  }
  onMsg(m) {
    if (!m) return;
    if (m.t === 'buf') { BUFS.set(m.id, m.data); return; }
    if (m.t !== 'ops') return;
    for (const op of m.ops) {
      const k = op[0];
      if (k === 1) {
        if (!this.voice(op)) this.waiting.push([op, currentFrame]);
      } else if (k === 2) {
        for (const v of this.voices) if (v.id === op[1]) v.step = 1 / Math.max(1, op[2]);
      } else if (k === 3) {
        BUFS.delete(op[1]);
      } else if (k === 4) {
        this.alive = false;
      }
    }
  }
  process(inputs, outputs) {
    const f0 = currentFrame;
    if (this.waiting.length) {
      const still = [];
      for (const w of this.waiting) if (!this.voice(w[0]) && f0 - w[1] < sampleRate / 10) still.push(w);
      this.waiting = still;
    }
    const vs = this.voices;
    for (let i = vs.length - 1; i >= 0; i--) {
      const v = vs[i];
      const o = outputs[v.out];
      if (!o || !o[0]) { vs.splice(i, 1); continue; }
      const L = o[0], R = o[1] || null, N = L.length; // mono outputs (music layers) take L only
      let k = 0;
      if (v.start > f0) {
        if (v.start >= f0 + N) continue;
        k = v.start - f0;
      }
      const d = v.data, rate = v.rate, gL = v.gL, gR = v.gR, last = v.end - 1, step = v.step;
      let pos = v.pos, fade = v.fade, done = false;
      for (; k < N; k++) {
        if (pos >= last) { done = true; break; }
        const ip = pos | 0;
        const a = d[ip];
        const s = (a + (d[ip + 1] - a) * (pos - ip)) * fade;
        L[k] += s * gL;
        if (R) R[k] += s * gR;
        pos += rate;
        if (step) { fade -= step; if (fade <= 0) { done = true; break; } }
      }
      if (done) vs.splice(i, 1);
      else { v.pos = pos; v.fade = fade; }
    }
    return this.alive || vs.length > 0;
  }
}
registerProcessor('echoes-sampler', EchoesSampler);
`;

export const SAMPLER_OUTPUTS = Object.freeze(['sfx', 'ui', 'music', 'ambient']);

// createSampler(ctx, dests) -> sampler | null-behaving stub until the module
// loads. dests: { sfx, ui, music, ambient } bus input nodes.
export function createSampler(ctx, dests) {
  let node = null;
  let ok = false;
  let dead = false;
  let nextBuf = 1;
  let ops = [];
  const stats = { plays: 0, stops: 0, uploads: 0, uploadMb: 0, drops: 0, posts: 0, layerNodes: 0, notePlays: 0, failed: null };
  const ready = (async () => {
    if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined' || typeof Blob === 'undefined') return false;
    const url = URL.createObjectURL(new Blob([SAMPLER_WORKLET_SOURCE], { type: 'application/javascript' }));
    try {
      await ctx.audioWorklet.addModule(url);
      node = new AudioWorkletNode(ctx, 'echoes-sampler', { numberOfInputs: 0, numberOfOutputs: SAMPLER_OUTPUTS.length, outputChannelCount: SAMPLER_OUTPUTS.map(() => 2) });
      SAMPLER_OUTPUTS.forEach((b, i) => {
        if (dests[b]) node.connect(dests[b], i);
      });
      node.onprocessorerror = () => {
        dead = true;
        ok = false;
        stats.failed = 'processorerror';
      };
      ok = true;
      return true;
    } catch (err) {
      stats.failed = String((err && err.message) || err);
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  })();

  // Upload a mono sample (a copy is transferred to the audio thread).
  function upload(f32) {
    if (!ok) return null;
    const id = nextBuf++;
    const data = new Float32Array(f32.length + 1); // +1 guard sample for interpolation
    data.set(f32);
    node.port.postMessage({ t: 'buf', id, data }, [data.buffer]);
    stats.uploads += 1;
    stats.uploadMb += (data.length * 4) / 1048576;
    return id;
  }
  // Upload a sample that already ends with a guard frame, transferring the
  // array itself (no copy; the caller must not use it afterwards).
  function uploadOwned(f32) {
    if (!ok) return null;
    const id = nextBuf++;
    node.port.postMessage({ t: 'buf', id, data: f32 }, [f32.buffer]);
    stats.uploads += 1;
    stats.uploadMb += (f32.length * 4) / 1048576;
    return id;
  }
  function drop(id) {
    if (!ok || id == null) return;
    ops.push([3, id]);
    stats.drops += 1;
  }
  // play(voiceId, bufId, offsetFrames, lengthFrames, rate, gL, gR, bus, startFrame)
  function play(vid, bufId, o, n, rate, gL, gR, bus, startFrame) {
    const out = SAMPLER_OUTPUTS.indexOf(bus);
    ops.push([1, vid, bufId, o, n, rate, gL, gR, out < 0 ? 0 : out, startFrame]);
    stats.plays += 1;
  }
  function stop(vid, fadeFrames) {
    ops.push([2, vid, fadeFrames]);
    stats.stops += 1;
  }
  function flush() {
    if (!ops.length || !ok) return;
    node.port.postMessage({ t: 'ops', ops });
    ops = [];
    stats.posts += 1;
  }
  // A layer sampler for one music player: mono outputs -> the given nodes
  // (the player's layer gains, so intensity ramps and crossfades stay the
  // Web Audio automations they were). play(sid, offsetFrames, lengthFrames,
  // out, startFrame); flush() once per frame; dispose() when faded out.
  function voiceNode(dests) {
    if (!ok || dead) return null;
    let n;
    try {
      n = new AudioWorkletNode(ctx, 'echoes-sampler', { numberOfInputs: 0, numberOfOutputs: dests.length, outputChannelCount: dests.map(() => 1) });
      dests.forEach((d, i) => n.connect(d, i));
    } catch {
      return null;
    }
    let q = [];
    stats.layerNodes += 1;
    return {
      play(sid, o, len, out, startFrame) {
        q.push([1, 0, sid, o, len, 1, 1, 0, out, startFrame]);
        stats.notePlays += 1;
      },
      flush() {
        if (!q.length) return;
        n.port.postMessage({ t: 'ops', ops: q });
        q = [];
      },
      dispose() {
        try {
          n.port.postMessage({ t: 'ops', ops: [[4]] });
          n.disconnect();
        } catch {
          /* gone */
        }
      },
    };
  }
  return {
    ready,
    upload,
    uploadOwned,
    drop,
    play,
    stop,
    flush,
    voiceNode,
    get ok() {
      return ok && !dead;
    },
    info: () => ({ ok: ok && !dead, ...stats, uploadMb: Math.round(stats.uploadMb * 100) / 100 }),
  };
}
