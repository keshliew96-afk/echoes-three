// fix-M1-r4 copy of the menu critic r4 helpers (tools/gntcmenu4-lib.mjs), used by tools/gntfixM14-*.
import { mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CAP = join(ROOT, 'captures');
mkdirSync(CAP, { recursive: true });
export const URL_BASE = process.env.ECHOES_URL || 'http://127.0.0.1:5199/';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LOOPBACK = process.env.ECHOES_LOOPBACK_FLAG === '0' ? [] : ['--disable-features=NetworkServiceSandbox'];

export async function launch(opts = {}) {
  const { extraArgs = [], ...rest } = opts;
  return launchEchoes({ gpu: true, headful: false, background: true, autoplay: false, ...rest, extraArgs: [...LOOPBACK, ...extraArgs] });
}

// Opens the url with up to 3 retries (HMR reloads / navigation timeouts from concurrent agents).
export async function open(browser, url, opts = {}) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      return await openEchoes(browser, url, { timeout: 180000, ...opts });
    } catch (e) {
      last = e;
      await sleep(1500);
    }
  }
  throw last;
}

export function logger(name) {
  const file = join(CAP, `${name}.log`);
  writeFileSync(file, `# ${name} ${new Date().toISOString()}\n`);
  const log = (...a) => {
    const line = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
    console.log(line);
    appendFileSync(file, line + '\n');
  };
  log.file = file;
  return log;
}

// Boot to the title through the real loading card (a non-Esc key press, as a player would).
export async function reachTitle(page, { timeout = 120000, key = 'KeyZ' } = {}) {
  const t0 = Date.now();
  await page.waitForFunction(
    () => {
      const a = window.__echoes && window.__echoes.app;
      if (!a) return false;
      if (a.state !== 'boot') return true;
      const el = document.querySelector('#app-ui');
      return !!(el && /Ready|Press any key/i.test(el.textContent || ''));
    },
    { timeout, polling: 150 },
  );
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__echoes.app.state);
    if (st === 'title' || st === 'playing') break;
    await page.keyboard.press(key);
    await sleep(350);
  }
  await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 30000, polling: 100 });
  await sleep(700);
  return Date.now() - t0;
}

export async function dumpNav(page) {
  return page.evaluate(() => {
    const items = [];
    const vw = window.innerWidth, vh = window.innerHeight;
    const scrollBox = (el) => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(cs.overflowY) || /(auto|scroll|hidden)/.test(cs.overflow)) return p;
        p = p.parentElement;
      }
      return null;
    };
    const stack0 = window.__echoes.app.stack();
    const topId = stack0[stack0.length - 1];
    const topEl = topId ? document.querySelector(`[data-screen="${topId}"]`) : null;
    const scope = topEl || document;
    scope.querySelectorAll('[data-nav]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 && r.height === 0) return;
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      // hidden by an ancestor?
      let hidden = false;
      let p = el;
      while (p && p !== document.body) {
        const pcs = getComputedStyle(p);
        if (pcs.display === 'none' || pcs.visibility === 'hidden' || parseFloat(pcs.opacity) === 0) { hidden = true; break; }
        p = p.parentElement;
      }
      if (hidden) return;
      const sb = scrollBox(el);
      const sbr = sb ? sb.getBoundingClientRect() : null;
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      const hitOk = !!hit && (hit === el || el.contains(hit));
      // min font inside
      let minFont = parseFloat(cs.fontSize);
      el.querySelectorAll('*').forEach((c) => {
        const t = (c.textContent || '').trim();
        if (!t) return;
        const f = parseFloat(getComputedStyle(c).fontSize);
        if (f < minFont) minFont = f;
      });
      items.push({
        id: el.id || el.getAttribute('data-nav-id') || null,
        nav: el.getAttribute('data-nav'),
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type'),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
        disabled: el.getAttribute('aria-disabled') === 'true' || !!el.disabled,
        rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        font: parseFloat(cs.fontSize),
        minFont,
        inViewport: r.x >= -0.5 && r.y >= -0.5 && r.x + r.width <= vw + 0.5 && r.y + r.height <= vh + 0.5,
        scrollBox: sb ? { x: +sbr.x.toFixed(1), y: +sbr.y.toFixed(1), w: +sbr.width.toFixed(1), h: +sbr.height.toFixed(1), scrollTop: sb.scrollTop, scrollH: sb.scrollHeight, clientH: sb.clientHeight } : null,
        inScrollBox: sb ? r.y >= sbr.y - 0.5 && r.y + r.height <= sbr.y + sbr.height + 0.5 : true,
        hitOk,
        hitTag: hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + (hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(' ')[0] : '') : null,
      });
    });
    const a = window.__echoes.app;
    // all visible text nodes inside #app-ui: min font
    let minText = 999;
    const smallTexts = [];
    const ui = document.querySelector('#app-ui');
    if (ui) {
      const walker = document.createTreeWalker(ui, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = n.textContent.trim();
        if (!t) continue;
        const el = n.parentElement;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        let hid = false; let p = el;
        while (p && p !== document.body) { const pcs = getComputedStyle(p); if (pcs.display === 'none' || pcs.visibility === 'hidden' || parseFloat(pcs.opacity) === 0) { hid = true; break; } p = p.parentElement; }
        if (hid) continue;
        const f = parseFloat(getComputedStyle(el).fontSize);
        if (f < minText) minText = f;
        if (f < 14.5) smallTexts.push({ f, t: t.slice(0, 40), cls: el.className });
      }
    }
    return {
      state: a.state,
      stack: a.stack(),
      topScreen: topId,
      scoped: !!topEl,
      focus: a.focus(),
      ringCount: a.ringCount ? a.ringCount() : null,
      items,
      vw, vh,
      minText: minText === 999 ? null : minText,
      smallTexts: smallTexts.slice(0, 12),
    };
  });
}

