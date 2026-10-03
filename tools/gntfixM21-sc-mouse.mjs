// fix-M2-r1 (SAVE-R1-F1) — the in-game Save / Load screens driven by the MOUSE ONLY (PLAN §3.3 mouse
// mapping: hover focuses, click = confirm on that item, right-click on a menu = back; §7 G1.2 "mouse
// only"). Only Esc (to open the pause menu from combat) is a key. Every click is a trusted CDP click on
// the element's centre, after an elementFromPoint check that the target is really on top.
//   node tools/gntfixM21-drive.mjs tools/gntfixM21-sc-mouse.mjs [--tag after]
import { readdirSync } from 'fs';
import { join } from 'path';
export default async function (h) {
  const A = () => h.ev(() => { const E = window.__echoes; const f = E.app.focus(); return { state: E.app.state, stack: E.app.stack(), focus: f && f.id, rings: E.app.ringCount(), n: E.save.list().length }; });
  const where = (sel) => h.ev((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const b = el.getBoundingClientRect();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    const t = document.elementFromPoint(x, y);
    const layer = (n) => { const s = n && n.closest('.ap-screen'); return s ? s.dataset.screen : null; };
    return { sel, x, y, onTop: !!t && (t === el || el.contains(t)), hit: t && (t.id || String(t.className).split(' ')[0]), hitScreen: layer(t) };
  }, sel);
  const click = async (sel, { button = 'left', settle = 700 } = {}) => {
    const w = await where(sel);
    h.check(!w.missing, `${sel} missing`, w);
    if (w.missing) return w;
    h.check(w.onTop, `${sel} is not on top at its centre (hit ${w.hit} in screen ${w.hitScreen})`, w);
    await h.page.mouse.move(w.x, w.y, { steps: 4 }); await h.sleep(120);
    await h.page.mouse.click(w.x, w.y, { button }); await h.sleep(settle);
    return w;
  };
  const toasts = () => h.ev(() => window.__echoes.app.toasts().map((t) => t.text));
  const slot = (id) => h.ev((id) => { const m = window.__echoes.save.list().find((x) => x.id === id); return m ? { id: m.id, name: m.name, hash: m.hash, savedAt: m.savedAt, status: m.status } : null; }, id);

  await h.open('http://127.0.0.1:5199/?menu=1&fresh=1&seed=7'); await h.gesture(); await h.sleep(900);
  await click('#ap-title-new', { settle: 300 });
  await h.waitFor(() => window.__echoes.app.state === 'playing', 20000); await h.ready();
  await h.ev(() => window.__echoes.cmd('startRun', { act: 1 }));
  await h.waitFor(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 1; }, 20000); await h.sleep(800);

  // 1. Esc -> pause; click Save Game.
  await h.key('Escape'); await h.sleep(500);
  await click('#pz-save', { settle: 1000 });
  const s1 = await A(); h.log('open.save', s1);
  h.check(s1.stack.join() === 'pause,saves', 'click on Save Game did not open the saves screen', s1);
  const z = await h.ev(() => { const q = (s) => document.querySelector(s); const zi = (el) => el && getComputedStyle(el).zIndex; return { pause: zi(q('.pz-pause')), saves: zi(q('.sv-screen')), resumeHit: (() => { const r = q('#pz-resume').getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t && !!t.closest('.pz-pause'); })() }; });
  h.log('stacking', z);
  h.check(!z.resumeHit, 'the pause card is still hit-testable above the saves screen', z);
  h.check(s1.rings === 1, `rings ${s1.rings} != 1`, s1);
  await h.shot('mouse-save-open');

  // 2. hover focuses (slot 2), then click Slot 1 = save into the empty slot.
  const w2 = await where('#sv-slot-manual-2'); await h.page.mouse.move(w2.x, w2.y, { steps: 4 }); await h.sleep(300);
  const hov = await A(); h.log('hover.slot2', hov);
  h.check(hov.focus === 'sv-slot-manual-2', 'hovering Slot 2 did not focus it', hov);
  await click('#sv-slot-manual-1', { settle: 1800 });
  const a1 = await slot('manual-1'); h.log('click.slot1.save', { slot: a1, toasts: (await toasts()).slice(-1), app: await A() });
  h.check(!!a1 && a1.status === 'ok', 'clicking empty Slot 1 did not save', a1);

  // 3. click Slot 1 again = overwrite -> confirm dialog above -> click Overwrite.
  await h.sleep(1200);
  await click('#sv-slot-manual-1', { settle: 800 });
  const c1 = await A(); h.log('click.slot1.overwrite', c1);
  h.check(c1.stack.join() === 'pause,saves,confirm', 'overwrite did not ask first', c1);
  await click('#ap-confirm-ok', { settle: 1800 });
  const a2 = await slot('manual-1'); h.log('overwrite.done', { before: a1 && a1.savedAt, after: a2 && a2.savedAt, app: await A() });
  h.check(a2 && a1 && a2.savedAt !== a1.savedAt, 'Overwrite by mouse did not rewrite the slot', { a1, a2 });

  // 4. Rename by mouse: detail panel Rename -> dialog -> type -> click Rename.
  await click('#sv-slot-manual-1', { settle: 500 });
  if ((await A()).stack.includes('confirm')) await click('#ap-confirm-cancel', { settle: 500 }); // the row click asked to overwrite again: cancel
  await click('#sv-act-rename', { settle: 600 });
  const r0 = await A(); h.log('rename.open', r0);
  h.check(r0.stack[r0.stack.length - 1] === 'sv-rename', 'Rename did not open the rename dialog', r0);
  await h.ev(() => { const i = document.querySelector('.sv-rename input'); if (i) { i.focus(); i.select(); } });
  await h.page.keyboard.type('Mouse Save');
  await click('#sv-rename-ok', { settle: 800 });
  const a3 = await slot('manual-1'); h.log('rename.done', { a3, app: await A() });
  h.check(a3 && a3.name === 'Mouse Save' && a3.hash === a2.hash, 'rename by mouse failed or changed the hash', a3);

  // 5. Slot 2 save, then Delete by mouse with its confirm.
  await click('#sv-slot-manual-2', { settle: 1800 });
  const b1 = await slot('manual-2'); h.log('slot2.saved', b1);
  h.check(!!b1, 'clicking empty Slot 2 did not save', b1);
  await click('#sv-slot-manual-2', { settle: 600 });
  if ((await A()).stack.includes('confirm')) await click('#ap-confirm-cancel', { settle: 500 });
  await click('#sv-act-delete', { settle: 700 });
  const d0 = await A(); h.log('delete.confirm', d0);
  h.check(d0.stack.join() === 'pause,saves,confirm', 'Delete did not ask first', d0);
  await click('#ap-confirm-ok', { settle: 1000 });
  const b2 = await slot('manual-2'); h.log('delete.done', { b2, app: await A() });
  h.check(!b2, 'Delete by mouse did not remove Slot 2', b2);

  // 6. Load tab by mouse, click Slot 1 -> confirm -> Load.
  await click('#sv-mode-load', { settle: 700 });
  const l0 = await h.ev(() => document.querySelector('.sv-title').textContent);
  h.log('mode.load', l0);
  h.check(/load/i.test(l0), 'clicking the Load tab did not switch the mode', l0);
  const tickBefore = await h.ev(() => window.__echoes.tick);
  await click('#sv-slot-manual-1', { settle: 800 });
  const l1 = await A(); h.log('load.confirm', l1);
  h.check(l1.stack.join() === 'pause,saves,confirm', 'in-game Load did not ask first', l1);
  await h.shot('mouse-load-confirm');
  await click('#ap-confirm-ok', { settle: 1500 });
  const l2 = await h.ev(() => ({ lastLoad: window.__echoes.save.lastLoad(), stack: window.__echoes.app.stack(), tick: window.__echoes.tick, run: window.__echoes.state().run.phase }));
  h.log('load.done', { tickBefore, ...l2 });
  h.check(l2.lastLoad && l2.lastLoad.slot === 'manual-1' && l2.lastLoad.hash === a3.hash && l2.stack.length === 0, 'Load by mouse did not restore Slot 1', l2);

  // 7. Esc -> pause -> Load Game -> Import… by mouse opens the file chooser; import a file.
  await h.key('Escape'); await h.sleep(500);
  await click('#pz-load', { settle: 1000 });
  const dl = join(process.cwd(), 'captures', 'gntcsave1-downloads');
  const files = readdirSync(dl).filter((n) => /^echoes-manual-8-.*\.json$/.test(n));
  const before = await h.ev(() => window.__echoes.save.list().map((m) => m.id));
  const fc = h.page.waitForFileChooser({ timeout: 8000 });
  await click('#sv-import', { settle: 100 });
  const chooser = await fc.catch(() => null);
  h.check(!!chooser, 'Import… (from the pause menu) by mouse did not open a file chooser');
  if (chooser && files.length) { await chooser.accept([join(dl, files[0])]); await h.sleep(2500); }
  const imp = await h.ev(() => window.__echoes.save.list().map((m) => ({ id: m.id, name: m.name, hash: m.hash })));
  const added = imp.filter((m) => !before.includes(m.id));
  h.log('import.pause', { added, toasts: (await toasts()).slice(-1) });
  h.check(added.length === 1 && added[0].hash === '9910579e9ed583d3', 'mouse import from the pause Load screen failed', { added, imp });

  // 8. right-click on the saves screen = back -> pause; Save Game -> Back button -> pause; Resume.
  const rc = await where('.sv-head');
  await h.page.mouse.click(rc.x, rc.y, { button: 'right' }); await h.sleep(600);
  const k1 = await A(); h.log('rightclick.back', k1);
  h.check(k1.stack.join() === 'pause', 'right-click on the saves screen did not go back to the pause menu', k1);
  await click('#pz-save', { settle: 900 });
  await click('#sv-back', { settle: 700 });
  const k2 = await A(); h.log('back.click', k2);
  h.check(k2.stack.join() === 'pause' && k2.focus === 'pz-save', 'Back by mouse did not return to the pause menu with Save Game focused', k2);
  await click('#pz-resume', { settle: 800 });
  const k3 = await A(); h.log('resume.click', k3);
  h.check(k3.stack.length === 0 && k3.state === 'playing', 'Resume by mouse did not close the pause menu', k3);

  // 9. Title path unchanged: Esc -> pause -> Quit to Title (mouse, confirm) -> Load Game from the title by mouse.
  await h.key('Escape'); await h.sleep(500);
  await click('#pz-quit', { settle: 700 });
  await click('#ap-confirm-ok', { settle: 100 });
  await h.waitFor(() => window.__echoes.app.state === 'title', 20000); await h.sleep(900);
  const t0 = await A(); h.log('title', t0);
  h.check(t0.focus === 'ap-title-continue', 'title after Quit to Title with saves present does not focus Continue', t0);
  await click('#ap-title-load', { settle: 900 });
  const t1 = await h.ev(() => ({ stack: window.__echoes.app.stack(), z: getComputedStyle(document.querySelector('.sv-screen')).zIndex, titleZ: getComputedStyle(document.querySelector('.ap-title')).zIndex }));
  h.log('title.load', t1);
  h.check(t1.stack.join() === 'title,saves', 'title Load Game by mouse did not open the saves screen', t1);
  await h.shot('mouse-title-load');
  await click('#sv-slot-manual-1', { settle: 100 });
  await h.waitFor(() => window.__echoes.app.state === 'playing', 20000); await h.sleep(600);
  const t2 = await h.ev(() => ({ lastLoad: window.__echoes.save.lastLoad(), stack: window.__echoes.app.stack() }));
  h.log('title.load.done', t2);
  h.check(t2.lastLoad && t2.lastLoad.slot === 'manual-1', 'title Load by mouse did not load Slot 1', t2);
  h.log('pageErrors', h.errors);
}
