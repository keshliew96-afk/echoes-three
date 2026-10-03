// Save critic r5 — corruption by MY OWN edits to localStorage, integrity-valid-but-structurally-broken files,
// a REAL quota exhaustion, torn writes, profile (high score) corruption, page closed mid-save.
// Victim slot manual-2 (main + .bak); bystanders manual-1 / manual-3.
const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';

export default async function (h) {
  const foc = async () => h.ev(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id, label: f && f.label }; });
  const conf = async () => h.ev(() => { const c = document.getElementById('ap-confirm-ok'); if (!c || c.offsetParent === null) return null; const box = c.closest('[class*="confirm"]') || c.parentElement.parentElement; return box ? box.innerText.replace(/\n+/g, ' | ').slice(0, 400) : null; });
  const toasts = async () => h.ev(() => [...document.querySelectorAll('[class*="toast"]')].filter((e) => e.offsetParent !== null && e.innerText.trim()).map((e) => e.innerText.trim()).join(' / ').slice(0, 300));
  const navTo = async (id, keys = ['ArrowDown', 'ArrowUp']) => { for (const k of keys) for (let i = 0; i < 16; i++) { if ((await foc()).focus === id) return true; await h.key(k); await h.sleep(100); } return (await foc()).focus === id; };

  await h.open(BASE + '?menu=0&seed=21&fresh=1');
  await h.ready(200);
  const NOFREEZE = !!process.env.GFM26_NOFREEZE;
  const cl = []; h.page.on('console', (m) => cl.push(new Date().toISOString().slice(11, 23) + ' [' + m.type() + '] ' + m.text().slice(0, 200)));
  const setup = await h.ev(async (nofreeze) => {
    const E = window.__echoes;
    const r = {};
    r.hashAcceptsTree = (() => { try { const t = E.save.capture(); return E.save.hash(t) === E.save.hash(); } catch (e) { return 'threw ' + e; } })();
    r.s1 = (await E.save.save('manual-1', { name: 'Bystander One' })).meta.hash;
    E.cmd('startCampaign', { level: 1 });
    await new Promise((res) => setTimeout(res, 1800));
    r.s2a = (await E.save.save('manual-2', { name: 'Victim' })).meta.hash;
    await new Promise((res) => setTimeout(res, 1300));
    r.s2b = (await E.save.save('manual-2', { name: 'Victim' })).meta.hash;
    await new Promise((res) => setTimeout(res, 600));
    r.s3 = (await E.save.save('manual-3', { name: 'Bystander Three' })).meta.hash;
    r.keys = Object.keys(localStorage).filter((k) => k.startsWith('echoes.')).sort();
    r.goodMain = localStorage.getItem('echoes.save.v1.manual-2');
    r.goodBak = localStorage.getItem('echoes.save.v1.manual-2.bak');
    if (!nofreeze) E.sim.freeze();
    return r;
  }, NOFREEZE);
  const { goodMain, goodBak } = setup;
  h.log('setup', { ...setup, goodMain: goodMain.length, goodBak: goodBak && goodBak.length });

  // cases: f(mainText) -> text. "rehash" cases recompute the hash with the game's own hash(tree) so the file passes integrity.
  const cases = [
    ['truncate75', 'x', (s) => s.slice(0, Math.floor(s.length * 0.75))],
    ['truncate5', 'x', (s) => s.slice(0, Math.floor(s.length * 0.05))],
    ['schemaNewer5', 'j', (o) => { o.schema = 5; return o; }],
    ['schemaSame4', 'j', (o) => { o.schema = 4; return o; }],
    ['schemaOlder3_onV4body', 'j', (o) => { o.schema = 3; return o; }],
    ['schemaOlder2_onV4body', 'j', (o) => { o.schema = 2; return o; }],
    ['schemaOlder1_onV4body', 'j', (o) => { o.schema = 1; return o; }],
    ['schemaString', 'j', (o) => { o.schema = '4'; return o; }],
    ['partyTamper', 'j', (o) => { o.state.systems.party.seats[1].purse = 999; return o; }],
    ['partySixSkills', 'j', (o) => { o.state.systems.party.seats[1].slots = o.state.systems.party.seats[1].slots.concat(['taunting_roar', 'iron_stance']); return o; }],
    ['noSchema', 'j', (o) => { delete o.schema; return o; }],
    ['noMeta', 'j', (o) => { delete o.meta; return o; }],
    ['noSlot', 'j', (o) => { delete o.slot; return o; }],
    ['hashTamperWallet', 'j', (o) => { o.state.systems.run && (o.state.systems.run.__gcs5 = 1); return o; }],
    ['rehash_noRunSystem', 'r', (o) => { delete o.state.systems.run; return o; }],
    ['rehash_noRng', 'r', (o) => { delete o.state.rng; return o; }],
    ['rehash_registryNotArray', 'r', (o) => { o.state.registry.entities = 'oops'; return o; }],
    ['rehash_nanPos', 'r', (o) => { const e = o.state.registry.entities.find((x) => x && x.kind === 'player'); if (e) e.x = 'NaN-string'; return o; }],
    ['rehash_unknownSystem', 'r', (o) => { o.state.systems.__alien = { a: 1 }; return o; }],
    ['binaryJunk', 'x', () => '\u0000\u0001\u0002PK\u0003\u0004 garbage'],
  ];
  const table = [];
  const ONLY = process.env.GFM26_CASES ? process.env.GFM26_CASES.split(',') : null;
  for (const [name, kind, fn] of cases) {
    if (ONLY && !ONLY.includes(name)) continue;
    const caseP = h.ev(async (name, kind, fnSrc, goodMain, goodBak) => {
      const E = window.__echoes;
      const fn = eval('(' + fnSrc + ')');
      let bad;
      try {
        if (kind === 'x') bad = fn(goodMain);
        else {
          const o = JSON.parse(goodMain);
          const o2 = fn(o);
          if (kind === 'r') o2.hash = E.save.hash(o2.state);
          bad = JSON.stringify(o2);
        }
      } catch (e) { return { buildErr: String(e) }; }
      localStorage.setItem('echoes.save.v1.manual-2', goodMain);
      localStorage.setItem('echoes.save.v1.manual-2.bak', goodBak);
      localStorage.setItem('echoes.save.v1.manual-2', bad);
      const hashBefore = E.save.hash();
      const tickBefore = E.tick;
      let list = null, load = null, err = null;
      try { list = E.save.list().filter((s) => s.id === 'manual-2').map((s) => ({ status: s.status, detail: s.detail && String(s.detail).slice(0, 160), backup: !!s.backup })); } catch (e) { err = 'list threw ' + String(e); }
      try { const r = await E.save.load('manual-2'); load = { ok: r.ok, error: r.error, backup: r.backup ? { id: r.backup.id, savedAt: r.backup.savedAt } : null, message: String(r.message || r.reason || r.detail || '').slice(0, 200) }; } catch (e) { err = 'load threw ' + String(e); }
      await new Promise((r) => setTimeout(r, 150));
      const hashAfter = E.save.hash();
      let list2 = null; try { list2 = E.save.list().filter((s) => s.id === 'manual-2').map((s) => ({ status: s.status, detail: s.detail && String(s.detail).slice(0, 200) })); } catch (e) { err = (err || '') + ' list2 threw ' + e; }
      const by = {};
      for (const s of ['manual-1', 'manual-3']) { try { const r = await E.save.loadRaw(s); by[s] = r && r.ok; } catch (e) { by[s] = 'threw ' + String(e); } }
      return { bytes: bad.length, list, load, list2, err, stateUntouched: load && load.ok ? 'loaded' : hashBefore === hashAfter, appState: E.app.state, bystandersLoad: by, mainUnmodified: localStorage.getItem('echoes.save.v1.manual-2') === bad, bakKept: localStorage.getItem('echoes.save.v1.manual-2.bak') === goodBak, tickBefore };
    }, name, kind, fn.toString(), goodMain, goodBak);
    let res = await Promise.race([caseP, new Promise((r) => setTimeout(() => r({ HUNG: true }), 25000))]);
    caseP.catch(() => {});
    if (res.HUNG) {
      const alive = await Promise.race([h.ev(() => ({ tick: window.__echoes.tick, app: window.__echoes.app.state })).catch((e) => 'ev error ' + e), new Promise((r) => setTimeout(() => r('NO RESPONSE 5 s'), 5000))]);
      let recovered = null;
      if (process.env.GFM26_HANGWAIT && typeof alive === 'string') { const tW = Date.now(); while (Date.now() - tW < Number(process.env.GFM26_HANGWAIT)) { const a = await Promise.race([h.ev(() => ({ tick: window.__echoes.tick, app: window.__echoes.app.state, ctx: (() => { try { const c = document.querySelector('canvas'); const g = c && (c.getContext('webgl2') || c.getContext('webgl')); return g ? g.isContextLost() : 'no gl'; } catch (e) { return String(e); } })() })).catch((e) => null), new Promise((r) => setTimeout(() => r(null), 3000))]); if (a) { recovered = { afterMs: Date.now() - tW + 30000, a }; break; } } }
      const late = await Promise.race([caseP.then((x) => x).catch((e) => 'rej ' + e), new Promise((r) => setTimeout(() => r('still pending'), 1000))]);
      res = { HUNG: true, alive, recovered, lateResult: typeof late === 'string' ? late : JSON.stringify(late).slice(0, 300) };
      h.fail('case ' + name + ' did not return within 25 s', alive);
      try { await h.shot('corrupt-hung-' + name); } catch (e) {}
      await h.page.close().catch(() => {});
      const np = await h.browser.newPage();
      await np.setViewport({ width: h.W, height: h.H, deviceScaleFactor: 1 });
      h.hook(np);
      h.page = np;
      await h.open(BASE + '?menu=0&seed=21');
      await h.ready(120);
      await h.ev(() => window.__echoes.sim.freeze());
    }
    table.push({ case: name, t: new Date().toISOString().slice(11, 23), ...res });
    h.log('case', { case: name, ...res });
  }
  h.log('pageErrorsSoFar', h.allErrors.length + h.errors.length);
  h.log('consoleTail', cl.slice(-40));
  if (process.env.GFM26_STOP_AFTER_CASES) return;

  // Continuation sanity after the loaded "rehash" cases: step 120 ticks, no throw, NaN check on the party.
  const sanity = await h.ev(() => { const E = window.__echoes; try { E.sim.stepN(120, 2); const p = E.state().party; return { ok: true, tick: E.tick, party: p.map((q) => [q.x, q.z, q.hp].map((v) => Number.isFinite(v))) }; } catch (e) { return { ok: false, err: String(e) }; } });
  h.log('sanityAfterCases', sanity);

  // UI: damaged victim with a valid backup -> title Load Game row + detail, Enter -> restore confirm -> restored
  await h.ev((goodMain, goodBak) => {
    localStorage.setItem('echoes.save.v1.manual-2', goodMain);
    localStorage.setItem('echoes.save.v1.manual-2.bak', goodBak);
    localStorage.setItem('echoes.save.v1.manual-2', goodMain.slice(0, 1200));
  }, goodMain, goodBak);
  await h.open(BASE);
  await h.sleep(1500);
  await h.gesture();
  await h.sleep(900);
  const tf = { f: await foc(), cont: await h.ev(() => { const e = document.getElementById('ap-title-continue'); return e ? e.innerText.replace(/\n+/g, ' | ') : null; }) };
  h.log('UI-titleWithDamaged', tf);
  await navTo('ap-title-load');
  await h.key('Enter'); await h.sleep(800);
  await navTo('sv-slot-manual-2');
  await h.sleep(300);
  const rowD = await h.ev(() => { const e = document.getElementById('sv-slot-manual-2'); return e ? e.innerText.replace(/\n+/g, ' | ') : null; });
  const scr = await h.ev(() => { const s = document.querySelector('.sv-screen'); return s ? s.innerText.replace(/\n+/g, ' | ').slice(0, 1200) : null; });
  await h.shot('corrupt-title-damaged-row');
  await h.key('Enter'); await h.sleep(600);
  const rc = { f: await foc(), text: await conf() };
  await h.shot('corrupt-restore-confirm');
  if (rc.f.focus !== 'ap-confirm-ok') await navTo('ap-confirm-ok', ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  await h.key('Enter'); await h.sleep(900);
  const afterRestore = await h.ev(() => { const E = window.__echoes; const m = E.save.list().find((s) => s.id === 'manual-2'); return { status: m && m.status, hash: m && m.hash, main: (localStorage.getItem('echoes.save.v1.manual-2') || '').length }; });
  const toastR = await toasts();
  await h.shot('corrupt-after-restore');
  h.log('UI-damaged', { rowD, scr, restoreConfirm: rc, afterRestore, toastR, expectHash: setup.s2a });
  h.check(afterRestore.hash === setup.s2a, 'restored backup hash is not the first good save', afterRestore);

  // Both main and bak damaged -> what is offered
  await h.ev((goodMain) => { localStorage.setItem('echoes.save.v1.manual-2', goodMain.slice(0, 700)); localStorage.setItem('echoes.save.v1.manual-2.bak', goodMain.slice(0, 500)); }, goodMain);
  await h.open(BASE);
  await h.sleep(1500);
  await h.gesture();
  await h.sleep(800);
  await navTo('ap-title-load');
  await h.key('Enter'); await h.sleep(800);
  await navTo('sv-slot-manual-2');
  await h.sleep(300);
  const bothD = { row: await h.ev(() => { const e = document.getElementById('sv-slot-manual-2'); return e ? e.innerText.replace(/\n+/g, ' | ') : null; }), scr: await h.ev(() => { const s = document.querySelector('.sv-screen'); return s ? s.innerText.replace(/\n+/g, ' | ').slice(0, 900) : null; }) };
  await h.key('Enter'); await h.sleep(600);
  bothD.afterEnter = { f: await foc(), conf: await conf(), toast: await toasts(), state: await h.ev(() => window.__echoes.app.state) };
  await h.shot('corrupt-both-damaged');
  h.log('UI-bothDamaged', bothD);
  await h.key('Escape'); await h.sleep(400);

  // Profile (records / high scores) corruption: record a run, then truncate the profile main -> reload -> records?
  await h.open(BASE + '?menu=0&seed=21');
  await h.ready(120);
  const prof = await h.ev(async () => {
    const E = window.__echoes;
    E.cmd('startCampaign', { level: 1 });
    for (let i = 0; i < 300 && E.state().run.phase !== 'combat'; i++) E.sim.stepN(1);
    E.cmd('abandonRun');
    for (let i = 0; i < 120; i++) E.sim.stepN(1);
    await new Promise((r) => setTimeout(r, 400));
    const p = E.save.profile();
    return { hs: p.highScores.length, abandoned: p.records.abandoned, keys: Object.keys(localStorage).filter((k) => k.includes('profile')), main: (localStorage.getItem('echoes.profile.v1') || '').length, bak: (localStorage.getItem('echoes.profile.v1.bak') || '').length };
  });
  h.log('profileBefore', prof);
  await h.ev(() => { const s = localStorage.getItem('echoes.profile.v1'); localStorage.setItem('echoes.profile.v1', s.slice(0, Math.floor(s.length / 3))); });
  await h.open(BASE + '?menu=0&seed=21');
  await h.ready(120);
  await h.sleep(800);
  const profAfter = await h.ev(() => { const E = window.__echoes; const p = E.save.profile(); let rep = null; try { rep = E.save.profileReport(); } catch (e) { rep = String(e); } return { hs: p.highScores.length, abandoned: p.records.abandoned, report: JSON.stringify(rep).slice(0, 400), main: (localStorage.getItem('echoes.profile.v1') || '').length }; });
  h.log('profileAfterTruncate', { profAfter, toasts: await toasts() });
  h.check(profAfter.hs === prof.hs, 'high scores lost after a truncated profile (backup not used)', { prof, profAfter });

  // REAL quota: fill storage with junk until QuotaExceededError, then save (keyboard F5 + API), overwrite, check main intact
  const q = await h.ev(async () => {
    const E = window.__echoes;
    const before = E.save.list().find((s) => s.id === 'manual-1');
    const beforeMain = localStorage.getItem('echoes.save.v1.manual-1');
    let n = 0; const chunk = 'x'.repeat(256 * 1024);
    try { for (; n < 200; n++) localStorage.setItem('gcs4junk' + n, chunk); } catch (e) { /* full */ }
    let small = 0; try { for (; small < 4000; small++) localStorage.setItem('gcs4junks' + small, 'y'.repeat(1024)); } catch (e) {}
    const rNew = await E.save.save('manual-5', { name: 'Quota new' });
    const rOver = await E.save.save('manual-1', { name: 'Quota over' });
    const after = E.save.list().find((s) => s.id === 'manual-1');
    const r = { chunks: n, small, rNew: { ok: rNew.ok, error: rNew.error }, rOver: { ok: rOver.ok, error: rOver.error }, mainIntact: localStorage.getItem('echoes.save.v1.manual-1') === beforeMain, hashSame: before && after && before.hash === after.hash, tmpLeft: Object.keys(localStorage).filter((k) => k.endsWith('.tmp')), newExists: !!localStorage.getItem('echoes.save.v1.manual-5') };
    return r;
  });
  // keyboard F5 while full
  await h.key('F5'); await h.sleep(900);
  const qToast = await toasts();
  await h.shot('corrupt-quota-f5');
  const q2 = await h.ev(async () => {
    const E = window.__echoes;
    const l1 = await E.save.loadRaw('manual-1');
    for (const k of Object.keys(localStorage)) if (k.startsWith('gcs4junk')) localStorage.removeItem(k);
    const r = await E.save.save('manual-5', { name: 'After free' });
    return { manual1Loads: l1 && l1.ok, afterFree: { ok: r.ok, error: r.error } };
  });
  h.log('quota', { q, qToast, q2 });
  h.check(q.mainIntact && !q.rOver.ok && q.rOver.error === 'quota', 'quota overwrite did not leave main intact / report quota', q);
  h.check(/storage/i.test(qToast || ''), 'no quota message shown on F5 when full', qToast);

  // Torn writes (hand-crafted): main=A + newer valid tmp=B -> promoted on boot; main=A + truncated tmp -> A kept
  const tw = await h.ev(async () => {
    const E = window.__echoes;
    const A = await E.save.save('manual-4', { name: 'Torn A' });
    const aText = localStorage.getItem('echoes.save.v1.manual-4');
    E.sim.stepN(90, 1);
    const B = await E.save.save('manual-6', { name: 'Torn B src' });
    const bObj = JSON.parse(localStorage.getItem('echoes.save.v1.manual-6'));
    bObj.slot = { ...bObj.slot, id: 'manual-4', name: 'Torn A' };
    localStorage.setItem('echoes.save.v1.manual-4', aText);
    localStorage.setItem('echoes.save.v1.manual-4.tmp', JSON.stringify(bObj));
    // second victim: manual-7 main=A', tmp truncated
    const A7 = await E.save.save('manual-7', { name: 'Torn C' });
    const a7 = localStorage.getItem('echoes.save.v1.manual-7');
    localStorage.setItem('echoes.save.v1.manual-7.tmp', a7.slice(0, 300));
    return { A: A.meta.hash, B: B.meta.hash, A7: A7.meta.hash };
  });
  await h.open(BASE + '?menu=0&seed=21');
  await h.ready(120);
  await h.sleep(500);
  const tw2 = await h.ev(() => { const E = window.__echoes; const l = E.save.list(); const g = (id) => { const s = l.find((x) => x.id === id); return s && { hash: s.hash, status: s.status }; }; return { m4: g('manual-4'), m7: g('manual-7'), tmps: Object.keys(localStorage).filter((k) => k.endsWith('.tmp')), recovery: JSON.stringify(E.save.recovery()).slice(0, 400) }; });
  h.log('tornWrites', { tw, tw2 });
  h.check(tw2.m4 && tw2.m4.hash === tw.B, 'newer valid tmp not promoted', { tw, tw2 });
  h.check(tw2.m7 && tw2.m7.hash === tw.A7 && tw2.m7.status === 'ok', 'truncated tmp damaged the main', { tw, tw2 });

  // Page closed mid-save: start save.save() and close the page after d ms; reopen and inspect the slot.
  const closeRows = [];
  for (const d of [0, 15, 60, 150, 260]) {
    const pre = await h.ev(async () => { const E = window.__echoes; const r = await E.save.save('manual-8', { name: 'Close test' }); return r.meta.hash; });
    await h.ev(() => { window.__echoes.sim.stepN(60, 1); });
    const want = await h.ev(() => window.__echoes.save.hash());
    await h.ev(() => { window.__gcs5p = window.__echoes.save.save('manual-8', { name: 'Close test' }); return true; });
    await h.sleep(d);
    const url = BASE + '?menu=0&seed=21';
    await h.page.goto(url, { waitUntil: 'domcontentloaded' });
    await h.page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 60, { timeout: 90000 });
    const got = await h.ev(async () => { const E = window.__echoes; const s = E.save.list().find((x) => x.id === 'manual-8'); const r = await E.save.loadRaw('manual-8'); return { hash: s && s.hash, status: s && s.status, loads: r && r.ok, tmps: Object.keys(localStorage).filter((k) => k.endsWith('.tmp')) }; });
    closeRows.push({ closeAfterMs: d, prevHash: pre, newHash: want, got, outcome: got.hash === want ? 'new' : got.hash === pre ? 'previous' : 'OTHER' });
  }
  h.log('closeMidSave', closeRows);
  h.check(closeRows.every((r) => r.got.loads && r.outcome !== 'OTHER'), 'a page closed mid-save left an unloadable or foreign slot', closeRows);
}
