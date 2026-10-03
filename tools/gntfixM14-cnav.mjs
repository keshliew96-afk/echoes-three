// Menu critic r3 — G1.2 navigation: keyboard only / mouse only / mocked gamepad / random walk.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, installGamepad, padTap, padStick, focusInfo } from './gntfixM14-lib.mjs';
const log = logger(process.env.LOGNAME_M14 || 'gntfixM14-cnav');
const W = 1600, H = 900;
const PART = process.argv[2] || 'ABCD';
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const hint = (page) => page.evaluate(() => {
  const st = window.__echoes.app.stack();
  const top = document.querySelector(`[data-screen="${st[st.length - 1]}"]`);
  if (!top) return null;
  const cands = [...top.querySelectorAll('*')].filter((e) => /hint|prompt|legend|keys/i.test(typeof e.className === 'string' ? e.className : ''));
  const h = cands[0];
  return h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : null;
});
const active = (page) => page.evaluate(() => { const a = document.activeElement; const ui = document.querySelector('#app-ui'); return { tag: a && a.tagName, id: a && a.id, inUi: !!(ui && a && ui.contains(a)) }; });
async function key(page, k, ms = 260) { await page.keyboard.press(k); await sleep(ms); return focusInfo(page); }
async function cycle(page, k, max = 40) {
  const seen = []; const start = (await focusInfo(page)).id; seen.push(start);
  for (let i = 0; i < max; i++) { const f = await key(page, k, 220); seen.push(f.id); if (f.id === start) break; }
  return seen;
}
async function goTo(page, id, k = 'ArrowDown', max = 20) {
  for (let i = 0; i < max; i++) { if ((await focusInfo(page)).id === id) return true; await key(page, k, 180); }
  return (await focusInfo(page)).id === id;
}
const browser = await launch({ width: W, height: H, autoplay: true });
try {
  // ---------------- A: keyboard only ----------------
  if (PART.includes('A')) {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
    await reachTitle(page);
    let f = await focusInfo(page);
    check('A0 title default focus', f.id === 'ap-title-new' && f.ring === 1, f);
    log('A0 hint', await hint(page));
    const down = await cycle(page, 'ArrowDown');
    check('A1 title ArrowDown wraps, disabled Load skipped', down[down.length - 1] === down[0] && !down.includes('ap-title-load'), down);
    const up = await cycle(page, 'ArrowUp');
    check('A1b title ArrowUp wraps', up[up.length - 1] === up[0], up);
    f = await key(page, 'KeyS'); const fs1 = f.id; f = await key(page, 'KeyW');
    check('A1c W/S move', fs1 !== 'ap-title-new' && f.id === 'ap-title-new', { s: fs1, w: f.id });
    await goTo(page, 'ap-title-settings');
    f = await key(page, 'Enter', 600);
    check('A2 Enter opens Settings with a row focused', f.stack.join() === 'title,settings' && f.ring === 1, f);
    log('A2 hint', await hint(page));
    for (let t = 0; t < 5; t++) {
      const tabName = await page.evaluate(() => { const s = document.querySelector('[data-screen="settings"] [aria-selected="true"]'); return s ? s.textContent.trim() : null; });
      const first = (await focusInfo(page)).id;
      const dn = await cycle(page, 'ArrowDown', 45);
      await goTo(page, first, 'ArrowDown', 45);
      const u1 = (await key(page, 'ArrowUp', 250)).id;
      const tabIdsInCycle = dn.filter((x) => x && x.startsWith('ap-tab-'));
      const selId = await page.evaluate(() => { const s = document.querySelector('[data-screen="settings"] [aria-selected="true"]'); return s && s.id; });
      log(`A3 tab ${t} ${tabName}`, { first, downCycle: dn, upFromFirst: u1, tabIdsInCycle, selId });
      check(`A3b tab ${tabName} cursor never on an unselected tab`, tabIdsInCycle.every((x) => x === selId), { tabIdsInCycle, selId });
      check(`A3 tab ${tabName} ArrowDown returns to its start`, dn[dn.length - 1] === dn[0], dn.length);
      await goTo(page, first, 'ArrowDown', 45);
      await key(page, 'KeyE', 450);
    }
    for (let i = 0; i < 5; i++) { const txt = await page.evaluate(() => document.querySelector('[data-screen="settings"]').textContent); if (/Resolution scale/.test(txt)) break; await key(page, 'KeyQ', 400); }
    f = await key(page, 'Escape', 600);
    check('A4 Esc from Settings -> title, focus restored on Settings', f.stack.join() === 'title' && f.id === 'ap-title-settings', f);
    f = await key(page, 'Escape', 500);
    check('A5 Esc at title root is a no-op', f.stack.join() === 'title' && f.id === 'ap-title-settings' && f.state === 'title', f);
    f = await key(page, 'Enter', 600); f = await key(page, 'Backspace', 600);
    check('A6 Backspace = back', f.stack.join() === 'title' && f.id === 'ap-title-settings', f);
    for (const [row, screen] of [['ap-title-records', 'records'], ['ap-title-multiplayer', 'mp-menu'], ['ap-title-exit', 'confirm']]) {
      await goTo(page, row);
      const inside = await key(page, 'Enter', 700);
      f = await key(page, 'Escape', 700);
      check(`A7 ${screen}: Enter opens, Esc returns one level with focus on ${row}`, inside.stack[inside.stack.length - 1] === screen && inside.ring === 1 && f.stack.join() === 'title' && f.id === row, { inside: [inside.stack, inside.id], back: [f.stack, f.id] });
    }
    const tabRes = [];
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); await sleep(120); const fi = await focusInfo(page); const ae = await active(page); tabRes.push([fi.id, fi.ring, ae.inUi, ae.tag]); }
    check('A8 browser Tab x12: ring stays 1', tabRes.every((r) => r[1] === 1), tabRes);
    await goTo(page, 'ap-title-new');
    f = await key(page, 'Enter', 1500);
    check('A9 New Game -> playing', f.state === 'playing' && f.stack.length === 0, f);
    f = await key(page, 'Escape', 600);
    check('A10 Esc in camp -> pause, focus Resume', f.stack.join() === 'pause' && f.id === 'pz-resume', f);
    log('A10 pause cycle', await cycle(page, 'ArrowDown'));
    await goTo(page, 'pz-settings');
    const inSet = await key(page, 'Enter', 600);
    f = await key(page, 'Escape', 600);
    check('A11 pause > Settings > Esc -> pause focus Settings', inSet.stack.join() === 'pause,settings' && f.stack.join() === 'pause' && f.id === 'pz-settings', { inSet: inSet.stack, f });
    f = await key(page, 'Escape', 600);
    check('A12 Esc closes pause -> play', f.stack.length === 0 && f.state === 'playing', f);
    await page.evaluate(() => window.__echoes.campaign.open());
    await sleep(700);
    const lv0 = await focusInfo(page);
    const lv1 = await key(page, 'ArrowRight', 300);
    const lv2 = await key(page, 'ArrowRight', 300);
    // click a locked card (Level II) with the mouse: must not start anything
    const lockRect = await page.evaluate(() => { const c = document.querySelectorAll('[data-screen="levels"] .cg-card')[1]; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.click(lockRect.x, lockRect.y); await sleep(500);
    const lockMsg = await page.evaluate(() => (document.querySelector('[data-screen="levels"]') || {}).textContent || '');
    const runAfter = await page.evaluate(() => { const r = window.__echoes.state().run; return r ? { active: r.active, phase: r.phase } : null; });
    const lvAfterClick = await focusInfo(page);
    f = await key(page, 'Escape', 600);
    check('A13 levels: focus Level I, Right skips locked II/III (stays I), click on locked card starts nothing, Esc -> camp', lv0.stack.join() === 'levels' && lv0.ring === 1 && /Level 1/.test(lv0.label || '') && lv1.label === lv0.label && lv2.label === lv0.label && !(runAfter && runAfter.active) && lvAfterClick.stack.join() === 'levels' && f.stack.length === 0, { lv0: lv0.label, lv1: lv1.label, lv2: lv2.label, runAfter, lockMsgHasUnlock: /to unlock/i.test(lockMsg), after: f.stack });
    await page.evaluate(() => window.__echoes.cmd('startRun', { act: 1 }));
    await sleep(2500);
    f = await key(page, 'Escape', 600);
    log('A14 pause-run cycle', await cycle(page, 'ArrowDown'));
    await goTo(page, 'pz-lobby');
    const qc = await key(page, 'Enter', 600);
    f = await key(page, 'Escape', 600);
    check('A14 Quit to Lobby: confirm, Esc -> pause focus Quit to Lobby', qc.stack.join() === 'pause,confirm' && f.stack.join() === 'pause' && f.id === 'pz-lobby', { confirm: [qc.stack, qc.id, qc.label], back: [f.stack, f.id] });
    f = await key(page, 'Escape', 600);
    check('A15 Esc resumes the run', f.stack.length === 0, f);
    const cues = await page.evaluate(() => { try { return window.__echoes.audio.cueLog(80).map((c) => c.cue + '@' + c.bus); } catch (e) { return String(e); } });
    const uiCues = Array.isArray(cues) ? cues.filter((c) => /@ui/.test(c)) : cues;
    log('A16 last 80 cues (ui bus)', uiCues);
    check('A16 UI cues on nav', Array.isArray(uiCues) && uiCues.length > 5, Array.isArray(uiCues) ? [...new Set(uiCues)] : uiCues);
    check('A pageerrors', errors.length === 0, errors);
    await page.close();
  }
  // ---------------- B: mouse only ----------------
  if (PART.includes('B')) {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
    await reachTitle(page);
    const center = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
    let c = await center('#ap-title-records');
    await page.mouse.move(c.x - 30, c.y, { steps: 5 }); await page.mouse.move(c.x, c.y, { steps: 5 }); await sleep(250);
    let f = await focusInfo(page);
    check('B1 hover focuses Records (single ring)', f.id === 'ap-title-records' && f.ring === 1, f);
    c = await center('#ap-title-settings');
    await page.mouse.move(c.x, c.y, { steps: 6 }); await sleep(150); await page.mouse.click(c.x, c.y); await sleep(700);
    f = await focusInfo(page);
    check('B2 click Settings opens it', f.stack.join() === 'title,settings', f);
    const tabIds = await page.evaluate(() => [...document.querySelectorAll('[data-screen="settings"] [id^="ap-tab-"]')].map((e) => e.id));
    const tabSeen = [];
    for (const t of tabIds) { const cc = await center('#' + t); await page.mouse.move(cc.x, cc.y, { steps: 4 }); await page.mouse.click(cc.x, cc.y); await sleep(450); tabSeen.push(await page.evaluate(() => { const s = document.querySelector('[data-screen="settings"] [aria-selected="true"]'); return s && s.id; })); }
    check('B3 each tab selectable by click', tabSeen.join() === tabIds.join(), { tabIds, tabSeen });
    const backSel = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-screen="settings"] [data-nav]')].find((x) => /^\s*Back\s*$/i.test(x.textContent)); return b ? '#' + b.id : null; });
    c = await center(backSel); await page.mouse.move(c.x, c.y, { steps: 4 }); await page.mouse.click(c.x, c.y); await sleep(700);
    f = await focusInfo(page);
    check('B4 Back button click -> title', f.stack.join() === 'title', { backSel, f });
    c = await center('#ap-title-records'); await page.mouse.move(c.x, c.y, { steps: 4 }); await page.mouse.click(c.x, c.y); await sleep(700);
    const inRec = await focusInfo(page);
    await page.mouse.click(1200, 450, { button: 'right' }); await sleep(700);
    f = await focusInfo(page);
    check('B5 right-click on a menu = back', inRec.stack.join() === 'title,records' && f.stack.join() === 'title', { inRec: inRec.stack, f: f.stack });
    c = await center('#ap-title-exit'); await page.mouse.move(c.x, c.y, { steps: 4 }); await page.mouse.click(c.x, c.y); await sleep(700);
    const conf = await focusInfo(page);
    c = await center('#ap-confirm-cancel'); await page.mouse.move(c.x, c.y, { steps: 4 }); await page.mouse.click(c.x, c.y); await sleep(700);
    f = await focusInfo(page);
    check('B6 Exit -> confirm -> Cancel by mouse', conf.stack.join() === 'title,confirm' && f.stack.join() === 'title', { conf: [conf.stack, conf.id], f: [f.stack, f.id] });
    await page.mouse.move(1300, 600, { steps: 5 }); await sleep(250);
    f = await focusInfo(page);
    check('B7 pointer on the backdrop keeps exactly one ring', f.ring === 1, f);
    c = await center('#ap-title-new'); await page.mouse.move(c.x, c.y, { steps: 4 }); await page.mouse.click(c.x, c.y); await sleep(1500);
    f = await focusInfo(page);
    const pauseBtn = await page.evaluate(() => [...document.querySelectorAll('button, [role="button"]')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && /pause|menu/i.test((b.textContent || '') + (b.getAttribute('aria-label') || '') + (b.title || '')); }).map((b) => (b.id || b.className) + ':' + (b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20))));
    log('B8 in play (mouse-only): clickable pause affordances', { state: f.state, pauseBtn });
    await page.screenshot({ path: `${CAP}/gntfixM14-cnav-mouse-play.png` });
    check('B pageerrors', errors.length === 0, errors);
    await page.close();
  }
  // ---------------- C: gamepad only ----------------
  if (PART.includes('C')) {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
    await reachTitle(page);
    await installGamepad(page);
    await sleep(300);
    const h0 = await hint(page);
    await padTap(page, 13); await sleep(200);
    let f = await focusInfo(page);
    const h1 = await hint(page);
    await page.screenshot({ path: `${CAP}/gntfixM14-cnav-pad-title.png` });
    log('C0 hint before/after pad', { before: h0, after: h1 });
    check('C0 prompts switch to pad glyphs after pad input', h0 !== h1, { h0, h1 });
    const seq = [f.id];
    for (let i = 0; i < 6; i++) { await padTap(page, 13); seq.push((await focusInfo(page)).id); }
    check('C1 d-pad down cycles and wraps', seq.includes('ap-title-exit') && seq.indexOf('ap-title-exit') < seq.length - 1, seq);
    const seqU = [];
    for (let i = 0; i < 3; i++) { await padTap(page, 12); seqU.push((await focusInfo(page)).id); }
    log('C1b d-pad up', seqU);
    const s0 = (await focusInfo(page)).id; await padStick(page, 1, 1, 120); const s1 = (await focusInfo(page)).id;
    check('C2 left stick tap = one step', s0 !== s1, { s0, s1 });
    const times = await page.evaluate(async () => {
      const E = window.__echoes; const t = []; let last = E.app.focus().id; const t0 = performance.now();
      window.__gcAxis(1, 1);
      while (performance.now() - t0 < 1300) { await new Promise((r) => requestAnimationFrame(r)); const id = E.app.focus().id; if (id !== last) { t.push(Math.round(performance.now() - t0)); last = id; } }
      window.__gcAxis(1, 0); return t;
    });
    const gaps = times.map((x, i) => (i ? x - times[i - 1] : x));
    check('C3 held stick: initial delay ~400 ms then repeat ~90 ms', times.length >= 5 && gaps[1] >= 300 && gaps[1] <= 520, { times, gaps });
    await sleep(300);
    for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) await padTap(page, 13);
    await padTap(page, 0); await sleep(500);
    f = await focusInfo(page);
    check('C4 A opens Settings', f.stack.join() === 'title,settings', f);
    log('C4 hint in settings (pad)', await hint(page));
    await page.screenshot({ path: `${CAP}/gntfixM14-cnav-pad-settings.png` });
    const sc0 = await page.evaluate(() => [window.__echoes.settings.get('display.renderScale'), window.__echoes.app.display().drawingBuffer]);
    await padTap(page, 15); await sleep(200);
    const sc1 = await page.evaluate(() => [window.__echoes.settings.get('display.renderScale'), window.__echoes.app.display().drawingBuffer]);
    await padTap(page, 14); await sleep(200);
    const sc2 = await page.evaluate(() => [window.__echoes.settings.get('display.renderScale'), window.__echoes.app.display().drawingBuffer]);
    check('C5 d-pad right/left adjusts Resolution scale (buffer follows)', sc1[0] !== sc0[0] && sc2[0] === sc0[0], { sc0, sc1, sc2 });
    await padTap(page, 5); await sleep(400); const rb = await page.evaluate(() => document.querySelector('[data-screen="settings"]').textContent.includes('Master'));
    await padTap(page, 4); await sleep(400); const lb = await page.evaluate(() => document.querySelector('[data-screen="settings"]').textContent.includes('Resolution scale'));
    check('C6 RB -> Audio tab, LB -> Display tab', rb && lb, { rb, lb });
    await padTap(page, 1); await sleep(600);
    f = await focusInfo(page);
    check('C7 B backs to title with focus on Settings', f.stack.join() === 'title' && f.id === 'ap-title-settings', f);
    await padTap(page, 1); await sleep(400);
    f = await focusInfo(page);
    check('C8 B at root = no-op', f.stack.join() === 'title' && f.state === 'title', f);
    for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-new'; i++) await padTap(page, 12);
    await padTap(page, 0); await sleep(1500);
    await padTap(page, 9); await sleep(500);
    const ps = await focusInfo(page);
    await padTap(page, 1); await sleep(500);
    f = await focusInfo(page);
    check('C9 Start opens pause, B resumes', ps.stack.join() === 'pause' && f.stack.length === 0, { ps: ps.stack, f: f.stack });
    await page.evaluate(() => window.__echoes.campaign.open()); await sleep(700);
    const l0 = await focusInfo(page); await padTap(page, 15); const l1 = await focusInfo(page); await padTap(page, 1); await sleep(500); const l3 = await focusInfo(page);
    const runC = await page.evaluate(() => { const r = window.__echoes.state().run; return r ? r.active : null; });
    check('C10 levels by pad: focus Level I, Right skips locked (stays I), B back to camp, no run started', l0.stack.join() === 'levels' && /Level 1/.test(l0.label || '') && l1.label === l0.label && l3.stack.length === 0 && !runC, { l0: l0.label, l1: l1.label, l3: l3.stack, runC });
    check('C pageerrors', errors.length === 0, errors);
    await page.close();
  }
  // ---------------- D: random 50 ----------------
  if (PART.includes('D')) {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
    await reachTitle(page);
    await installGamepad(page);
    await page.evaluate(() => { window.close = () => {}; });
    let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const acts = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'KeyE', 'KeyQ', 'pad0', 'pad1', 'pad12', 'pad13', 'pad14', 'pad15'];
    let viol = 0; const visited = new Set(); const log50 = [];
    for (let i = 0; i < 50; i++) {
      const a = acts[Math.floor(rnd() * acts.length)];
      const before = await focusInfo(page);
      if ((a === 'Enter' || a === 'pad0') && /ap-title-new|ap-title-continue|nt-mp-host|ap-confirm-ok|ap-title-load|nt-mp-quick|nt-mp-public/.test(before.id || '')) { i--; continue; }
      if (a.startsWith('pad')) await padTap(page, +a.slice(3)); else { await page.keyboard.press(a); await sleep(260); }
      const fi = await focusInfo(page);
      fi.stack.forEach((s) => visited.add(s));
      if (fi.stack.length && fi.ring !== 1) viol++;
      log50.push(`${a}:${fi.stack.join('>')}:${fi.id}:${fi.ring}`);
    }
    let esc = 0;
    while ((await focusInfo(page)).stack.join() !== 'title' && esc < 10) { await page.keyboard.press('Escape'); await sleep(450); esc++; }
    const fin = await focusInfo(page);
    log('D walk', log50);
    check('D 50 random actions: ring==1 always, home by Esc', viol === 0 && fin.stack.join() === 'title', { viol, visited: [...visited], escToHome: esc, final: fin });
    check('D pageerrors', errors.length === 0, errors);
    await page.close();
  }
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
