// fix-M2-r1 regression copy of tools/gntM2-sc-slots.mjs (shot names prefixed; writes captures/gntfixM21-m2slots-robust.json) with ONE change:
// the title-load wait reads save.lastLoad().hash instead of racing the live state hash against the first sim step after the load
// (the live-hash poll can only pass if it runs between the load task and the next frame; see docs/gauntlet/fix-M2-r1.md step 5).
// G2.3 — the slot menu by REAL input (keyboard + mouse), with a layout audit
// at the driver's window size (run it at 1024x576, 1600x900 and 2560x1440):
//   create / overwrite (confirm) / delete (confirm) / rename; metadata (date,
//   playtime, act, room, party HP, thumbnail) correct; Load from the title
//   restores the chosen slot in <= 1.5 s.
//   node tools/gntM2-drive.mjs tools/gntM2-sc-slots.mjs --w 1600 --h 900
import { auditTop } from './gntM2-audit.mjs';

const ORIGIN = 'http://127.0.0.1:5199/';

export default async function (h) {
  const { ev, sleep, key, shot, waitFor, log, fail, W, H } = h;
  const floor = W <= 1024 ? 14 : 18;
  const tag = `${W}x${H}`;
  const page = () => h.page;

  // ---- setup: a clean profile, a camp save, a run save, a real-key quicksave
  await h.open(`${ORIGIN}?menu=0&seed=5&fresh=1`);
  await waitFor(() => window.__echoes.tick > 120 && window.__echoes.save);
  const campSave = await ev(async () => (await window.__echoes.save.save('manual-1')).ok);
  await ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await waitFor(() => {
    const r = window.__echoes.state().run;
    return r.phase === 'combat' && r.room === 1 && window.__echoes.state().enemies.length > 0;
  }, { timeout: 20000 });
  await sleep(1500);
  const runSave = await ev(async () => {
    const r = await window.__echoes.save.save('manual-2', { name: 'Before the wood' });
    return { ok: r.ok, hash: r.hash, meta: r.meta && r.meta.meta };
  });
  // Real key: F5 = quicksave (confirm-free, toast).
  await page().keyboard.press('F5');
  await waitFor(() => window.__echoes.save.list().some((m) => m.id === 'quick'), { timeout: 5000 });
  const quick = await ev(() => {
    const q = window.__echoes.save.list().find((m) => m.id === 'quick');
    return { ok: !!q, toast: window.__echoes.app.toasts ? window.__echoes.app.toasts().slice(-1)[0] : null, where: q && q.meta.mode };
  });
  log('setup', { campSave, runSave, quick });
  if (!campSave || !runSave.ok || !quick.ok) fail('setup saves', { campSave, runSave, quick });

  // ---- title boot: Continue + Load Game + Records
  await h.open(ORIGIN);
  await waitFor(() => window.__echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 10000 });
  await sleep(700);
  const title = await ev(() => ({
    items: [...document.querySelectorAll('.ap-title .ap-mbtn')].map((b) => ({ id: b.id, text: b.textContent.trim(), disabled: b.disabled })),
    focus: window.__echoes.app.focus(),
  }));
  log('title', title);
  await shot(`gntfixM21-slotsR-title-${tag}`);
  const cont = title.items.find((i) => i.id === 'ap-title-continue');
  if (!cont || !/Quicksave/.test(cont.text)) fail('title Continue names the newest save (the quicksave)', title.items);
  if (!title.items.find((i) => i.id === 'ap-title-load' && !i.disabled)) fail('Load Game enabled', title.items);
  if (!title.items.find((i) => i.id === 'ap-title-records')) fail('Records on the title', title.items);

  // Keyboard: Continue -> New Game -> Load Game, Enter.
  await key('ArrowDown');
  await key('ArrowDown');
  const onLoad = await ev(() => window.__echoes.app.focus().id);
  if (onLoad !== 'ap-title-load') fail('keyboard reaches Load Game', onLoad);
  await key('Enter');
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'saves', { timeout: 5000 });
  await sleep(500);
  const loadList = await ev(() => ({
    title: document.querySelector('.sv-title').textContent,
    modes: document.querySelectorAll('.sv-modes [data-nav]').length,
    rows: [...document.querySelectorAll('.sv-row')].map((r) => ({ id: r.dataset.slot, text: r.textContent.replace(/\s+/g, ' ').trim(), img: !!r.querySelector('img'), pips: r.querySelectorAll('.sv-pip').length })),
    focus: window.__echoes.app.focus().id,
    detail: document.querySelector('.sv-detail').textContent.replace(/\s+/g, ' ').trim().slice(0, 400),
  }));
  log('loadList', loadList);
  const audit1 = await ev(auditTop, { floor, minHit: 40 });
  log(`audit-load-${tag}`, audit1);
  if (audit1.issueCount) fail(`saves (load) layout at ${tag}`, audit1.issues);
  if (audit1.ring !== 1) fail('exactly one focus ring', audit1.ring);
  await shot(`gntfixM21-slotsR-load-${tag}`);
  if (loadList.modes !== 0) fail('title Load shows no Save tab', loadList.modes);
  const r2 = loadList.rows.find((r) => r.id === 'manual-2');
  if (!r2 || !/Before the wood/.test(r2.text) || !/Room 1 of 8/.test(r2.text) || !/Playtime/.test(r2.text) || !r2.img || r2.pips !== 4)
    fail('manual-2 row metadata (name, act/room, date, playtime, thumbnail, 4 party HP pips)', r2);
  if (!/The Hollow Wood/.test(r2 ? r2.text : '')) fail('act name on the row', r2);

  // Move the focus to manual-2 by keyboard, then Enter = Load, timed.
  const idx = loadList.rows.findIndex((r) => r.id === 'manual-2');
  const cur = loadList.rows.findIndex((r) => r.id === loadList.focus.replace('sv-slot-', ''));
  for (let i = 0; i < Math.abs(idx - cur); i++) await key(idx > cur ? 'ArrowDown' : 'ArrowUp');
  const focusNow = await ev(() => window.__echoes.app.focus().id);
  if (focusNow !== 'sv-slot-manual-2') fail('keyboard focus on manual-2', focusNow);
  const detail2 = await ev(() => document.querySelector('.sv-detail').textContent.replace(/\s+/g, ' ').trim());
  log('detail-manual-2', detail2);
  const t0 = Date.now();
  await page().keyboard.press('Enter');
  await waitFor((hh) => window.__echoes.app.state === 'playing' && !!window.__echoes.save.lastLoad() && window.__echoes.save.lastLoad().hash === hh, { timeout: 5000, polling: 16 }, runSave.hash);
  const loadMs = Date.now() - t0;
  const afterLoad = await ev(() => ({ state: window.__echoes.app.state, mode: window.__echoes.cmd('campState').mode, run: window.__echoes.state().run.phase, room: window.__echoes.state().run.room, lastLoad: window.__echoes.save.lastLoad() }));
  log('loadFromTitle', { loadMs, afterLoad });
  if (loadMs > 1500) fail('Load from the title <= 1.5 s', loadMs);
  if (afterLoad.mode !== 'run' || afterLoad.run !== 'combat' || afterLoad.room !== 1) fail('restored into the saved room', afterLoad);
  await sleep(800);
  await shot(`gntfixM21-slotsR-afterload-${tag}`);

  // ---- in game: the Save tab (INT's pause menu opens this screen in W5)
  await ev(() => window.__echoes.app.open('saves', { mode: 'save' }));
  await sleep(500);
  const saveList = await ev(() => ({
    title: document.querySelector('.sv-title').textContent,
    rows: [...document.querySelectorAll('.sv-row')].map((r) => ({ id: r.dataset.slot, text: r.textContent.replace(/\s+/g, ' ').trim() })),
    focus: window.__echoes.app.focus().id,
    paused: window.__echoes.app.simPaused(),
  }));
  log('saveList', saveList);
  if (saveList.rows.length !== 8) fail('save mode lists the 8 manual slots', saveList.rows.length);
  if (!saveList.paused) fail('single-player sim paused behind the menu', saveList);
  const audit2 = await ev(auditTop, { floor, minHit: 40 });
  log(`audit-save-${tag}`, audit2);
  if (audit2.issueCount) fail(`saves (save) layout at ${tag}`, audit2.issues);
  await shot(`gntfixM21-slotsR-save-${tag}`);

  // Overwrite manual-1 (camp) by keyboard: Enter -> confirm (default Cancel) -> Left -> Enter.
  const before1 = await ev(() => window.__echoes.save.list().find((m) => m.id === 'manual-1'));
  const f0 = await ev(() => window.__echoes.app.focus().id);
  if (f0 !== 'sv-slot-manual-1') {
    await ev(() => window.__echoes.app.press('up'));
  }
  await key('Enter');
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'confirm', { timeout: 3000 });
  const dlg = await ev(() => ({ text: document.querySelector('.ap-dialog.ap-in .ap-dlg').textContent.replace(/\s+/g, ' ').trim(), focus: window.__echoes.app.focus().id }));
  log('overwriteConfirm', dlg);
  if (dlg.focus !== 'ap-confirm-cancel' || !/Overwrite/.test(dlg.text)) fail('overwrite asks first, Cancel focused', dlg);
  await shot(`gntfixM21-slotsR-overwrite-${tag}`);
  await key('ArrowLeft');
  await key('Enter');
  await waitFor((t) => {
    const m = window.__echoes.save.list().find((x) => x.id === 'manual-1');
    return m && m.savedAt !== t;
  }, { timeout: 5000 }, before1.savedAt);
  const after1 = await ev(() => window.__echoes.save.list().find((m) => m.id === 'manual-1'));
  log('overwritten', { before: before1.meta.mode, after: after1.meta.mode, room: after1.meta.room });
  if (after1.meta.mode !== 'run') fail('manual-1 overwritten with the run', after1.meta);

  // Save into an empty slot (manual-3): no confirm.
  await ev(() => window.__echoes.app.press('down'));
  await ev(() => window.__echoes.app.press('down'));
  const f3 = await ev(() => window.__echoes.app.focus().id);
  if (f3 !== 'sv-slot-manual-3') fail('focus manual-3', f3);
  await key('Enter');
  await waitFor(() => window.__echoes.save.list().some((m) => m.id === 'manual-3'), { timeout: 5000 });
  log('created', await ev(() => window.__echoes.save.list().find((m) => m.id === 'manual-3').name));

  // Rename manual-3 with F2 and typing.
  await sleep(300);
  await key('F2');
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'sv-rename', { timeout: 3000 });
  await sleep(150);
  await page().keyboard.down('Control');
  await page().keyboard.press('KeyA');
  await page().keyboard.up('Control');
  await page().keyboard.type('Stag attempt');
  await shot(`gntfixM21-slotsR-rename-${tag}`);
  const auditR = await ev(auditTop, { floor, minHit: 40 });
  if (auditR.issueCount) fail(`rename dialog layout at ${tag}`, auditR.issues);
  await page().keyboard.press('Enter');
  await waitFor(() => (window.__echoes.save.list().find((m) => m.id === 'manual-3') || {}).name === 'Stag attempt', { timeout: 3000 });
  log('renamed', 'Stag attempt');

  // Delete manual-3 with the Delete key (confirm, default Cancel -> Left -> Enter).
  await sleep(300);
  await key('Delete');
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'confirm', { timeout: 3000 });
  const del = await ev(() => ({ text: document.querySelector('.ap-dialog.ap-in .ap-dlg').textContent.replace(/\s+/g, ' ').trim(), focus: window.__echoes.app.focus().id }));
  if (del.focus !== 'ap-confirm-cancel' || !/Delete/.test(del.text)) fail('delete asks first, Cancel focused', del);
  await key('ArrowLeft');
  await key('Enter');
  await waitFor(() => !window.__echoes.save.list().some((m) => m.id === 'manual-3'), { timeout: 3000 });
  log('deleted', 'manual-3');

  // Mouse: click manual-2's row (selects + saves = overwrite confirm), then Cancel by click.
  const r2box = await ev(() => {
    const r = document.querySelector('#sv-slot-manual-2').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page().mouse.move(r2box.x, r2box.y);
  await page().mouse.click(r2box.x, r2box.y);
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'confirm', { timeout: 3000 });
  const cancelBox = await ev(() => {
    const r = document.querySelector('#ap-confirm-cancel').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page().mouse.click(cancelBox.x, cancelBox.y);
  await waitFor(() => window.__echoes.app.stack().slice(-1)[0] === 'saves', { timeout: 3000 });
  // Switch to the Load tab with E (tabNext) and back out with Esc.
  await key('KeyE');
  await sleep(200);
  const modeNow = await ev(() => document.querySelector('.sv-title').textContent);
  if (modeNow !== 'Load Game') fail('E switches Save -> Load', modeNow);
  await key('Escape');
  await waitFor(() => window.__echoes.app.stack().length === 0, { timeout: 3000 });
  const end = await ev(() => ({ state: window.__echoes.app.state, paused: window.__echoes.app.simPaused(), list: window.__echoes.save.list().map((m) => `${m.id}:${m.name}`) }));
  log('end', end);
  if (end.paused) fail('Esc returns to the running game', end);
}
