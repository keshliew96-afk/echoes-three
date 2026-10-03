// gntfixCAMPAIGN6 — fix builder r6 shared helpers: a COPY of the campaign critic r6 lib (tools/gntccampaign6-lib.mjs) + a three.js object census (__THREE_DEVTOOLS__ capture + CDP Runtime.queryObjects).
import { launchEchoes } from './gnt-arch-browser.mjs';
import fs from 'fs';
import sharp from 'sharp';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const BASE = process.env.GC5_BASE || 'http://127.0.0.1:4332/';

// Injected before any page script: driver-level GL object census + rAF/state frame log.
const INIT = `(() => {
  // gntfixCAMPAIGN6: three's own devtools hook — every Scene / WebGLRenderer three creates is announced here (held weakly).
  try { const dt = new EventTarget(); const refs = []; dt.addEventListener('observe', (e) => { try { refs.push(new WeakRef(e.detail)); } catch (x) {} }); window.__THREE_DEVTOOLS__ = dt; window.__gntfixThree = () => refs.map((r) => r.deref()).filter(Boolean); } catch (e) {}
  const live = { buffer: 0, texture: 0, program: 0, framebuffer: 0, renderbuffer: 0, vao: 0, shader: 0 };
  const made = { buffer: 0, texture: 0, program: 0, framebuffer: 0, renderbuffer: 0, vao: 0, shader: 0 };
  const hook = (P) => {
    if (!P || P.__gc4) return; P.__gc4 = true;
    const pairs = [['createBuffer','deleteBuffer','buffer'],['createTexture','deleteTexture','texture'],['createProgram','deleteProgram','program'],['createFramebuffer','deleteFramebuffer','framebuffer'],['createRenderbuffer','deleteRenderbuffer','renderbuffer'],['createVertexArray','deleteVertexArray','vao'],['createShader','deleteShader','shader']];
    for (const [c, d, k] of pairs) {
      const oc = P[c], od = P[d]; if (!oc) continue;
      P[c] = function () { const o = oc.apply(this, arguments); if (o) { live[k]++; made[k]++; } return o; };
      P[d] = function (o) { if (o) live[k]--; return od.apply(this, arguments); };
    }
  };
  try { hook(WebGL2RenderingContext.prototype); } catch (e) {}
  try { hook(WebGLRenderingContext.prototype); } catch (e) {}
  window.__gc4gl = { live, made };
  // Web Audio node census: created via factory methods, live = created - garbage-collected (FinalizationRegistry)
  try {
    const AC = window.AudioContext || window.webkitAudioContext; const B = window.BaseAudioContext;
    const P = (B && B.prototype) || (AC && AC.prototype);
    const au = { created: 0, finalized: 0, byType: {} };
    const fr = new FinalizationRegistry((t) => { au.finalized++; au.byType[t] = (au.byType[t] || 0) - 1; });
    const names = Object.getOwnPropertyNames(P).filter((n) => /^create[A-Z]/.test(n) && n !== 'createBuffer' && n !== 'createPeriodicWave');
    for (const n of names) { const o = P[n]; if (typeof o !== 'function') continue; P[n] = function () { const node = o.apply(this, arguments); try { au.created++; au.byType[n] = (au.byType[n] || 0) + 1; fr.register(node, n); } catch (e) {} return node; }; }
    window.__gc4audio = au;
  } catch (e) { window.__gc4audioErr = String(e); }

  const log = []; window.__gc4frames = log; window.__gc4logOn = false;
  const f = (t) => {
    if (window.__gc4logOn) {
      const E = window.__echoes; let row = { t: Math.round(t * 10) / 10 };
      try {
        const cs = E.campaign.state();
        row.tick = E.tick; row.ph = cs.phase; row.lv = cs.level; row.ix = cs.index; row.ts = cs.transitionState; row.app = E.app.state; row.mode = E.app.mode;
        row.paused = E.app.simPaused && E.app.simPaused();
        const v = document.getElementById('run-veil'); row.veil = v ? +getComputedStyle(v).opacity : null;
        row.vis = document.visibilityState;
      } catch (e) { row.err = String(e).slice(0, 60); }
      if (log.length < 60000) log.push(row);
    }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
})();`;

