// Memory ledger injected before the game boots (tools/memory-probe.mjs,
// docs/MEMORY.md). It wraps the WebGL and Web Audio entry points every
// renderer in the page goes through, so GPU bytes are counted where they are
// allocated rather than guessed from three's object counts:
//   textures      texImage2D / texImage3D / texStorage2D / texStorage3D per
//                 texture, level and cube face (freed by deleteTexture)
//   buffers       bufferData per buffer (freed by deleteBuffer)
//   renderbuffers renderbufferStorage(Multisample) (freed by deleteRenderbuffer)
//   drawing       every context's own drawing buffer (colour, depth/stencil,
//                 MSAA and preserveDrawingBuffer copies), while not lost
//   programs      linked programs alive
//   audio         AudioBuffer bytes still reachable (a FinalizationRegistry
//                 drops them once the garbage collector frees them)
// window.__memTrack() -> the ledger in bytes, per context and in total.
/* eslint-disable no-undef */
(() => {
  if (window.__memTrack) return;
  const GL = {
    RGBA: 0x1908, RGB: 0x1907, ALPHA: 0x1906, LUMINANCE: 0x1909, LUMINANCE_ALPHA: 0x190a, RED: 0x1903, RG: 0x8227,
    RED_INTEGER: 0x8d94, RG_INTEGER: 0x8228, RGB_INTEGER: 0x8d98, RGBA_INTEGER: 0x8d99,
    DEPTH_COMPONENT: 0x1902, DEPTH_STENCIL: 0x84f9,
    UNSIGNED_BYTE: 0x1401, BYTE: 0x1400, UNSIGNED_SHORT: 0x1403, SHORT: 0x1402, UNSIGNED_INT: 0x1405, INT: 0x1404,
    FLOAT: 0x1406, HALF_FLOAT: 0x140b, HALF_FLOAT_OES: 0x8d61, UNSIGNED_INT_24_8: 0x84fa,
    UNSIGNED_SHORT_4_4_4_4: 0x8033, UNSIGNED_SHORT_5_5_5_1: 0x8034, UNSIGNED_SHORT_5_6_5: 0x8363,
    TEXTURE_CUBE_MAP: 0x8513, TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
  };
  // Sized internal formats -> bytes per texel.
  const SIZED = {
    0x8229: 1, 0x822b: 2, 0x8051: 3, 0x8058: 4, 0x8c41: 3, 0x8c43: 4, // R8 RG8 RGB8 RGBA8 SRGB8 SRGB8_ALPHA8
    0x822d: 2, 0x822f: 4, 0x881b: 6, 0x881a: 8, // R16F RG16F RGB16F RGBA16F
    0x822e: 4, 0x8230: 8, 0x8815: 12, 0x8814: 16, // R32F RG32F RGB32F RGBA32F
    0x8c3a: 4, 0x8c3d: 4, 0x8059: 4, 0x8d62: 2, 0x8056: 2, 0x8057: 2, // R11F_G11F_B10F RGB9_E5 RGB10_A2 RGB565 RGBA4 RGB5_A1
    0x81a5: 2, 0x81a6: 4, 0x8cac: 4, 0x88f0: 4, 0x8cad: 8, 0x8d48: 1, // DEPTH16 DEPTH24 DEPTH32F DEPTH24_STENCIL8 DEPTH32F_STENCIL8 STENCIL8
    0x8232: 1, 0x8231: 1, 0x8234: 2, 0x8233: 2, 0x8236: 4, 0x8235: 4, // R8UI R8I R16UI R16I R32UI R32I
    0x8d7c: 4, 0x8d8e: 4, 0x8d76: 8, 0x8d88: 8, 0x8d70: 16, 0x8d82: 16, // RGBA8UI RGBA8I RGBA16UI RGBA16I RGBA32UI RGBA32I
  };
  const CHANNELS = { [GL.RGBA]: 4, [GL.RGB]: 3, [GL.ALPHA]: 1, [GL.LUMINANCE]: 1, [GL.LUMINANCE_ALPHA]: 2, [GL.RED]: 1, [GL.RG]: 2, [GL.RED_INTEGER]: 1, [GL.RG_INTEGER]: 2, [GL.RGB_INTEGER]: 3, [GL.RGBA_INTEGER]: 4, [GL.DEPTH_COMPONENT]: 1, [GL.DEPTH_STENCIL]: 1 };
  const TYPE = { [GL.UNSIGNED_BYTE]: 1, [GL.BYTE]: 1, [GL.UNSIGNED_SHORT]: 2, [GL.SHORT]: 2, [GL.UNSIGNED_INT]: 4, [GL.INT]: 4, [GL.FLOAT]: 4, [GL.HALF_FLOAT]: 2, [GL.HALF_FLOAT_OES]: 2 };
  const PACKED = { [GL.UNSIGNED_INT_24_8]: 4, [GL.UNSIGNED_SHORT_4_4_4_4]: 2, [GL.UNSIGNED_SHORT_5_5_5_1]: 2, [GL.UNSIGNED_SHORT_5_6_5]: 2 };
  const texelBytes = (ifmt, format, type) => {
    if (SIZED[ifmt]) return SIZED[ifmt];
    if (PACKED[type]) return PACKED[type];
    return (CHANNELS[format] || CHANNELS[ifmt] || 4) * (TYPE[type] || 1);
  };
  const dims = (src) => {
    if (!src) return [0, 0];
    const w = src.videoWidth || src.naturalWidth || src.displayWidth || src.width || 0;
    const h = src.videoHeight || src.naturalHeight || src.displayHeight || src.height || 0;
    return [w, h];
  };

  const ctxs = []; // { gl, kind, label, tex, buf, rb, programs, bound }
  const byGl = new WeakMap();
  function stateOf(gl) {
    let s = byGl.get(gl);
    if (!s) {
      s = { gl, kind: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl', created: performance.now(), texBytes: 0, bufBytes: 0, rbBytes: 0, texCount: 0, bufCount: 0, rbCount: 0, programs: 0, unit: 0, bound: new Map(), bufBound: new Map(), rbBound: null, tex: new Map(), buf: new Map(), rb: new Map() };
      byGl.set(gl, s);
      ctxs.push(s);
    }
    return s;
  }
  // texture -> Map('face:level' -> bytes)
  const texDesc = new WeakMap(); // texture -> 'WxH fmt' of its largest level (top list)
  function setTexLevel(s, tex, key, bytes, desc) {
    if (!tex) return;
    if (desc && (key === 'storage' || /:0$/.test(key))) texDesc.set(tex, desc);
    let m = s.tex.get(tex);
    if (!m) {
      m = new Map();
      s.tex.set(tex, m);
      s.texCount += 1;
    }
    s.texBytes += bytes - (m.get(key) || 0);
    m.set(key, bytes);
  }
  const boundTex = (s, target) => {
    const t = target >= GL.TEXTURE_CUBE_MAP_POSITIVE_X && target < GL.TEXTURE_CUBE_MAP_POSITIVE_X + 6 ? GL.TEXTURE_CUBE_MAP : target;
    return s.bound.get(`${s.unit}:${t}`) || null;
  };

  function wrap(proto) {
    if (!proto) return;
    const orig = {};
    const hook = (name, fn) => {
      const o = proto[name];
      if (typeof o !== 'function') return;
      orig[name] = o;
      proto[name] = function (...a) {
        return fn.call(this, o, a);
      };
    };
    hook('activeTexture', function (o, a) {
      stateOf(this).unit = a[0];
      return o.apply(this, a);
    });
    hook('bindTexture', function (o, a) {
      stateOf(this).bound.set(`${stateOf(this).unit}:${a[0]}`, a[1]);
      return o.apply(this, a);
    });
    hook('texImage2D', function (o, a) {
      const s = stateOf(this);
      const [target, level, ifmt] = a;
      let w, h, format, type;
      if (a.length >= 8) [, , , w, h, , format, type] = a;
      else {
        [, , , format, type] = a;
        [w, h] = dims(a[5]);
      }
      setTexLevel(s, boundTex(s, target), `${target}:${level}`, w * h * texelBytes(ifmt, format, type), `${w}x${h} ${ifmt.toString(16)}/${(type || 0).toString(16)}`);
      return o.apply(this, a);
    });
    hook('texImage3D', function (o, a) {
      const s = stateOf(this);
      const [target, level, ifmt, w, h, d, , format, type] = a;
      setTexLevel(s, boundTex(s, target), `${target}:${level}`, w * h * d * texelBytes(ifmt, format, type));
      return o.apply(this, a);
    });
    hook('texStorage2D', function (o, a) {
      const s = stateOf(this);
      const [target, levels, ifmt, w, h] = a;
      const faces = target === GL.TEXTURE_CUBE_MAP ? 6 : 1;
      let bytes = 0;
      for (let l = 0; l < levels; l++) bytes += Math.max(1, w >> l) * Math.max(1, h >> l) * texelBytes(ifmt);
      setTexLevel(s, boundTex(s, target), 'storage', bytes * faces, `${w}x${h}${faces > 1 ? 'x6' : ''} ${ifmt.toString(16)} L${levels}`);
      return o.apply(this, a);
    });
    hook('texStorage3D', function (o, a) {
      const s = stateOf(this);
      const [target, levels, ifmt, w, h, d] = a;
      let bytes = 0;
      for (let l = 0; l < levels; l++) bytes += Math.max(1, w >> l) * Math.max(1, h >> l) * d * texelBytes(ifmt);
      setTexLevel(s, boundTex(s, target), 'storage', bytes);
      return o.apply(this, a);
    });
    hook('generateMipmap', function (o, a) {
      const s = stateOf(this);
      const tex = boundTex(s, a[0]);
      const m = tex && s.tex.get(tex);
      if (m && !m.has('storage')) {
        const base = m.get(`${a[0]}:0`) || 0;
        setTexLevel(s, tex, 'mips', Math.round(base / 3));
      }
      return o.apply(this, a);
    });
    hook('deleteTexture', function (o, a) {
      const s = stateOf(this);
      const m = s.tex.get(a[0]);
      if (m) {
        for (const b of m.values()) s.texBytes -= b;
        s.tex.delete(a[0]);
        s.texCount -= 1;
      }
      return o.apply(this, a);
    });
    hook('bindBuffer', function (o, a) {
      stateOf(this).bufBound.set(a[0], a[1]);
      return o.apply(this, a);
    });
    hook('bufferData', function (o, a) {
      const s = stateOf(this);
      const b = s.bufBound.get(a[0]);
      if (b) {
        let bytes = typeof a[1] === 'number' ? a[1] : a[1] ? a[1].byteLength : 0;
        if (a.length >= 5 && a[4] && a[1] && a[1].BYTES_PER_ELEMENT) bytes = a[4] * a[1].BYTES_PER_ELEMENT;
        if (!s.buf.has(b)) s.bufCount += 1;
        s.bufBytes += bytes - (s.buf.get(b) || 0);
        s.buf.set(b, bytes);
      }
      return o.apply(this, a);
    });
    hook('deleteBuffer', function (o, a) {
      const s = stateOf(this);
      if (s.buf.has(a[0])) {
        s.bufBytes -= s.buf.get(a[0]);
        s.buf.delete(a[0]);
        s.bufCount -= 1;
      }
      return o.apply(this, a);
    });
    hook('bindRenderbuffer', function (o, a) {
      stateOf(this).rbBound = a[1];
      return o.apply(this, a);
    });
    const rbSet = (s, bytes) => {
      const r = s.rbBound;
      if (!r) return;
      if (!s.rb.has(r)) s.rbCount += 1;
      s.rbBytes += bytes - (s.rb.get(r) || 0);
      s.rb.set(r, bytes);
    };
    hook('renderbufferStorage', function (o, a) {
      const s = stateOf(this);
      rbSet(s, a[2] * a[3] * (SIZED[a[1]] || 4));
      return o.apply(this, a);
    });
    hook('renderbufferStorageMultisample', function (o, a) {
      const s = stateOf(this);
      rbSet(s, Math.max(1, a[1]) * a[3] * a[4] * (SIZED[a[2]] || 4));
      return o.apply(this, a);
    });
    hook('deleteRenderbuffer', function (o, a) {
      const s = stateOf(this);
      if (s.rb.has(a[0])) {
        s.rbBytes -= s.rb.get(a[0]);
        s.rb.delete(a[0]);
        s.rbCount -= 1;
      }
      return o.apply(this, a);
    });
    hook('linkProgram', function (o, a) {
      stateOf(this).programs += 1;
      return o.apply(this, a);
    });
    hook('deleteProgram', function (o, a) {
      stateOf(this).programs -= 1;
      return o.apply(this, a);
    });
  }
  // Desktop GPUs (ANGLE on D3D11, most desktop GL) do not offer
  // WEBGL_multisampled_render_to_texture; software GL does, and with it three
  // keeps MSAA inside the driver where no call shows it. Hidden here, so three
  // takes the desktop path (MSAA renderbuffers) and the ledger sees them.
  for (const C of [typeof WebGL2RenderingContext !== 'undefined' && WebGL2RenderingContext, typeof WebGLRenderingContext !== 'undefined' && WebGLRenderingContext]) {
    if (!C) continue;
    const ge = C.prototype.getExtension;
    const gs = C.prototype.getSupportedExtensions;
    C.prototype.getExtension = function (n) {
      return /multisampled_render_to_texture/i.test(String(n)) ? null : ge.call(this, n);
    };
    C.prototype.getSupportedExtensions = function () {
      const l = gs.call(this);
      return l ? l.filter((n) => !/multisampled_render_to_texture/i.test(n)) : l;
    };
  }
  if (typeof WebGL2RenderingContext !== 'undefined') wrap(WebGL2RenderingContext.prototype);
  if (typeof WebGLRenderingContext !== 'undefined') wrap(WebGLRenderingContext.prototype);

  // Every context is registered at creation, so one that never allocates
  // still shows its drawing buffer.
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const gl = getContext.call(this, type, attrs);
    if (gl && /webgl/.test(String(type))) stateOf(gl);
    return gl;
  };

  // Audio buffers: bytes alive (a FinalizationRegistry subtracts them once collected).
  const audio = { live: 0, count: 0, made: 0, madeBytes: 0 };
  const fr = typeof FinalizationRegistry !== 'undefined' ? new FinalizationRegistry((b) => {
    audio.live -= b;
    audio.count -= 1;
  }) : null;
  const noteBuf = (buf) => {
    if (!buf) return buf;
    const b = buf.length * buf.numberOfChannels * 4;
    audio.live += b;
    audio.count += 1;
    audio.made += 1;
    audio.madeBytes += b;
    if (fr) fr.register(buf, b);
    return buf;
  };
  const BAC = typeof BaseAudioContext !== 'undefined' ? BaseAudioContext : null;
  if (BAC) {
    const cb = BAC.prototype.createBuffer;
    BAC.prototype.createBuffer = function (...a) {
      return noteBuf(cb.apply(this, a));
    };
  }
  if (typeof AudioBuffer !== 'undefined') {
    const AB = AudioBuffer;
    window.AudioBuffer = function AudioBuffer(o) {
      return noteBuf(new AB(o));
    };
    window.AudioBuffer.prototype = AB.prototype;
  }

  const MB = (b) => Math.round((b / 1048576) * 10) / 10;
  window.__memTrack = () => {
    const out = [];
    let total = 0;
    for (const s of ctxs) {
      const gl = s.gl;
      const lost = gl.isContextLost();
      const c = gl.canvas;
      const at = (!lost && gl.getContextAttributes()) || {};
      const px = c ? c.width * c.height : 0;
      const msaa = at.antialias ? 4 : 0;
      // colour + depth/stencil (+ MSAA colour/depth, + the preserved copy)
      const drawing = lost ? 0 : px * (4 + (at.depth || at.stencil ? 4 : 0)) * (1 + msaa) + (at.preserveDrawingBuffer ? px * 4 : 0);
      const row = {
        kind: s.kind,
        canvas: c ? `${c.width}x${c.height}${c.isConnected ? '' : ' (detached)'}` : '?',
        lost,
        textures: s.texCount,
        texMB: MB(s.texBytes),
        buffers: s.bufCount,
        bufMB: MB(s.bufBytes),
        renderbuffers: s.rbCount,
        rbMB: MB(s.rbBytes),
        drawingMB: MB(drawing),
        programs: s.programs,
      };
      row.totalMB = MB(lost ? 0 : s.texBytes + s.bufBytes + s.rbBytes + drawing);
      if (!lost) total += s.texBytes + s.bufBytes + s.rbBytes + drawing;
      out.push(row);
    }
    const top = [];
    for (const s of ctxs) {
      if (s.gl.isContextLost()) continue;
      for (const [tex, m] of s.tex) {
        let b = 0;
        for (const v of m.values()) b += v;
        top.push([b, texDesc.get(tex) || '?']);
      }
    }
    top.sort((x, y) => y[0] - x[0]);
    const groups = {};
    for (const [b, d] of top) {
      const g = d.split(' ')[0];
      groups[g] = groups[g] || [0, 0];
      groups[g][0] += 1;
      groups[g][1] += b;
    }
    const topTextures = Object.entries(groups).sort((x, y) => y[1][1] - x[1][1]).slice(0, 14).map(([g, [n, b]]) => `${g} x${n} ${MB(b)}MB`);
    return { topTextures, gpuMB: MB(total), contexts: out, contextsAlive: out.filter((r) => !r.lost).length, audioMB: MB(audio.live), audioBuffers: audio.count, audioMade: audio.made, audioMadeMB: MB(audio.madeBytes) };
  };
})();
