#!/usr/bin/env node
// fix-M2-r1 copy of the save r1 F1 refuter harness (tools/gntrsave1harness-pause-saves.mjs), outputs renamed to captures/gntfixM21-rharness-<tag>* — pause -> Save Game / Load Game stacking + REAL mouse input.
//   node tools/gntrsave1harness-pause-saves.mjs --tag A [--url http://127.0.0.1:5199] [--w 1600] [--h 900] [--gpu 1] [--headful 0]
// Writes captures/gntrsave1harness-<tag>.json and captures/gntrsave1harness-<tag>-*.png
// Own tool; imports the shared read-only launcher (PLAN §6.7).
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = { tag: 'A', url: 'http://127.0.0.1:5199', w: 1600, h: 900, gpu: 1, headful: 0, tries: 3, timeout: 180000 };
for (let i = 0; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = k === 'url' || k === 'tag' ? argv[i + 1] : Number(argv[i + 1]);
}
const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = /Execution context was destroyed|Target closed|Navigation timeout|detached Frame|Cannot find context|Session closed|net::ERR|Waiting failed|Protocol error/i;

const out = { tag: opt.tag, url: opt.url, w: opt.w, h: opt.h, gpu: !!opt.gpu, headful: !!opt.headful, attempt: 0, startedAt: new Date().toISOString(), results: [], failures: [], pageErrors: [], consoleErrors: [] };
const log = (tag, v) => { out.results.push({ tag, v }); console.log(`[${tag}] ${JSON.stringify(v).slice(0, 1800)}`); };
const fail = (msg, v) => { out.failures.push({ msg, v }); console.log(`[FAIL] ${msg} ${v !== undefined ? JSON.stringify(v).slice(0, 800) : ''}`); };

