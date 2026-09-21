// M2 misc checks: ?slot= boots (title path + menu-skip path + a bad slot),
// Continue from the title, the saves / records screens by GAMEPAD only
// (D-pad, A, B, X, Y, RB). Blocked storage: tools/gntM2-sc-private.mjs.
//   node tools/gntM2-drive.mjs tools/gntM2-sc-misc.mjs
const ORIGIN = 'http://127.0.0.1:5199/';

async function toTitle(h) {
  const { ev, key, waitFor } = h;
  await waitFor(() => window.__echoes.app.state === 'title' || window.__echoes.app.state === 'playing' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => window.__echoes.app.state === 'boot')) await key('Enter');
}

export default async function (h) {
  const { ev, sleep, key, shot, waitFor, log, fail } = h;
  const page = () => h.page;

  // ---- a run save to boot into
  await h.open(`${ORIGIN}?menu=0&seed=6&fresh=1`);
  await waitFor(() => window.__echoes.tick > 120 && window.__echoes.save);
  await ev(() => window.__echoes.cmd('startRun', { act: 2 }));
  await waitFor(() => window.__echoes.state().run.phase === 'combat' && window.__echoes.state().enemies.length > 0, { timeout: 20000 });
  await sleep(1200);
  const saved = await ev(async () => {
    const r = await window.__echoes.save.save('manual-4', { name: 'Mill run' });
    return { ok: r.ok, hash: r.hash };
  });
  log('saved', saved);

  // ---- ?slot= on a title boot: the loading screen hands straight to the game
  await h.open(`${ORIGIN}?slot=manual-4`);
  await toTitle(h);
  await waitFor(() => window.__echoes.app.state === 'playing' && window.__echoes.save.lastLoad(), { timeout: 20000 });
  const s1 = await ev(() => ({ state: window.__echoes.app.state, stack: window.__echoes.app.stack(), last: window.__echoes.save.lastLoad(), mode: window.__echoes.cmd('campState').mode, act: window.__echoes.state().run.act }));
  log('slotTitleBoot', s1);
  if (s1.last.hash !== saved.hash || s1.mode !== 'run' || s1.act !== 2) fail('?slot= (title boot) loads the slot and skips the title', s1);
  await sleep(1500);
  await shot('misc-slot-boot');

  // ---- ?slot= on a menu-skip boot
  await h.open(`${ORIGIN}?slot=manual-4&menu=0`);
  await waitFor(() => window.__echoes.save && window.__echoes.save.lastLoad(), { timeout: 20000 });
  const s2 = await ev(() => ({ state: window.__echoes.app.state, last: window.__echoes.save.lastLoad(), mode: window.__echoes.cmd('campState').mode }));
  log('slotMenuSkip', s2);
  if (s2.last.hash !== saved.hash || s2.mode !== 'run') fail('?slot=&menu=0 loads the slot', s2);

  // ---- a bad slot: title + honest toast, no dead end
  await h.open(`${ORIGIN}?slot=manual-7&menu=1`);
  await toTitle(h);
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 20000 });
  await sleep(300);
  const s3 = await ev(() => ({ state: window.__echoes.app.state, toasts: window.__echoes.app.toasts().map((t) => t.text) }));
  log('badSlot', s3);
  if (s3.state !== 'title' || !s3.toasts.some((t) => /Couldn't load save/.test(t))) fail('a missing ?slot= falls back to the title with a message', s3);

  // ---- Continue from the title (keyboard: the primary item is focused)
  const cont = await ev(() => window.__echoes.app.focus());
  await key('Enter');
  await waitFor(() => window.__echoes.app.state === 'playing', { timeout: 5000 });
  const s4 = await ev(() => ({ last: window.__echoes.save.lastLoad(), focusWas: null }));
  log('continue', { focused: cont && cont.id, last: s4.last });
  if (!cont || cont.id !== 'ap-title-continue' || s4.last.slot !== 'manual-4') fail('Continue (focused by default) loads the newest save', { cont, s4 });

  // ---- gamepad only: title -> Load Game -> saves -> X delete (B cancels) -> Y rename (B cancels) -> B back -> Records -> B
  await h.open(ORIGIN);
  await toTitle(h);
  await waitFor(() => window.__echoes.app.state === 'title', { timeout: 20000 });
  await ev(() => {
    const pad = { id: 'gntM2 mock pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__gntPad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
  });
  await sleep(300);
  const btn = async (i) => {
    await ev((i) => {
      const b = window.__gntPad.buttons[i];
      b.pressed = true;
      b.value = 1;
      window.__gntPad.timestamp = performance.now();
    }, i);
    // Held until a rendered frame has polled it (under load a frame can take
    // 100+ ms; the menu polls navigator.getGamepads() once per frame).
    await ev(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await sleep(60);
    await ev((i) => {
      const b = window.__gntPad.buttons[i];
      b.pressed = false;
      b.value = 0;
      window.__gntPad.timestamp = performance.now();
    }, i);
    await ev(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await sleep(120);
  };
  const A = 0, B = 1, X = 2, Y = 3, RB = 5, UP = 12, DOWN = 13;
  const snap = () => ev(() => ({ stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus() && window.__echoes.app.focus().id, rings: window.__echoes.app.ringCount() }));
  const pad = [];
  const expect = async (label, pred) => {
    for (let k = 0; k < 20; k++) {
      const s0 = await snap();
      if (pred(s0)) break;
      await sleep(150);
    }
    const s = await snap();
    const ok = pred(s) && (s.stack.length === 0 || s.rings === 1);
    pad.push({ label, ok, s });
    if (!ok) fail(`gamepad: ${label}`, s);
    return s;
  };
  for (let i = 0; i < 6; i++) {
    const f = (await snap()).focus;
    if (f === 'ap-title-load') break;
    await btn(DOWN);
  }
  await btn(A);
  await expect('A opens Load Game', (s) => s.stack.join() === 'title,saves');
  await btn(DOWN);
  await btn(UP);
  await expect('D-pad moves between slots', (s) => /^sv-slot-/.test(s.focus || ''));
  await btn(X);
  await expect('X asks to delete', (s) => s.stack.join() === 'title,saves,confirm' && s.focus === 'ap-confirm-cancel');
  await btn(B);
  await expect('B cancels the delete', (s) => s.stack.join() === 'title,saves');
  const still = await ev(() => window.__echoes.save.list().some((m) => m.id === 'manual-4'));
  if (!still) fail('gamepad: cancelled delete keeps the slot');
  await btn(Y);
  await expect('Y opens rename', (s) => s.stack.join() === 'title,saves,sv-rename');
  await btn(B);
  await expect('B cancels rename', (s) => s.stack.join() === 'title,saves');
  await btn(RB);
  await expect('RB on the title Load screen stays Load (no Save tab outside a game)', (s) => s.stack.join() === 'title,saves');
  await btn(B);
  await expect('B returns to the title', (s) => s.stack.join() === 'title');
  for (let i = 0; i < 8; i++) {
    const f = (await snap()).focus;
    if (f === 'ap-title-records') break;
    await btn(DOWN);
  }
  await btn(A);
  await expect('A opens Records', (s) => s.stack.join() === 'title,records');
  await btn(B);
  await expect('B leaves Records', (s) => s.stack.join() === 'title');
  log('gamepad', pad.map((p) => `${p.label}:${p.ok ? 'ok' : 'FAIL'}`));

}