// Mocked standard gamepad: window.__gc4pad.press(buttonIndex, ms) / axis(i, v)
export const GAMEPAD_MOCK = `(() => {
  const pad = { id: 'gc4 mock (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
  window.__gc4pad = {
    pad,
    set(i, on) { pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; pad.timestamp = performance.now(); },
    async press(i, ms = 150) { this.set(i, true); await new Promise(r => setTimeout(r, ms)); this.set(i, false); await new Promise(r => setTimeout(r, ms)); },
    axis(i, v) { pad.axes[i] = v; pad.timestamp = performance.now(); },
  };
  navigator.getGamepads = () => [pad, null, null, null];
  window.addEventListener('load', () => { try { const ev = new Event('gamepadconnected'); ev.gamepad = pad; window.dispatchEvent(ev); } catch (e) {} });
})();`;

export async function launch(opts = {}) {
  return launchEchoes({ gpu: true, background: opts.background !== false, autoplay: !!opts.autoplay, headful: !!opts.headful, extraArgs: opts.extraArgs || [] });
}

export async function open(browser, url, { gamepad = false, context = null, width = 1600, height = 900, timeout = 180000 } = {}) {
  const page = await (context || browser).newPage();
  const errors = [], lines = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => { if (lines.length < 4000) lines.push(`[${m.type()}] ${m.text()}`.slice(0, 400)); });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(INIT);
  if (gamepad) await page.evaluateOnNewDocument(GAMEPAD_MOCK);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0 && !!window.__echoes.campaign, { timeout });
  const cdp = await page.createCDPSession();
  return { page, errors, lines, cdp };
}

export async function heap(cdp) {
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const h = await cdp.send('Runtime.getHeapUsage');
  return Math.round((h.usedSize / 1048576) * 10) / 10;
}

// Compact state used by the carry/reset diff and memory tables.
export async function snap(page) {
  return page.evaluate(() => {
    const E = window.__echoes; const s = E.state(); const cs = E.campaign.state();
    const len = (x) => (Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : 0);
    let mem = null; try { mem = E.campaign.memory(); } catch (e) { mem = String(e); }
    return {
      tick: E.tick, app: E.app.state, mode: E.app.mode, phase: s.run.phase, room: s.run.room, act: s.run.act, actName: s.run.actName,
      cs: { active: cs.active, level: cs.level, index: cs.index, mode: cs.mode, startLevel: cs.startLevel, ts: cs.transitionState, card: cs.card, unlocked: cs.unlocked, harness: cs.harness },
      wallet: s.wallet, party: s.party, skills: s.skills, build: s.build, healOverride: s.healOverride,
      counts: { enemies: len(s.enemies), eshots: len(s.eshots), projectiles: len(s.projectiles), zones: len(s.zones), azones: len(s.azones), skillBolts: len(s.skillBolts) },
      entityCount: E.entityCount, busListeners: E.busCounters.listeners, dom: document.getElementsByTagName('*').length,
      gl: window.__gc4gl ? { ...window.__gc4gl.live } : null, mem,
    };
  });
}

export function writeJson(name, obj) { fs.writeFileSync(`captures/${name}.json`, JSON.stringify(obj, null, 1)); }

// CDP screencast collector: stop() -> frames [{ wall, ts, luma, buf }]
export async function screencast(cdp, { maxWidth = 480, quality = 50, nth = 1 } = {}) {
  const frames = [];
  const pend = [];
  const onFrame = (ev) => {
    const wall = Date.now();
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
    const buf = Buffer.from(ev.data, 'base64');
    pend.push(sharp(buf).greyscale().stats().then((st) => { frames.push({ wall, ts: ev.metadata.timestamp, luma: Math.round(st.channels[0].mean * 10) / 10, buf }); }).catch(() => {}));
  };
  cdp.on('Page.screencastFrame', onFrame);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, maxWidth, maxHeight: Math.round((maxWidth * 9) / 16), everyNthFrame: nth });
  return {
    async stop() {
      await cdp.send('Page.stopScreencast').catch(() => {});
      cdp.off('Page.screencastFrame', onFrame);
      await Promise.all(pend);
      frames.sort((a, b) => a.ts - b.ts);
      return frames;
    },
  };
}

