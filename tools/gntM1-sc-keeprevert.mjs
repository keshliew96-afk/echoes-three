// G1.5 fullscreen + G1.9 keep/revert, by real (trusted) keyboard input.
//  A. Display mode -> Fullscreen with ArrowRight: fullscreenElement within
//     500 ms; the browser leaving (document.exitFullscreen = Esc / F11) flips
//     the setting to Windowed on that fullscreenchange; canvas = window size.
//  B. Enter fullscreen, leave the tab (E): keep-display dialog, 10 s countdown,
//     let it time out -> fullscreenElement null + setting Windowed.
//  C. Render scale 100 -> 75 (ArrowLeft x5), close Settings (Esc): dialog;
//     Revert -> buffer back to 100% (+-1 px).
//  D. Render scale -> 75, Esc, Keep -> buffer stays 75%; then back to 100 + Keep.
//  E. Enter fullscreen, then leave it from the row (ArrowLeft) -> no dialog on close.
export default async function (h) {
  const { ev, sleep, log, waitFor, page, key } = h;
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  const snap = () =>
    ev(() => ({
      stack: __echoes.app.stack(),
      focus: __echoes.app.focus() && __echoes.app.focus().id,
      fsEl: !!document.fullscreenElement,
      fsSetting: __echoes.settings.get('display.fullscreen'),
      scale: __echoes.settings.get('display.renderScale'),
      buffer: __echoes.app.display().drawingBuffer,
      canvasCss: __echoes.app.display().canvasCss,
      win: { w: innerWidth, h: innerHeight },
      count: (document.querySelector('.ap-keepdisplay .ap-dlg-count') || {}).textContent || null,
    }));
  const focusRow = async (id) => {
    for (let i = 0; i < 8; i++) {
      const s = await snap();
      if (s.focus === id) return true;
      await page.keyboard.press('ArrowDown');
      await sleep(120);
    }
    return false;
  };
  const openDisplay = async () => {
    await ev(() => {
      __echoes.app.open('settings', { tab: 'display' });
      return true;
    });
    await sleep(400);
  };
  const out = {};
  // ---------------------------------------------------------------- A --
  await openDisplay();
  await focusRow('ap-display-mode');
  const tA = Date.now();
  await page.keyboard.press('ArrowRight');
  const fsOn = await waitFor(() => (document.fullscreenElement ? performance.now() : null), { timeout: 2000, poll: 10 });
  out.A_enterMs = fsOn ? Date.now() - tA : null;
  await sleep(300);
  out.A_on = await snap();
  await ev(() => document.exitFullscreen());
  await sleep(400);
  out.A_browserLeft = await snap();
  out.A_log = await ev(() => __echoes.app.displayLog().slice(-4));
  {
    const req = out.A_log.find((e) => e.ev === 'fullscreen_request');
    const on = out.A_log.find((e) => e.ev === 'fullscreenchange' && e.on);
    out.A_pageMs = req && on ? on.t - req.t : null; // in-page: keydown-driven request -> fullscreenchange
  }
  // ---------------------------------------------------------------- B --
  await page.keyboard.press('ArrowRight'); // Fullscreen again (a gesture)
  await sleep(500);
  out.B_entered = await snap();
  await page.keyboard.press('KeyE'); // leave the Display tab
  await sleep(400);
  out.B_dialog = await snap();
  const t0 = Date.now();
  const reverted = await waitFor(() => (!document.fullscreenElement && !__echoes.app.stack().includes('keep-display') ? true : null), { timeout: 14000, poll: 100 });
  out.B_timeoutMs = reverted ? Date.now() - t0 : null;
  await sleep(300);
  out.B_after = await snap();
  // back to Display
  await page.keyboard.press('KeyQ');
  await sleep(400);
  // ---------------------------------------------------------------- C --
  await focusRow('ap-display-renderScale');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowLeft');
    await sleep(60);
  }
  await sleep(200);
  out.C_changed = await snap();
  await page.keyboard.press('Escape');
  await sleep(400);
  out.C_dialog = await snap();
  await page.keyboard.press('ArrowRight'); // Keep -> Revert button
  await sleep(120);
  await page.keyboard.press('Enter');
  await sleep(400);
  out.C_reverted = await snap();
  // ---------------------------------------------------------------- D --
  await openDisplay();
  await focusRow('ap-display-renderScale');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowLeft');
    await sleep(60);
  }
  await page.keyboard.press('Escape');
  await sleep(400);
  out.D_dialog = await snap();
  await page.keyboard.press('Enter'); // default focus = Keep
  await sleep(400);
  out.D_kept = await snap();
  await openDisplay();
  await focusRow('ap-display-renderScale');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(60);
  }
  await page.keyboard.press('Escape');
  await sleep(400);
  await page.keyboard.press('Enter');
  await sleep(400);
  out.D_restored = await snap();
  // ---------------------------------------------------------------- E --
  await openDisplay();
  await focusRow('ap-display-mode');
  await page.keyboard.press('ArrowRight');
  await sleep(500);
  const eOn = await snap();
  await page.keyboard.press('ArrowLeft'); // Windowed: leaving applies at once
  await sleep(500);
  const eOff = await snap();
  await page.keyboard.press('Escape');
  await sleep(400);
  out.E = { on: eOn.fsEl, off: eOff.fsEl, afterClose: await snap() };
  for (const [k, v] of Object.entries(out)) log(k, v);
  const v = {
    G15_enter: out.A_pageMs !== null && out.A_pageMs <= 500 && out.A_on.fsSetting === true,
    G15_browserLeave: out.A_browserLeft.fsEl === false && out.A_browserLeft.fsSetting === false,
    G15_canvas: out.A_on.canvasCss.w === out.A_on.win.w && out.A_browserLeft.canvasCss.w === out.A_browserLeft.win.w,
    G19_dialogOnFsEnter: out.B_dialog.stack.includes('keep-display'),
    G19_timeoutRevert: out.B_after.fsEl === false && out.B_after.fsSetting === false && out.B_timeoutMs !== null && out.B_timeoutMs >= 9000 && out.B_timeoutMs <= 11500,
    G19_revertScale: out.C_dialog.stack.includes('keep-display') && out.C_reverted.scale === 1 && Math.abs(out.C_reverted.buffer.w - out.C_reverted.win.w) <= 1,
    G19_keepScale: out.D_kept.scale === 0.75 && Math.abs(out.D_kept.buffer.w - Math.round(out.D_kept.win.w * 0.75)) <= 1,
    G19_leaveFsNoDialog: out.E.on === true && out.E.off === false && !out.E.afterClose.stack.includes('keep-display') && out.E.afterClose.stack.join() === 'title',
  };
  log('verdict', v);
}