export function overlaps(a, b) {
  return a.x < b.x + b.w - 0.6 && b.x < a.x + a.w - 0.6 && a.y < b.y + b.h - 0.6 && b.y < a.y + a.h - 0.6;
}

// Audits a dumpNav() result against the M1 gate G1.1 at this size.
export function auditLayout(d, { fontFloor, hitFloor = 40 }) {
  const issues = [];
  const vis = d.items.filter((it) => it.inScrollBox);
  for (const it of vis) {
    if (!it.inViewport) issues.push({ kind: 'outside-viewport', id: it.id, rect: it.rect });
    if (it.rect.w < hitFloor - 0.5 || it.rect.h < hitFloor - 0.5) issues.push({ kind: 'hit-target', id: it.id, rect: it.rect });
    if (it.minFont < fontFloor - 0.5 && !(it.tag === 'input' && it.type === 'range')) issues.push({ kind: 'font', id: it.id, font: it.minFont });
    if (!it.hitOk) issues.push({ kind: 'not-hit-testable', id: it.id, hit: it.hitTag, rect: it.rect });
  }
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j];
    // nested controls (a row containing a slider) are not overlaps
    if (a.id && b.id && (a.id.startsWith(b.id) || b.id.startsWith(a.id))) continue;
    if (overlaps(a.rect, b.rect)) issues.push({ kind: 'overlap', a: a.id, b: b.id, ra: a.rect, rb: b.rect });
  }
  if (d.ringCount !== 1) issues.push({ kind: 'ring', ringCount: d.ringCount });
  const scrolled = d.items.filter((it) => !it.inScrollBox).map((it) => it.id);
  return { issues, scrolled, count: d.items.length, visible: vis.length, minFont: Math.min(...vis.map((v) => v.minFont)), minHit: Math.min(...vis.map((v) => Math.min(v.rect.w, v.rect.h))), minText: d.minText };
}

// Installs a mocked standard-mapping gamepad; returns helpers via page.evaluate.
export async function installGamepad(page) {
  await page.evaluate(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = { id: 'gntcmenu4 mock pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: performance.now() };
    window.__gcPad = pad;
    navigator.getGamepads = () => { pad.timestamp = performance.now(); return [pad, null, null, null]; };
    window.__gcPress = (i, on) => { buttons[i].pressed = !!on; buttons[i].value = on ? 1 : 0; buttons[i].touched = !!on; };
    window.__gcAxis = (i, v) => { pad.axes[i] = v; };
  });
}

export async function padTap(page, button, holdMs = 70) {
  await page.evaluate((b) => window.__gcPress(b, true), button);
  await sleep(holdMs);
  await page.evaluate((b) => window.__gcPress(b, false), button);
  await sleep(140);
}

export async function padStick(page, axis, v, holdMs = 70) {
  await page.evaluate((a, val) => window.__gcAxis(a, val), axis, v);
  await sleep(holdMs);
  await page.evaluate((a) => window.__gcAxis(a, 0), axis);
  await sleep(140);
}

export async function focusInfo(page) {
  return page.evaluate(() => {
    const a = window.__echoes.app;
    const f = a.focus();
    return { screen: f && f.screen, id: f && f.id, label: f && f.label, stack: a.stack(), ring: a.ringCount ? a.ringCount() : null, state: a.state };
  });
}

export function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i];
}
export function stats(arr) {
  if (!arr.length) return { n: 0 };
  const s = [...arr].sort((a, b) => a - b);
  return { n: s.length, p50: +pct(s, 50).toFixed(1), p95: +pct(s, 95).toFixed(1), max: +s[s.length - 1].toFixed(1), min: +s[0].toFixed(1) };
}