export async function waitFor(page, fn, arg, timeout = 60000, poll = 50) {
  return page.waitForFunction(fn, { timeout, polling: poll }, arg);
}

// ---- r4 additions ------------------------------------------------------------
export const ARGS = (() => { const A = {}; const v = process.argv; for (let i = 2; i < v.length; i++) { if (v[i].startsWith('--')) { const k = v[i].slice(2); const n = v[i + 1]; if (n == null || n.startsWith('--')) A[k] = '1'; else { A[k] = n; i++; } } } return A; })();
export const raf = (page, n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
// Event recorder installed in page: window.__gc4ev rows {type,tick,t,p}
export async function recordEvents(page, types) {
  return page.evaluate((types) => {
    const E = window.__echoes; window.__gc4ev = window.__gc4ev || [];
    for (const ty of types) E.on(ty, (e) => { let p = {}; try { p = JSON.parse(JSON.stringify(e || {})); } catch (x) {} delete p.summary; window.__gc4ev.push({ type: ty, tick: E.tick, t: Math.round(performance.now()), p: JSON.stringify(p).slice(0, 240) }); });
    window.__gc4logOn = true; return true;
  }, types);
}
export const EV_TYPES = ['level_clear', 'level_transit', 'level_start', 'run_end', 'return_to_camp', 'run_start', 'defeat', 'run_wiped', 'room_cleared', 'boss_spawn'];
export async function walkToPortal(page, sleepFn = sleep) {
  await page.mouse.move(800, 450);
  await page.keyboard.down('KeyW');
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 25000) { if (await page.evaluate(() => window.__echoes.cmd('campState').inPortal)) { ok = true; break; } await sleepFn(40); }
  await page.keyboard.up('KeyW');
  await sleepFn(250);
  return ok;
}
export async function titleNewGame(page) {
  // plain URL: splash/any key -> title -> New Game (answers the "Start a new game?" confirm if it appears)
  await page.waitForFunction(() => window.__echoes && window.__echoes.app && ['title', 'press', 'attract', 'splash', 'boot', 'loading'].includes(window.__echoes.app.state) || (window.__echoes && window.__echoes.app && window.__echoes.app.state === 'title'), { timeout: 90000 }).catch(() => {});
  for (let i = 0; i < 40; i++) { const s = await page.evaluate(() => window.__echoes.app.state); if (s === 'title') break; await page.keyboard.press('Enter'); await sleep(500); }
  await sleep(600);
  const f = await page.evaluate(() => window.__echoes.app.focus());
  await page.keyboard.press('Enter');
  await sleep(700);
  const st = await page.evaluate(() => ({ app: window.__echoes.app.state, stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus() }));
  if (st.app !== 'playing' && st.stack.length) { await page.keyboard.press('Enter'); }
  await page.waitForFunction(() => window.__echoes.app.state === 'playing' && window.__echoes.tick > 60, { timeout: 90000 });
  return { titleFocus: f && f.label, confirm: st };
}

// ---- r5 additions ------------------------------------------------------------
// All four builds (Healer seat 0 from s.build, allies from __echoes.party.state()).
export async function builds(page) {
  return page.evaluate(() => {
    const E = window.__echoes; const s = E.state();
    const nid = (n) => (n == null ? null : typeof n === 'string' ? n : n.node || n.id || JSON.stringify(n));
    let ps = null; try { ps = E.party.state(); } catch (e) { ps = { err: String(e) }; }
    const healer = { skills: (s.build.skills || []).map((k) => ({ id: k.id, sockets: (k.sockets || []).map(nid) })), bench: (s.build.bench || []).map(nid), wallet: s.wallet };
    return { tick: E.tick, healer, party: ps };
  });
}
export const J = (x) => JSON.stringify(x);