for (let attempt = 1; attempt <= opt.tries; attempt++) {
  out.attempt = attempt;
  out.results = []; out.failures = [];
  const browser = await launchEchoes({ gpu: !!opt.gpu, headful: !!opt.headful, autoplay: false, width: opt.w, height: opt.h });
  let transient = false;
  try {
    const { page, errors, consoleLines } = await openEchoes(browser, `${opt.url}/?menu=1&fresh=1&seed=7`, { width: opt.w, height: opt.h, timeout: opt.timeout });
    const ev = (fn, ...a) => page.evaluate(fn, ...a);
    const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); await sleep(60); };
    const shot = async (n) => { const p = join(outDir, `gntfixM21-rharness-${opt.tag}-${n}.png`); await page.screenshot({ path: p }); console.log(`[shot] ${p}`); };
    const app = () => ev(() => { const E = window.__echoes; const f = E.app.focus(); return { state: E.app.state, stack: E.app.stack(), focus: f && { id: f.id, label: f.label, screen: f.screen }, tick: E.tick }; });
    const focusTo = async (re, max = 8) => { for (let i = 0; i < max; i++) { const s = await app(); if (re.test((s.focus && s.focus.label) || '')) return s; await key('ArrowDown'); } return app(); };

    // 1. gesture through "press any key" to the title, then New Game.
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const st = await ev(() => window.__echoes.app && window.__echoes.app.state);
      if (st === 'title' || st === 'playing') break;
      await page.keyboard.press('Space'); await sleep(300);
    }
    await sleep(500);
    log('title', await app());
    await focusTo(/^new game$/i);
    await key('Enter');
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 30000 });
    await page.waitForFunction(() => window.__echoes.tick >= 240, { timeout: 90000 });
    log('playing', { ...(await app()), version: await ev(() => window.__echoes.version) });

    // 2. record every trusted pointer/click that reaches the document (capture phase on window).
    await ev(() => {
      window.__rf = { hits: [] };
      const rec = (e) => { const t = e.target; window.__rf.hits.push({ type: e.type, trusted: e.isTrusted, x: e.clientX, y: e.clientY, tag: t.tagName, id: t.id || '', cls: String(t.className || '').slice(0, 50), inPause: !!t.closest('.pz-pause'), inSaves: !!t.closest('.sv-screen') }); };
      for (const t of ['pointermove', 'pointerdown', 'mousedown', 'click']) window.addEventListener(t, rec, true);
    });

    const measure = () => ev(() => {
      const E = window.__echoes;
      const q = (sel) => document.querySelector(sel);
      const info = (el) => { if (!el) return null; const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); const kids = [...el.parentElement.children]; return { rect: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)], z: cs.zIndex, pos: cs.position, pe: cs.pointerEvents, vis: cs.visibility, op: cs.opacity, display: cs.display, cls: String(el.className).slice(0, 80), domIndex: kids.indexOf(el), siblings: kids.length, parent: el.parentElement.id || el.parentElement.className };
      };
      const hit = (sel) => { const el = q(sel); if (!el) return { sel, missing: true }; const b = el.getBoundingClientRect(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2; const t = document.elementFromPoint(cx, cy); const all = document.elementsFromPoint(cx, cy).slice(0, 6).map((e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''))); return { sel, cx: Math.round(cx), cy: Math.round(cy), top: t && (t.id ? '#' + t.id : t.tagName.toLowerCase() + '.' + String(t.className).split(' ')[0]), topInPause: !!(t && t.closest('.pz-pause')), topInSaves: !!(t && t.closest('.sv-screen')), targetUnderTop: all.includes('#' + el.id), stackAtPoint: all }; };
      const rings = [...document.querySelectorAll('#app-ui [data-nav], #app-ui button, #app-ui [tabindex]')].filter((el) => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); return b.width > 0 && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1 && /232, 162, 61|e8a23d/i.test(cs.outlineColor); }).map((el) => el.id || String(el.className).slice(0, 30));
      return { stack: E.app.stack(), focus: E.app.focus() && E.app.focus().id, ringCount: typeof E.app.ringCount === 'function' ? E.app.ringCount() : null, amberOutlines: rings, pause: info(q('.pz-pause')), saves: info(q('.sv-screen')), settings: info(q('.ap-settings, [class*="ap-settings"]')), hits: { slot1: hit('#sv-slot-manual-1'), slot2: hit('#sv-slot-manual-2'), slot3: hit('#sv-slot-manual-3'), back: hit('#sv-back'), importBtn: hit('#sv-import'), resume: hit('#pz-resume') } };
    });

    // 3. Esc -> pause.
    await key('Escape'); await sleep(500);
    const p1 = await app(); log('pause.open', p1);
    if (!p1.stack.includes('pause')) fail('Esc did not open the pause menu', p1);

    // seed one manual save BY KEYBOARD (the builder-verified path) so Load Game is enabled, then leave the saves screen.
    { const s0 = await focusTo(/^save game/i); await key('Enter'); await sleep(900); await key('Enter'); await sleep(1500); const k = await ev(() => ({ n: window.__echoes.save.list().length, ids: window.__echoes.save.list().map((x) => x.id), stack: window.__echoes.app.stack(), toasts: window.__echoes.app.toasts ? window.__echoes.app.toasts().slice(-1) : null })); log('keyboard.seedSave', k); if (!k.n) fail('keyboard Enter on Slot 1 did not create a save', k); await key('Escape'); await sleep(400); log('keyboard.afterEscape', await app()); }
    for (const mode of ['save', 'load']) {
      const label = mode === 'save' ? /^save game/i : /^load game/i;
      const s = await focusTo(label);
      if (!label.test((s.focus && s.focus.label) || '')) { fail(`could not focus ${mode} item`, s); continue; }
      await key('Enter'); await sleep(1000);
      const m = await measure(); log(`${mode}.measure`, m);
      await shot(`pause-${mode}`);
      // artifact hunt: is the stacking a transient (open animation) state? re-measure after a 3 s settle.
      await sleep(3000);
      { const m2 = await measure(); log(`${mode}.measure.settled3s`, { stack: m2.stack, pauseZ: m2.pause && m2.pause.z, pauseCls: m2.pause && m2.pause.cls, savesZ: m2.saves && m2.saves.z, savesCls: m2.saves && m2.saves.cls, slot1Top: m2.hits.slot1.top, backTop: m2.hits.back.top, importTop: m2.hits.importBtn.top, resumeTop: m2.hits.resume.top, amberOutlines: m2.amberOutlines }); }
      if (!m.stack.includes('saves')) { fail(`${mode}: saves screen not on the stack`, m.stack); continue; }
      const pauseAbove = m.pause && m.saves && Number(m.pause.z) > Number(m.saves.z);
      log(`${mode}.zorder`, { pauseZ: m.pause && m.pause.z, savesZ: m.saves && m.saves.z, pauseAboveSaves: pauseAbove, pauseDomIndex: m.pause && m.pause.domIndex, savesDomIndex: m.saves && m.saves.domIndex });

      // mouse: hover slot 3 (PLAN: hover focuses), click slot 2 twice, click Back.
      await ev(() => { window.__rf.hits.length = 0; });
      const before = await ev(() => ({ n: window.__echoes.save.list().length, ids: window.__echoes.save.list().map((x) => x.id), focus: window.__echoes.app.focus() && window.__echoes.app.focus().id }));
      // the Load list only shows existing slots: pick targets from the DOM (hover the last visible slot, click the second one, or the first if only one)
      const slotHits = await ev(() => [...document.querySelectorAll('.sv-screen [id^="sv-slot-"]')].filter((el) => el.getBoundingClientRect().height > 0).map((el) => { const b = el.getBoundingClientRect(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2; const t = document.elementFromPoint(cx, cy); return { id: el.id, cx: Math.round(cx), cy: Math.round(cy), top: t && (t.id ? '#' + t.id : t.tagName.toLowerCase() + '.' + String(t.className).split(' ')[0]) }; }));
      log(`${mode}.slotHits`, slotHits);
      if (!slotHits.length) { fail(`${mode}: no slot rows found`, m); continue; }
      const h3 = slotHits[slotHits.length - 1], h2 = slotHits[1] || slotHits[0], hb = m.hits.back;
      await page.mouse.move(h3.cx, h3.cy); await sleep(250);
      const afterHover = await ev(() => ({ focus: window.__echoes.app.focus() && window.__echoes.app.focus().id, hits: window.__rf.hits.slice() }));
      log(`${mode}.mouse.hover.${h3.id}`, afterHover);
      await page.mouse.click(h2.cx, h2.cy); await sleep(400);
      await page.mouse.click(h2.cx, h2.cy); await sleep(1500);
      const afterClick = await ev(() => ({ n: window.__echoes.save.list().length, ids: window.__echoes.save.list().map((x) => x.id), stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus() && window.__echoes.app.focus().id, toasts: window.__echoes.app.toasts ? window.__echoes.app.toasts().slice(-2) : null, hits: window.__rf.hits.slice() }));
      log(`${mode}.mouse.click.${h2.id}`, { before, afterClick });
      await shot(`pause-${mode}-after-click`);
      const changed = afterClick.n !== before.n || afterClick.focus !== before.focus || (afterClick.stack.join(',') !== 'pause,saves');
      if (!changed) fail(`${mode}: two trusted mouse clicks on ${h2.id} changed nothing (hit target ${h2.top})`, { before, afterClick });
      // if a confirm/rename dialog opened, back out of it first
      let st = await app();
      while (st.stack.length && st.stack[st.stack.length - 1] !== 'saves' && st.stack[st.stack.length - 1] !== 'pause') { await key('Escape'); await sleep(300); st = await app(); }
      if (st.stack.includes('saves')) {
        await ev(() => { window.__rf.hits.length = 0; });
        await page.mouse.click(hb.cx, hb.cy); await sleep(700);
        const afterBack = await ev(() => ({ stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus() && window.__echoes.app.focus().id, hits: window.__rf.hits.slice() }));
        log(`${mode}.mouse.clickBack`, afterBack);
        if (afterBack.stack.includes('saves')) fail(`${mode}: trusted mouse click on Back did not close the saves screen (hit ${hb.top})`, afterBack);
      }
      // keyboard control: Esc closes the saves screen (the path the builder verified)
      st = await app();
      if (st.stack.includes('saves')) { await key('Escape'); await sleep(400); log(`${mode}.keyboard.escape`, await app()); }
    }

    // control: pause -> Settings stacking + a mouse click on something in Settings
    const s = await focusTo(/^settings/i);
    await key('Enter'); await sleep(900);
    const ms = await ev(() => { const q = (sel) => document.querySelector(sel); const info = (el) => el && { z: getComputedStyle(el).zIndex, cls: String(el.className).slice(0, 60), domIndex: [...el.parentElement.children].indexOf(el) }; const r = q('#pz-resume'); let resumeHit = null; if (r) { const b = r.getBoundingClientRect(); const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); resumeHit = t && { id: t.id, cls: String(t.className).slice(0, 40), inPause: !!t.closest('.pz-pause') }; } const top = [...document.querySelectorAll('#app-ui > *')].map((e) => ({ cls: String(e.className).slice(0, 60), z: getComputedStyle(e).zIndex })); return { stack: window.__echoes.app.stack(), pause: info(q('.pz-pause')), resumeHit, appUiChildren: top }; });
    log('settings.measure', ms);
    await shot('pause-settings');
    if (ms.resumeHit && ms.resumeHit.inPause) fail('control: pause is ALSO above Settings', ms);
    await key('Escape'); await sleep(300);
    // within-run MOUSE CONTROL: a trusted click on the pause card's Resume must close the pause menu (proves mouse input works on this page)
    const rr = await ev(() => { const r = document.querySelector('#pz-resume'); const b = r.getBoundingClientRect(); return { cx: Math.round(b.x + b.width / 2), cy: Math.round(b.y + b.height / 2) }; });
    await ev(() => { window.__rf.hits.length = 0; });
    await page.mouse.move(rr.cx, rr.cy); await sleep(200);
    const hov = await ev(() => ({ focus: window.__echoes.app.focus() && window.__echoes.app.focus().id }));
    await page.mouse.click(rr.cx, rr.cy); await sleep(500);
    const res = await ev(() => ({ stack: window.__echoes.app.stack(), state: window.__echoes.app.state, tick: window.__echoes.tick, hits: window.__rf.hits.filter((h) => h.type === 'click') }));
    log('control.mouseResume', { rr, hoverFocus: hov.focus, ...res });
    if (res.stack.length) fail('control: a trusted mouse click on Resume did not close the pause menu', res);
    await sleep(600);
    log('resumed', await app());

    // artifact hunt: HMR / reload lines, page focus + visibility, real viewport.
    log('env', { viteLines: consoleLines.filter((l) => /[vite]|hmr|hot updated|page reload|Failed to load/i.test(l)), consoleTotal: consoleLines.length, page: await ev(() => ({ vis: document.visibilityState, hasFocus: document.hasFocus(), inner: [innerWidth, innerHeight], dpr: devicePixelRatio, ua: navigator.userAgent.slice(0, 80), href: location.href, version: window.__echoes.version })) });
    out.pageErrors = errors.slice();
    out.consoleErrors = consoleLines.filter((l) => /^\[error\]/.test(l) && !/WebGLProgram|X3595|X4000/.test(l));
    break;
  } catch (e) {
    const msg = String(e && e.stack ? e.stack : e);
    transient = TRANSIENT.test(msg);
    fail(`exception${transient ? ' (transient)' : ''}`, msg.slice(0, 1200));
    if (!transient) break;
  } finally {
    try { await browser.close(); } catch {}
  }
  if (transient && attempt < opt.tries) { console.log(`retrying (${attempt + 1}/${opt.tries})`); await sleep(1500); }
}
out.endedAt = new Date().toISOString();
out.verdict = out.failures.length === 0 && out.pageErrors.length === 0 ? 'OK' : 'FAIL';
writeFileSync(join(outDir, `gntfixM21-rharness-${opt.tag}.json`), JSON.stringify(out, null, 1));
console.log(`[DONE] ${out.verdict} failures=${out.failures.length} pageErrors=${out.pageErrors.length} -> captures/gntfixM21-rharness-${opt.tag}.json`);
