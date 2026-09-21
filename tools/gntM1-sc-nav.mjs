// G1.2 navigation: every screen reachable and exitable by keyboard only, mouse
// only and mocked gamepad only; Esc / B / right-click go back exactly one
// level (title root: no-op); exactly one visible ring whenever a screen is
// open; focus restored on return; no trap in 50 random nav actions.
// window.close is stubbed (a tab that stays open) so Exit reaches the farewell.
export default async function (h) {
  const { ev, sleep, log, waitFor, page, key } = h;
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  await ev(() => {
    window.close = () => {};
    // Mock gamepad: a standard pad whose buttons / axes the probe toggles.
    const pad = { id: 'gntM1 mock pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__gntPad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
    return true;
  });
  await sleep(300);
  const fails = [];
  const snap = () => ev(() => ({ stack: __echoes.app.stack(), focus: __echoes.app.focus(), rings: __echoes.app.ringCount(), state: __echoes.app.state }));
  const expect = async (label, pred) => {
    await sleep(260);
    const s = await snap();
    const ok = pred(s) && (s.stack.length === 0 || s.rings === 1);
    if (!ok) fails.push({ label, s });
    return s;
  };
  // ---------------------------------------------------------- keyboard --
  const kb = [];
  const k = async (code) => {
    await page.keyboard.press(code);
    kb.push(code);
  };
  let s = await expect('kb:title', (s) => s.stack.join() === 'title' && s.focus.id === 'ap-title-new');
  await k('Escape');
  await expect('kb:title-esc-noop', (s) => s.stack.join() === 'title');
  // walk down to Settings (Load Game is disabled and skipped)
  for (let i = 0; i < 6; i++) {
    const f = (await snap()).focus;
    if (f && f.id === 'ap-title-settings') break;
    await k('ArrowDown');
    await sleep(120);
  }
  await k('Enter');
  s = await expect('kb:settings-open', (s) => s.stack.join() === 'title,settings');
  const tabsSeen = [];
  for (let i = 0; i < 5; i++) {
    const t = await ev(() => document.querySelector('.ap-tab.ap-active') && document.querySelector('.ap-tab.ap-active').id);
    tabsSeen.push(t);
    await k('KeyE');
    await sleep(250);
  }
  // Up from the first row reaches the tab bar; left/right there switch tabs.
  await k('ArrowUp');
  await k('ArrowUp');
  await k('ArrowUp');
  await sleep(200);
  const onTab = await snap();
  await k('Escape');
  s = await expect('kb:settings-back', (s) => s.stack.join() === 'title' && s.focus.id === 'ap-title-settings');
  // Exit -> confirm -> Esc back -> Exit -> Enter on Cancel? default focus is Cancel.
  await k('ArrowDown');
  await sleep(150);
  await k('Enter');
  s = await expect('kb:confirm-open', (s) => s.stack.join() === 'title,confirm' && s.focus.id === 'ap-confirm-cancel');
  await k('Escape');
  s = await expect('kb:confirm-esc', (s) => s.stack.join() === 'title' && s.focus.id === 'ap-title-exit');
  await k('Enter');
  await sleep(200);
  await k('ArrowLeft'); // Cancel -> Exit button
  await k('Enter');
  await sleep(600);
  s = await expect('kb:farewell', (s) => s.stack.join() === 'farewell' && s.state === 'farewell' && s.focus.id === 'ap-farewell-return');
  await k('Escape');
  s = await expect('kb:farewell-back', (s) => s.stack.join() === 'title' && s.state === 'title');
  log('keyboard', { tabsSeen, onTab: onTab.focus, fails: fails.length });

  // ------------------------------------------------------------- mouse --
  const center = async (sel) =>
    ev((sel) => {
      const n = document.querySelector(sel);
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, sel);
  const click = async (sel, button = 'left') => {
    const c = await center(sel);
    if (!c) {
      fails.push({ label: `mouse:missing ${sel}` });
      return;
    }
    await page.mouse.move(c.x - 3, c.y - 2);
    await page.mouse.move(c.x, c.y);
    await sleep(60);
    await page.mouse.click(c.x, c.y, { button });
  };
  await click('#ap-title-settings');
  s = await expect('mouse:settings', (s) => s.stack.join() === 'title,settings');
  await click('#ap-tab-gameplay');
  s = await expect('mouse:tab-gameplay', (s) => s.focus && s.focus.id === 'ap-tab-gameplay');
  await click('#ap-gameplay-screenshake');
  const shakeAfter = await ev(() => __echoes.settings.get('gameplay.screenshake'));
  await click('#ap-tab-display');
  await sleep(200);
  // hover focuses
  const c1 = await center('#ap-display-vsync');
  await page.mouse.move(c1.x - 5, c1.y);
  await page.mouse.move(c1.x, c1.y);
  s = await expect('mouse:hover-focus', (s) => s.focus && s.focus.id === 'ap-display-vsync');
  // right-click = back
  await page.mouse.click(c1.x + 40, c1.y + 200, { button: 'right' });
  s = await expect('mouse:rightclick-back', (s) => s.stack.join() === 'title');
  await click('#ap-title-exit');
  s = await expect('mouse:confirm', (s) => s.stack.join() === 'title,confirm');
  await click('#ap-confirm-cancel');
  s = await expect('mouse:cancel', (s) => s.stack.join() === 'title');
  await click('#ap-title-exit');
  await sleep(250);
  await click('#ap-confirm-ok');
  await sleep(600);
  s = await expect('mouse:farewell', (s) => s.state === 'farewell');
  await click('#ap-farewell-return');
  s = await expect('mouse:return', (s) => s.state === 'title' && s.stack.join() === 'title');
  // settings reset via mouse restores shake
  await ev(() => __echoes.settings.set('gameplay.screenshake', 1));
  log('mouse', { shakeAfter, fails: fails.length });

  // ----------------------------------------------------------- gamepad --
  const btn = async (i, ms = 70) => {
    await ev((i) => {
      const b = window.__gntPad.buttons[i];
      b.pressed = true;
      b.value = 1;
      window.__gntPad.timestamp = performance.now();
      return true;
    }, i);
    await sleep(ms);
    await ev((i) => {
      const b = window.__gntPad.buttons[i];
      b.pressed = false;
      b.value = 0;
      window.__gntPad.timestamp = performance.now();
      return true;
    }, i);
    await sleep(90);
  };
  const DOWN = 13;
  const UP = 12;
  const A = 0;
  const B = 1;
  const RB = 5;
  const LEFT = 14;
  // focus starts on the last mouse item; walk to Settings
  for (let i = 0; i < 6; i++) {
    const f = (await snap()).focus;
    if (f && f.id === 'ap-title-settings') break;
    await btn(UP);
  }
  await btn(A);
  s = await expect('pad:settings', (s) => s.stack.join() === 'title,settings');
  const padTabs = [];
  for (let i = 0; i < 4; i++) {
    await btn(RB);
    await sleep(150);
    padTabs.push(await ev(() => document.querySelector('.ap-tab.ap-active').id));
  }
  // adjust a control with the D-pad: Display tab render scale -5%
  const beforeScale = await ev(() => __echoes.settings.get('display.renderScale'));
  await btn(LEFT);
  const afterScale = await ev(() => __echoes.settings.get('display.renderScale'));
  await btn(B); // -> keep-display dialog (scale changed) or title
  await sleep(300);
  let st = await snap();
  if (st.stack.includes('keep-display')) {
    await btn(B); // B = Revert
    await sleep(300);
  }
  s = await expect('pad:back', (s) => s.stack.join() === 'title');
  const revertedScale = await ev(() => __echoes.settings.get('display.renderScale'));
  // Exit via pad -> confirm -> B
  for (let i = 0; i < 6; i++) {
    const f = (await snap()).focus;
    if (f && f.id === 'ap-title-exit') break;
    await btn(DOWN);
  }
  await btn(A);
  s = await expect('pad:confirm', (s) => s.stack.join() === 'title,confirm');
  await btn(B);
  s = await expect('pad:confirm-back', (s) => s.stack.join() === 'title' && s.focus.id === 'ap-title-exit');
  log('gamepad', { padTabs, beforeScale, afterScale, revertedScale, fails: fails.length, pad: await ev(() => __echoes.app.gamepad()) });

  // ------------------------------------------------ 50 random actions --
  const actions = ['up', 'down', 'left', 'right', 'confirm', 'back', 'tabPrev', 'tabNext'];
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const trail = [];
  let ringFails = 0;
  for (let i = 0; i < 50; i++) {
    const a = actions[Math.floor(rnd() * actions.length)];
    // avoid starting a game (New Game) so the menus stay under test
    const f = (await snap()).focus;
    if (a === 'confirm' && f && f.id === 'ap-title-new') continue;
    await ev((a) => __echoes.app.press(a), a);
    await sleep(140);
    const x = await snap();
    if (x.stack.length && x.rings !== 1) ringFails++;
    trail.push(`${a}>${x.stack.slice(-1)[0] || '-'}:${x.focus ? x.focus.id : 'none'}`);
  }
  // escape hatch: back until the title root, bounded
  let hops = 0;
  for (; hops < 10; hops++) {
    const x = await snap();
    if (x.state === 'title' && x.stack.join() === 'title') break;
    if (x.state === 'farewell') {
      await ev(() => __echoes.app.press('confirm'));
    } else await ev(() => __echoes.app.press('back'));
    await sleep(350);
  }
  const end = await snap();
  log('random', { steps: trail.length, ringFails, hopsBackToTitle: hops, end, trail: trail.slice(0, 50) });
  log('fails', fails);
  log('verdict', { pass: fails.length === 0 && ringFails === 0 && end.stack.join() === 'title', fails: fails.length, ringFails });
}