// ---- gntfixCAMPAIGN6 additions ---------------------------------------------
// three.js object census: every LIVE Material / BufferGeometry / Texture in the page heap (CDP
// Runtime.queryObjects after forced GCs), grouped by kind and whether any object of a captured
// three Scene references it ('S') or nothing in a scene does ('o'). ShaderMaterials carry a short
// hash of their shader source + uniform names so one family is recognisable across samples.
const CENSUS_FN = `function (kind) {
  const arr = this;
  const scenes = (window.__gntfixThree ? window.__gntfixThree() : []).filter((o) => o && o.isScene);
  const inS = new Set();
  for (const sc of scenes) sc.traverse((o) => {
    if (o.geometry) inS.add(o.geometry);
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) { inS.add(m); for (const k in m) { const v = m[k]; if (v && v.isTexture) inS.add(v); } if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) inS.add(u.value); }
  });
  const h = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); };
  const out = {}; let total = 0;
  for (const o of arr) {
    total++;
    let key;
    if (kind === 'mat') key = o.type + '|' + (o.name || '-') + (o.isShaderMaterial ? '|' + h((o.vertexShader || '') + (o.fragmentShader || '')) + ':' + Object.keys(o.uniforms || {}).slice(0, 6).join(',') : '');
    else if (kind === 'geo') key = o.type + '|' + (o.name || '-') + '|' + (o.attributes && o.attributes.position ? o.attributes.position.count : 0) + (o.parameters ? '|' + JSON.stringify(o.parameters).replace(/(\.\d{3})\d+/g, '$1').slice(0, 80) : '');
    else { let im = null; try { im = o.image; } catch (e) { im = null; } key = (o.constructor && o.constructor.name ? '' : '') + (o.isTexture ? 'tex' : 'proto') + '|' + (o.name || '-') + '|' + (im ? (im.width || 0) + 'x' + (im.height || 0) : '-'); }
    key = (inS.has(o) ? 'S|' : 'o|') + key;
    out[key] = (out[key] || 0) + 1;
  }
  return JSON.stringify({ total, scenes: scenes.length, groups: out });
}`;
async function protoId(cdp, ownKey) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: `(() => { const sc = (window.__gntfixThree ? window.__gntfixThree() : []).filter((o) => o && o.isScene); let m = null; for (const s of sc) { s.traverse((o) => { if (m) return; if (${JSON.stringify(ownKey)} === 'setIndex' && o.geometry) m = o.geometry; else if (${JSON.stringify(ownKey)} === 'setValues' && o.material && !Array.isArray(o.material)) m = o.material; else if (${JSON.stringify(ownKey)} === 'transformUv' && o.material && o.material.map) m = o.material.map; }); if (m) break; } if (!m) return null; let p = Object.getPrototypeOf(m); while (p && !Object.prototype.hasOwnProperty.call(p, ${JSON.stringify(ownKey)})) p = Object.getPrototypeOf(p); return p; })()` });
  return result && result.objectId ? result.objectId : null;
}
export async function threeCensus(cdp) {
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const res = {};
  for (const [kind, own] of [['mat', 'setValues'], ['geo', 'setIndex'], ['tex', 'transformUv']]) {
    try {
      const pid = await protoId(cdp, own);
      if (!pid) { res[kind] = null; continue; }
      const { objects } = await cdp.send('Runtime.queryObjects', { prototypeObjectId: pid });
      const { result } = await cdp.send('Runtime.callFunctionOn', { objectId: objects.objectId, functionDeclaration: CENSUS_FN, arguments: [{ value: kind }], returnByValue: true });
      res[kind] = JSON.parse(result.value);
      await cdp.send('Runtime.releaseObject', { objectId: objects.objectId }).catch(() => {});
      await cdp.send('Runtime.releaseObject', { objectId: pid }).catch(() => {});
    } catch (e) { res[kind] = { err: String(e).slice(0, 200) }; }
  }
  return res;
}
// difference of two census group maps (b - a), non-zero only
export function censusDiff(a, b) {
  const out = {};
  const ga = (a && a.groups) || {}, gb = (b && b.groups) || {};
  for (const k of new Set([...Object.keys(ga), ...Object.keys(gb)])) { const d = (gb[k] || 0) - (ga[k] || 0); if (d) out[k] = d; }
  return out;
}
