// fix-M2-r1 — the screen manager's stacking invariant (src/app/screens.js liftAbove): a screen pushed on
// top of a higher z-band screen is drawn above it and takes the mouse. Probe: the 'screen'-band Records
// screen pushed over the 'overlay'-band pause menu (no menu offers that path — the debug API does), and
// the same Records screen from the title (no lift needed: same band, later in the DOM).
//   node tools/gntfixM21-drive.mjs tools/gntfixM21-sc-lift.mjs [--tag after]
export default async function (h) {
  const probe = (sel) => h.ev((sel) => {
    const E = window.__echoes;
    const el = document.querySelector(sel);
    const scr = el && el.closest('.ap-screen');
    const b = el && el.getBoundingClientRect();
    const t = b && document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return { stack: E.app.stack(), inlineZ: scr && scr.style.zIndex, z: scr && getComputedStyle(scr).zIndex, onTop: !!t && (t === el || el.contains(t)), hit: t && (t.id || String(t.className).split(' ')[0]), rings: E.app.ringCount() };
  }, sel);
  await h.open('http://127.0.0.1:5199/?menu=1&fresh=1&seed=7'); await h.gesture(); await h.sleep(900);
  // Title -> Records (same band).
  await h.ev(() => window.__echoes.app.open('records')); await h.sleep(600);
  const t1 = await probe('#sv-records-back'); h.log('title.records', t1);
  h.check(t1.onTop && t1.inlineZ === '', 'records over the title: not on top or lifted needlessly', t1);
  await h.key('Escape'); await h.sleep(400);
  await h.key('Enter'); await h.waitFor(() => window.__echoes.app.state === 'playing', 20000); await h.ready();
  // Play -> pause -> Records pushed over the overlay band.
  await h.key('Escape'); await h.sleep(500);
  await h.ev(() => window.__echoes.app.open('records')); await h.sleep(600);
  const p1 = await probe('#sv-records-back'); h.log('pause.records', p1);
  h.check(p1.onTop && p1.z === '1100', 'records over the pause menu is not lifted above it', p1);
  await h.shot('lift-pause-records');
  const w = await h.ev(() => { const b = document.querySelector('#sv-records-back').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await h.page.mouse.move(w.x, w.y, { steps: 3 }); await h.page.mouse.click(w.x, w.y); await h.sleep(600);
  const p2 = await h.ev(() => ({ stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus() && window.__echoes.app.focus().id }));
  h.log('pause.records.clickBack', p2);
  h.check(p2.stack.join() === 'pause', 'mouse Back on the lifted records screen did not return to the pause menu', p2);
  // Settings (overlay band) from the pause: no inline lift needed.
  await h.ev(() => window.__echoes.app.open('settings')); await h.sleep(600);
  const s1 = await h.ev(() => { const el = document.querySelector('.ap-settings'); return { inlineZ: el.style.zIndex, z: getComputedStyle(el).zIndex, stack: window.__echoes.app.stack() }; });
  h.log('pause.settings', s1);
  h.check(s1.inlineZ === '' && s1.z === '1100', 'settings from the pause got an unexpected z', s1);
  await h.key('Escape'); await h.sleep(400); await h.key('Escape'); await h.sleep(400);
  // Back at the title: Records again is NOT lifted (the inline z of the earlier push is reset).
  await h.ev(() => window.__echoes.app.quitToTitle({ save: false })); await h.waitFor(() => window.__echoes.app.state === 'title', 20000); await h.sleep(800);
  await h.ev(() => window.__echoes.app.open('records')); await h.sleep(600);
  const t2 = await probe('#sv-records-back'); h.log('title.records.again', t2);
  h.check(t2.onTop && t2.inlineZ === '' && t2.z === '1000', 'records over the title kept the pause-time lift', t2);
  h.log('pageErrors', h.errors);
}
