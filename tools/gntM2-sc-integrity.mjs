// G2.4 corruption · G2.5 atomicity · G2.6 files (export -> import keeps the hash).
//   node tools/gntM2-drive.mjs tools/gntM2-sc-integrity.mjs
// Corruptions (each on its own slot, each slot saved twice so a valid .bak
// exists): truncated JSON, wrong schema, missing keys, bad hash, newer
// version; then quota exceeded. Each must be detected with a clear message,
// the valid backup offered, 0 page errors, and every other slot unaffected.
// Atomicity: a torn write (tmp written, main not) leaves the previous save
// loadable; on the next boot a newer VALID tmp is promoted and an invalid
// one discarded. Files: a real Export download (CDP download dir) and a real
// Import through the menu's file chooser keep the tree hash.
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ORIGIN = 'http://127.0.0.1:5199/';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default async function (h) {
  const { ev, sleep, key, shot, waitFor, log, fail } = h;
  const page = () => h.page;
  await h.open(`${ORIGIN}?menu=0&seed=9&fresh=1`);
  await waitFor(() => window.__echoes.tick > 120 && window.__echoes.save);

  // --- Eight distinct saves, each written twice (the second write leaves the first as .bak).
  const base = await ev(async () => {
    const S = window.__echoes.save;
    const out = {};
    for (let i = 1; i <= 8; i++) {
      window.__echoes.sim.stepN(20 + i * 7, i);
      await S.save(`manual-${i}`, { name: `Probe ${i}` });
      window.__echoes.sim.stepN(9, i);
      const r = await S.save(`manual-${i}`, { name: `Probe ${i}` });
      out[`manual-${i}`] = r.hash;
    }
    return out;
  });
  const usage0 = await ev(() => window.__echoes.save.usage());
  log('saved', { base, bak: Object.keys(usage0.keys).filter((k) => k.endsWith('.bak')).length });

  // --- G2.4 corruption
  const modes = { 'manual-1': 'truncate', 'manual-2': 'schema', 'manual-3': 'keys', 'manual-4': 'hash', 'manual-5': 'newer' };
  const want = { truncate: 'corrupt', schema: 'corrupt', keys: 'corrupt', hash: 'hash', newer: 'version' };
  const corr = {};
  for (const [slot, mode] of Object.entries(modes)) {
    corr[slot] = await ev(async (slot, mode) => {
      const S = window.__echoes.save;
      const c = S.corrupt(slot, mode);
      const before = localStorage.getItem(`echoes.save.v1.${slot}`);
      const r = await S.loadRaw(slot);
      const after = localStorage.getItem(`echoes.save.v1.${slot}`);
      const m = S.list().find((x) => x.id === slot);
      return { mode, corrupt: c.ok, status: m && m.status, detail: m && m.detail, load: { ok: r.ok, error: r.error, detail: r.detail, backup: r.backup ? { savedAt: r.backup.savedAt, where: r.backup.meta.mode } : null }, untouched: before === after };
    }, slot, mode);
    const c = corr[slot];
    if (c.load.ok || c.load.error !== want[mode]) fail(`${mode}: detected as ${want[mode]}`, c);
    if (!c.load.backup) fail(`${mode}: valid backup offered`, c);
    if (!c.untouched) fail(`${mode}: a failed load never modifies the file`, c);
  }
  log('corruption', corr);
  if (corr['manual-5'].status !== 'newer') fail('newer version listed as newer', corr['manual-5']);

  // Quota exceeded: the save fails with the quota error, main copies untouched.
  const quota = await ev(async () => {
    const S = window.__echoes.save;
    const before = localStorage.getItem('echoes.save.v1.manual-6');
    S.simulateQuota(true);
    const r = await S.save('manual-6', { name: 'Should fail' });
    const r2 = await S.save('manual-9x', {}).catch(() => null);
    S.simulateQuota(false);
    const after = localStorage.getItem('echoes.save.v1.manual-6');
    return { ok: r.ok, error: r.error, untouched: before === after, tmpLeft: localStorage.getItem('echoes.save.v1.manual-6.tmp') !== null, message: S.errors.quota };
  });
  log('quota', quota);
  if (quota.ok || quota.error !== 'quota' || !quota.untouched || quota.tmpLeft) fail('quota exceeded detected, main untouched, no tmp left', quota);

  // The same quota failure through the menu (toast copy).
  await ev(() => window.__echoes.app.open('saves', { mode: 'save' }));
  await sleep(400);
  await ev(() => window.__echoes.save.simulateQuota(true));
  await ev(() => document.querySelector('#sv-slot-manual-6').click());
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'confirm', { timeout: 3000 });
  await ev(() => document.querySelector('#ap-confirm-ok').click());
  await waitFor(() => (window.__echoes.app.toasts() || []).some((t) => /Not enough browser storage/.test(t.text)), { timeout: 5000 });
  await shot('integrity-quota-toast');
  await ev(() => window.__echoes.save.simulateQuota(false));
  await key('Escape');
  await sleep(300);

  // Other slots unaffected: manual-6 / 7 / 8 still load to their saved hashes.
  const others = await ev(async (base) => {
    const S = window.__echoes.save;
    const out = {};
    for (const s of ['manual-6', 'manual-7', 'manual-8']) {
      const r = await S.loadRaw(s);
      out[s] = { ok: r.ok, equal: S.hash() === base[s] };
    }
    return out;
  }, base);
  log('others', others);
  for (const [s, v] of Object.entries(others)) if (!v.ok || !v.equal) fail(`other slot ${s} unaffected`, v);

  // The menu shows the damage + offers the backup; restore it by mouse.
  await ev(() => window.__echoes.app.open('saves', { mode: 'load' }));
  await sleep(500);
  const menu = await ev(() => [...document.querySelectorAll('.sv-row')].map((r) => ({ id: r.dataset.slot, text: r.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) })));
  log('menuRows', menu);
  for (const s of ['manual-1', 'manual-2', 'manual-3', 'manual-4']) {
    const row = menu.find((r) => r.id === s);
    if (!row || !/Damaged/.test(row.text) || !/Backup from/.test(row.text)) fail(`${s} listed as Damaged with its backup`, row);
  }
  if (!/Newer version/.test((menu.find((r) => r.id === 'manual-5') || {}).text || '')) fail('manual-5 tagged Newer version', menu);
  await ev(() => document.querySelector('#sv-slot-manual-1').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, movementX: 1 })));
  const r1 = await ev(() => {
    const r = document.querySelector('#sv-slot-manual-1').getBoundingClientRect();
    return { x: r.left + 40, y: r.top + r.height / 2 };
  });
  await page().mouse.move(r1.x, r1.y);
  await page().mouse.move(r1.x + 2, r1.y + 1);
  await sleep(200);
  const detail = await ev(() => ({ text: document.querySelector('.sv-detail').textContent.replace(/\s+/g, ' ').trim(), restore: !!document.querySelector('#sv-act-restore') }));
  log('damagedDetail', detail);
  await shot('integrity-damaged');
  if (!detail.restore || !/backup/i.test(detail.text)) fail('damaged slot detail offers Restore backup', detail);
  const rb = await ev(() => {
    const r = document.querySelector('#sv-act-restore').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page().mouse.click(rb.x, rb.y);
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'confirm', { timeout: 3000 });
  await ev(() => document.querySelector('#ap-confirm-ok').click());
  await waitFor(() => (window.__echoes.save.list().find((m) => m.id === 'manual-1') || {}).status === 'ok', { timeout: 3000 });
  const restored = await ev(async () => {
    const r = await window.__echoes.save.loadRaw('manual-1');
    return { ok: r.ok, hash: window.__echoes.save.hash() };
  });
  log('restoredBackup', restored);
  if (!restored.ok) fail('backup restored and loadable', restored);
  await ev(() => window.__echoes.app.back && window.__echoes.app.back());

  // --- G2.5 atomicity (torn writes), across a page reload.
  const torn = await ev(async () => {
    const S = window.__echoes.save;
    window.__echoes.sim.stepN(90, 3);
    const a = await S.simulateTornWrite('manual-7', { valid: true });
    const b = await S.simulateTornWrite('manual-8', { valid: false });
    const r7 = await S.loadRaw('manual-7');
    const h7 = S.hash();
    const r8 = await S.loadRaw('manual-8');
    const h8 = S.hash();
    return { a, b, beforeReload: { m7: { ok: r7.ok, hash: h7 }, m8: { ok: r8.ok, hash: h8 } } };
  });
  log('tornWritten', torn);
  if (torn.beforeReload.m7.hash !== base['manual-7'] || torn.beforeReload.m8.hash !== base['manual-8']) fail('torn write leaves the previous save loadable (before boot recovery)', torn);
  await h.open(`${ORIGIN}?menu=0&seed=9`);
  await waitFor(() => window.__echoes.tick > 60 && window.__echoes.save);
  const recovered = await ev(async () => {
    const S = window.__echoes.save;
    const rec = S.recovery();
    const r7 = await S.loadRaw('manual-7');
    const h7 = S.hash();
    const r8 = await S.loadRaw('manual-8');
    const h8 = S.hash();
    return { recovery: rec, m7: { ok: r7.ok, hash: h7 }, m8: { ok: r8.ok, hash: h8 }, tmps: Object.keys(localStorage).filter((k) => k.endsWith('.tmp')) };
  });
  log('afterBoot', recovered);
  if (recovered.m7.hash !== torn.a.tmpHash) fail('a newer valid tmp is promoted on boot', { recovered, tmp: torn.a.tmpHash });
  if (recovered.m8.hash !== base['manual-8']) fail('an invalid tmp is discarded, the previous save stays', recovered);
  if (recovered.tmps.length) fail('no .tmp left after recovery', recovered.tmps);

  // --- G2.6 files: text-level round trip, then a real download + a real file-chooser import.
  const textRt = await ev(() => {
    const S = window.__echoes.save;
    const txt = S.exportText('manual-6');
    const r = S.importText(txt, 'manual-4');
    return { ok: r.ok, slot: r.slotId, hashIn: JSON.parse(txt).hash, hashOut: r.hash };
  });
  log('exportImportText', textRt);
  if (!textRt.ok || textRt.hashIn !== textRt.hashOut) fail('export -> import (text) keeps the hash', textRt);

  const dl = join(root, 'captures', 'gntM2-downloads');
  rmSync(dl, { recursive: true, force: true });
  mkdirSync(dl, { recursive: true });
  const cdp = await page().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl, eventsEnabled: true }).catch(async () => {
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  });
  await ev(() => window.__echoes.app.open('saves', { mode: 'load' }));
  await sleep(400);
  const m6hash = await ev(() => window.__echoes.save.list().find((m) => m.id === 'manual-6').hash);
  await ev(() => document.querySelector('#sv-slot-manual-6').focus());
  await ev(() => window.__echoes.app.debug ? null : null);
  // Select manual-6 by keyboard focus then click Export.
  await ev(() => {
    const row = document.querySelector('#sv-slot-manual-6');
    row.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, movementX: 1 }));
  });
  const rr = await ev(() => {
    const r = document.querySelector('#sv-slot-manual-6').getBoundingClientRect();
    return { x: r.left + 40, y: r.top + r.height / 2 };
  });
  await page().mouse.move(rr.x, rr.y);
  await page().mouse.move(rr.x + 3, rr.y + 1);
  await sleep(150);
  const ex = await ev(() => {
    const r = document.querySelector('#sv-act-export').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page().mouse.click(ex.x, ex.y);
  let file = null;
  for (let i = 0; i < 40 && !file; i++) {
    await sleep(150);
    const f = readdirSync(dl).filter((n) => n.endsWith('.json'));
    if (f.length) file = join(dl, f[0]);
  }
  if (!file) fail('Export downloaded a .json file');
  else {
    const txt = readFileSync(file, 'utf8');
    const j = JSON.parse(txt);
    log('downloaded', { file: file.split(/[\\/]/).pop(), bytes: txt.length, hash: j.hash, format: j.format, schema: j.schema });
    if (j.hash !== m6hash) fail('downloaded file carries the slot hash', { file: j.hash, slot: m6hash });
    // Real import through the menu: free a slot first (delete manual-2), then Import….
    await ev(() => window.__echoes.save.remove('manual-2'));
    await ev(() => window.__echoes.app.back());
    await ev(() => window.__echoes.app.open('saves', { mode: 'load' }));
    await sleep(300);
    const ib = await ev(() => {
      const r = document.querySelector('#sv-import').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    const [chooser] = await Promise.all([page().waitForFileChooser({ timeout: 5000 }), page().mouse.click(ib.x, ib.y)]);
    await chooser.accept([file]);
    await waitFor(() => window.__echoes.save.list().some((m) => m.id === 'manual-2'), { timeout: 5000 });
    const imp = await ev(async () => {
      const S = window.__echoes.save;
      const m = S.list().find((x) => x.id === 'manual-2');
      const r = await S.loadRaw('manual-2');
      return { slot: 'manual-2', name: m.name, fileHash: m.hash, ok: r.ok, loadedHash: S.hash() };
    });
    log('importedViaMenu', imp);
    if (!imp.ok || imp.fileHash !== m6hash || imp.loadedHash !== m6hash) fail('export -> import (file) keeps the hash', { imp, m6hash });
  }
  await shot('integrity-end');
}
