// Save critic r5 — export -> REAL download -> delete -> import through the REAL file chooser, driven by the MOUSE;
// duplicate import; tampered / newer / truncated / foreign files; old schema-2 exports from earlier builds;
// the full pre-campaign (v0.5.87) storage dump migrated in place (title, Records, Load of an old act-run save).
import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';

export default async function (h) {
  const P = () => h.page;
  const dl = join(h.outDir, 'gntfixM26-downloads-' + (h.opt.tag || 'x'));
  if (existsSync(dl)) rmSync(dl, { recursive: true, force: true });
  mkdirSync(dl, { recursive: true });
  const setDl = async () => { const cdp = await P().target().createCDPSession(); await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl }); };
  await setDl();
  const foc = async () => h.ev(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id }; });
  const toasts = async () => h.ev(() => [...document.querySelectorAll('[class*="toast"]')].filter((e) => e.offsetParent !== null && e.innerText.trim()).map((e) => e.innerText.trim()).join(' / ').slice(0, 300));
  const conf = async () => h.ev(() => { const c = document.getElementById('ap-confirm-ok'); if (!c || c.offsetParent === null) return null; const box = c.closest('[class*="confirm"]') || c.parentElement.parentElement; return box ? box.innerText.replace(/\n+/g, ' | ').slice(0, 400) : null; });
  const center = async (id) => h.ev((id) => { const e = document.getElementById(id); if (!e || e.offsetParent === null) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, id);
  const click = async (id, rest = 250) => {
    const c = await center(id);
    if (!c) return { ok: false, why: 'no ' + id };
    await P().mouse.move(c.x, c.y, { steps: 6 });
    await h.sleep(rest);
    await P().mouse.click(c.x, c.y);
    await h.sleep(350);
    return { ok: true };
  };
  const list = async () => h.ev(() => window.__echoes.save.list().map((s) => ({ id: s.id, name: s.name, hash: s.hash, status: s.status, schema: s.schema, game: s.game, detail: s.detail, level: s.meta && s.meta.level, room: s.meta && s.meta.room })));
  const navTo = async (id, keys = ['ArrowDown', 'ArrowUp']) => { for (const k of keys) for (let i = 0; i < 14; i++) { if ((await foc()).focus === id) return true; await h.key(k); await h.sleep(90); } return (await foc()).focus === id; };
  const importViaMouse = async (path) => {
    let chooser = null;
    const w = P().waitForFileChooser({ timeout: 5000 }).then((c) => { chooser = c; }).catch(() => {});
    await click('sv-import', 200);
    await w;
    let via = 'chooser';
    if (chooser) await chooser.accept([path]);
    else { via = 'uploadFile(fallback)'; const inp = await P().$('#sv-import-file'); await inp.uploadFile(path); }
    await h.sleep(1500);
    return { via, f: await foc(), confirm: await conf(), toasts: await toasts(), list: await list() };
  };

  if (!process.env.GFM26_ONLY_UPGRADE) {
  // --- make a run save (Level 1 room 2) by keyboard, then export it with the MOUSE
  await h.open(BASE + '?fresh=1');
  await h.sleep(1500);
  await h.gesture();
  await h.sleep(800);
  await h.key('Enter');
  await h.ready(200);
  await h.sleep(800);
  await h.ev(() => { const E = window.__echoes; E.cmd('startCampaign', { level: 1 }); });
  await h.waitFor(() => window.__echoes.state().run.phase === 'combat', 20000);
  await h.sleep(1500);
  await h.key('Escape'); await h.sleep(500);
  await navTo('pz-save');
  await h.key('Enter'); await h.sleep(700);
  await h.key('Enter'); await h.sleep(1200);
  const orig = (await list()).find((s) => s.id === 'manual-1');
  h.log('orig', orig);
  // hover row, rest, then move to Export and click
  const row = await center('sv-slot-manual-1');
  await P().mouse.move(row.x, row.y, { steps: 5 });
  await h.sleep(700);
  const ex = await click('sv-act-export', 300);
  let files = [];
  for (let i = 0; i < 50; i++) { files = readdirSync(dl).filter((f) => f.endsWith('.json')); if (files.length) break; await h.sleep(150); }
  await h.sleep(300);
  const exported = files[0] ? join(dl, files[0]) : null;
  let exp = null;
  if (exported) { const j = JSON.parse(readFileSync(exported, 'utf8')); exp = { file: files[0], bytes: readFileSync(exported).length, format: j.format, schema: j.schema, game: j.game, slot: j.slot, hash: j.hash, hashMatchesSlot: j.hash === orig.hash, meta: { level: j.meta.level, room: j.meta.room, mode: j.meta.mode, phase: j.meta.phase } }; }
  h.log('export', { ex, toasts: await toasts(), exp });
  h.check(exp && exp.hashMatchesSlot, 'mouse Export did not download a file with the slot hash', exp);
  // delete Slot 1 by mouse (Delete button + confirm OK)
  await P().mouse.move(row.x, row.y, { steps: 4 }); await h.sleep(700);
  await click('sv-act-delete', 300);
  const delConf = await conf();
  await click('ap-confirm-ok', 150);
  await h.sleep(500);
  h.log('deleteByMouse', { delConf, after: (await list()).map((s) => s.id) });
  // import it back through the real file chooser (mouse)
  const imp1 = await importViaMouse(exported);
  h.log('import1', { via: imp1.via, f: imp1.f, confirm: imp1.confirm, toasts: imp1.toasts, list: imp1.list });
  if (imp1.confirm) { await click('ap-confirm-ok', 150); await h.sleep(800); }
  const back = (await list()).find((s) => s.hash === orig.hash);
  const ld = back ? await h.ev(async (id) => { const r = await window.__echoes.save.loadRaw(id); return { ok: r.ok, hash: window.__echoes.save.hash() }; }, back.id) : null;
  h.log('import1Result', { back, ld, expect: orig.hash });
  h.check(back && ld && ld.ok && ld.hash === orig.hash, 'import did not restore a loadable slot with the original hash', { back, ld });
  // same file again (occupied): next free slot or a confirm — never a silent overwrite
  const imp2 = await importViaMouse(exported);
  h.log('import2dup', { via: imp2.via, confirm: imp2.confirm, toasts: imp2.toasts, slots: imp2.list.map((s) => s.id + '#' + (s.hash || '').slice(0, 8)) });
  if (imp2.confirm) { await h.key('Escape'); await h.sleep(300); }
  // bad files
  const j = JSON.parse(readFileSync(exported, 'utf8'));
  const bad = {
    tampered: (() => { const o = JSON.parse(JSON.stringify(j)); o.state.clock.tick += 7; return JSON.stringify(o); })(),
    newer: (() => { const o = JSON.parse(JSON.stringify(j)); o.schema = 9; return JSON.stringify(o); })(),
    truncated: JSON.stringify(j).slice(0, 2000),
    foreignJson: JSON.stringify({ hello: 'world', schema: 3 }),
    textFile: 'Just some notes, not a save.',
  };
  const before = await list();
  for (const [k, v] of Object.entries(bad)) {
    const f = join(dl, `gntfixM26-${k}.json`);
    writeFileSync(f, v);
    const r = await importViaMouse(f);
    if (r.confirm) { await h.key('Escape'); await h.sleep(300); }
    const changed = JSON.stringify(r.list.map((s) => s.id + s.hash)) !== JSON.stringify(before.map((s) => s.id + s.hash));
    h.log('importBad', { kind: k, via: r.via, confirm: r.confirm, toasts: r.toasts, listChanged: changed });
    h.check(!changed, 'a bad import changed the slot list: ' + k, r.list);
  }
  // old schema-2 exports from earlier builds (v0.5.44 / v0.5.62)
  for (const f of [join(h.outDir, 'gntM2-downloads', 'echoes-manual-6-2026-09-22_2342.json'), join(h.outDir, 'gntcsave1-downloads', 'echoes-manual-8-2026-09-24_1109.json')]) {
    if (!existsSync(f)) continue;
    const src = JSON.parse(readFileSync(f, 'utf8'));
    const r = await importViaMouse(f);
    if (r.confirm) { await click('ap-confirm-ok', 150); await h.sleep(800); }
    const L = await list();
    const got = L.find((s) => s.name === src.slot.name || (s.game === src.game));
    let ldo = null;
    if (got) ldo = await h.ev(async (id) => { const r = await window.__echoes.save.loadRaw(id); const s = window.__echoes.state(); return { ok: r.ok, error: r.error, v: window.__echoes.save.capture().v, seed: s.seed, skills: s.build.skills.map((k) => k.id + ':' + k.sockets.length) }; }, got.id);
    h.log('importOld', { file: f.split(/[\\/]/).pop(), srcSchema: src.schema, srcGame: src.game, srcSeed: src.meta && src.meta.seed, toasts: r.toasts, got, load: ldo });
  }
  await h.shot('files-after-imports');
  }

  // --- in-place upgrade of a whole v0.5.87 (schema 2, pre-campaign) storage dump
  const dumpPath = join(h.outDir, 'gntcsave3-old087-storage.json');
  if (existsSync(dumpPath)) {
    const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
    const oldSaves = {};
    for (const [k, v] of Object.entries(dump)) if (/^echoes\.save\.v1\.manual-\d$/.test(k)) { const o = JSON.parse(v); oldSaves[k] = { schema: o.schema, game: o.game, name: o.slot.name, mode: o.meta.mode, act: o.meta.act, room: o.meta.room, wallet: o.meta.wallet, seed: o.meta.seed }; }
    h.log('oldDump', { keys: Object.keys(dump), oldSaves });
    await h.page.goto(new URL('/src/version.js', BASE).href, { waitUntil: 'domcontentloaded' });
    await h.sleep(300);
    await h.ev((dump) => { for (const k of Object.keys(localStorage)) if (k.startsWith('echoes.')) localStorage.removeItem(k); for (const [k, v] of Object.entries(dump)) localStorage.setItem(k, v); }, dump);
    await h.open(BASE);
    await h.sleep(1500);
    await h.gesture();
    await h.sleep(1000);
    const title = await h.ev(() => [...document.querySelectorAll('[id^="ap-title-"]')].filter((e) => e.offsetParent !== null).map((e) => e.id + ': ' + e.innerText.replace(/\n+/g, ' | ')));
    const prof = await h.ev(() => { const p = window.__echoes.save.profile(); return { hs: p.highScores.map((x) => ({ score: x.score, act: x.act, victory: x.victory, levels: x.levels })), records: p.records, unlocks: p.unlocks, unlocked: window.__echoes.campaign.unlocked() }; });
    await h.shot('files-upgrade-title');
    h.log('upgradeTitle', { title, prof });
    await navTo('ap-title-load');
    await h.key('Enter'); await h.sleep(900);
    const lt = await h.ev(() => [...document.querySelectorAll('[id^="sv-slot-"]')].map((e) => e.id + ' :: ' + e.innerText.replace(/\n+/g, ' | ')));
    await h.shot('files-upgrade-load-list');
    h.log('upgradeLoadList', lt);
    // load each old run save through the title (keyboard), check it becomes a campaign at its act
    const res = [];
    for (const id of ['manual-1', 'manual-2']) {
      if (!(await center('sv-slot-' + id))) continue;
      await navTo('sv-slot-' + id);
      await h.key('Enter');
      await h.sleep(1600);
      const r = await h.ev(() => { const E = window.__echoes; const s = E.state(); const cs = E.campaign.state(); return { app: E.app.state, lastLoad: E.save.lastLoad() && E.save.lastLoad().slot, campaign: { active: cs.active, level: cs.level, startLevel: cs.startLevel, index: cs.index, harness: cs.harness }, phase: s.run.phase, room: s.run.room, act: s.run.act, wallet: s.wallet, bench: s.build.bench.map((n) => n.node), rows: s.build.skills.map((k) => k.id + ':' + k.sockets.length + ':' + k.sockets.filter(Boolean).map((n) => n.node).join('+')), p0: [s.party[0].x.toFixed(4), s.party[0].z.toFixed(4)] }; });
      res.push({ id, r, toasts: await toasts() });
      h.log('upgradeLoad', { id, r });
      // back to the title for the next one
      await h.ev(() => window.__echoes.app.quitToTitle && window.__echoes.app.quitToTitle());
      await h.waitFor(() => window.__echoes.app.state === 'title', 15000).catch(() => {});
      await h.sleep(900);
      await navTo('ap-title-load');
      await h.key('Enter'); await h.sleep(800);
    }
    h.log('upgradeSummary', { oldSaves, res });
  }
}
