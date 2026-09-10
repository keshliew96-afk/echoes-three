#!/usr/bin/env node
// certfixDshouldfix4 — second-pass digest of a saved Chrome trace
// (captures/<name>.trace.json from certfixDshouldfix4-trace.mjs).
//
// Lists, in time order: every GAP mark the rAF sampler planted, every
// shader-compile step ANGLE ran in the GPU process (D3DCompile with the first
// lines of its HLSL, the vertex/pixel executable tasks, program link waits),
// every main-thread GetProgramiv / WaitForCmd (the renderer blocking on the
// GPU process for a link result) and every GPU-process task over a floor.
// `--from ms --to ms` narrows the window (trace-relative ms).
import { readFileSync } from 'fs';

const argv = process.argv.slice(2);
const file = argv[0];
const opt = { from: -Infinity, to: Infinity, floor: 8 };
for (let i = 1; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = parseFloat(argv[i + 1]);

const raw = JSON.parse(readFileSync(file, 'utf8'));
const evs = raw.traceEvents || raw;
const procName = new Map();
const threadName = new Map();
let t0 = Infinity;
for (const e of evs) {
  if (e.ph === 'M') {
    if (e.name === 'process_name') procName.set(e.pid, e.args?.name);
    if (e.name === 'thread_name') threadName.set(`${e.pid}/${e.tid}`, e.args?.name);
    continue;
  }
  if (typeof e.ts === 'number' && e.ts < t0) t0 = e.ts;
}
const P = (e) => procName.get(e.pid) || String(e.pid);
const T = (e) => threadName.get(`${e.pid}/${e.tid}`) || String(e.tid);
const rel = (ts) => (ts - t0) / 1000;
const rows = [];
for (const e of evs) {
  if (e.ph === 'M' || typeof e.ts !== 'number') continue;
  const t = rel(e.ts);
  if (t < opt.from || t > opt.to) continue;
  const name = e.name || '';
  const dur = e.dur ? e.dur / 1000 : 0;
  let keep = false;
  let note = '';
  if (/^GAP/.test(name) && (e.cat || '').includes('blink.user_timing')) {
    keep = true;
    note = '<<<<<<<<<< sampler gap mark (frame AFTER the gap)';
  } else if (name === 'D3DCompile') {
    keep = true;
    const src = (e.args && e.args.source) || '';
    // Identify the shader by its declarations: uniform block members + varyings.
    const decl = src
      .split('\n')
      .filter((l) => /uniform|TEXCOORD|_u|struct|Texture|sampler|gl_Position|dx_/.test(l))
      .slice(0, 14)
      .map((l) => l.trim())
      .join(' | ');
    note = `SRC ${src.length}ch: ${decl.slice(0, 420)}`;
  } else if (/GetVertexExecutableTask|GetPixelExecutableTask|MainLinkLoadEvent|LinkProgram|ProgramD3D|CompileShader|Program::link/i.test(name)) {
    keep = true;
  } else if (/GetProgramiv|GetShaderiv|WaitForCmd|CommandBufferHelper::Finish|GetUniformLocation|GetActiveUniform/.test(name) && dur >= 2) {
    keep = true;
    note = 'main thread blocked on the GPU process';
  } else if (P(e).startsWith('GPU') && T(e) === 'CrGpuMain' && e.ph === 'X' && dur >= opt.floor && /^(GPUTask|WebGL|DXGISwapChainImageBacking::Present|SkiaOutputSurfaceImplOnGpu::SwapBuffers)$/.test(name)) {
    keep = true;
  } else if (P(e) === 'Renderer' && e.ph === 'X' && dur >= 40 && /RunTask|FunctionCall|FireAnimationFrame/.test(name)) {
    keep = name === 'FunctionCall' || name === 'FireAnimationFrame';
    note = 'long main-thread task';
  }
  if (keep) rows.push({ t, dur, e, note });
}
rows.sort((a, b) => a.t - b.t);
console.log(`trace ${file}: ${evs.length} events, ${rows.length} rows of interest, window [${opt.from}, ${opt.to}] ms`);
for (const r of rows) {
  const e = r.e;
  console.log(`${r.t.toFixed(1).padStart(9)}ms ${(r.dur ? '+' + r.dur.toFixed(1) + 'ms' : '').padStart(9)}  ${P(e)}/${T(e)}  ${e.name}  ${r.note}`);
}
