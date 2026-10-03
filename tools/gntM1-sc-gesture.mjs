// G1.13 gesture hook: with a blocking loading / title screen up and NO
// autoplay flag, one key press (not Esc), one click and one touch each reach
// service('audio').unlock through the app gesture hook (a stub audio service
// records the calls); and the hook is still the FIRST window capture-phase
// listener for keydown / pointerdown / mousedown / touchend (CDP listener list).
export default async function (h) {
  const { ev, sleep, log, waitFor, page } = h;
  await page.setViewport({ width: h.W, height: h.H, deviceScaleFactor: 1, hasTouch: true });
  await waitFor(() => window.__echoes && __echoes.app && (document.querySelector('.ap-press.ap-on') || __echoes.app.state === 'title'), { timeout: 90000 });
  const phase0 = await ev(() => ({ state: __echoes.app.state, stack: __echoes.app.stack(), audio: __echoes.audio ? __echoes.audio.state : null }));
  // Swap in a recording stub (same module instance as the app's registry).
  await ev(() => {
    const reg = { service: (n) => __echoes.app.service(n), provide: (n, i) => __echoes.app.provide(n, i) };
    const real = reg.service('audio');
    window.__gntCalls = [];
    reg.provide('audio', {
      state: 'locked',
      unlock(e) {
        window.__gntCalls.push({ type: e.type, key: e.key || null, screen: window.__echoes.app.stack().slice(-1)[0] || null, t: Math.round(performance.now()) });
      },
      update(now) {
        if (real && real.update) real.update(now);
      },
      debug: real ? real.debug : null,
    });
    return true;
  });
  const calls = () => ev(() => window.__gntCalls.slice());
  // 1. a key on the loading screen (if it is still up) or the title
  await page.keyboard.press('KeyK');
  await sleep(250);
  const afterKey = await calls();
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  await sleep(300);
  const onTitle = await ev(() => __echoes.app.stack());
  // 2. a click on the title backdrop (not on an item)
  await page.mouse.click(1300, 700);
  await sleep(200);
  const afterClick = await calls();
  // 3. a touch tap on the backdrop
  await page.touchscreen.tap(1250, 650);
  await sleep(250);
  const afterTouch = await calls();
  // 4. a key on the title (the gate swallows it; the hook must still see it)
  await page.keyboard.press('ArrowDown');
  await sleep(200);
  const afterKey2 = await calls();
  // Listener order on window (CDP).
  const client = await page.target().createCDPSession();
  const { result } = await client.send('Runtime.evaluate', { expression: 'window' });
  const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  const scripts = {};
  client.on('Debugger.scriptParsed', (e) => (scripts[e.scriptId] = e.url));
  await client.send('Debugger.enable');
  await sleep(300);
  const firstCapture = {};
  for (const type of ['keydown', 'pointerdown', 'mousedown', 'touchend']) {
    const l = listeners.filter((x) => x.type === type && x.useCapture);
    const url = String(scripts[l[0] && l[0].scriptId] || (l[0] && l[0].scriptId) || '');
    firstCapture[type] = l.length ? { script: url.replace(/^.*\/src\//, 'src/').replace(/\?.*$/, ''), line: l[0].lineNumber + 1, count: l.length } : null;
  }
  const byType = (arr, pred) => arr.filter(pred).length;
  const res = {
    phase0,
    onTitle,
    keyOnFirstScreen: byType(afterKey, (c) => c.type === 'keydown' && c.key === 'k'),
    firstScreen: afterKey[0] ? afterKey[0].screen : null,
    click: byType(afterClick, (c) => c.type === 'pointerdown' || c.type === 'mousedown') - byType(afterKey, (c) => c.type === 'pointerdown' || c.type === 'mousedown'),
    touch: byType(afterTouch, (c) => c.type === 'touchend'),
    keyOnTitle: byType(afterKey2, (c) => c.type === 'keydown' && c.key === 'ArrowDown'),
    calls: afterKey2,
    firstCapture,
  };
  log('gesture', res);
  log('verdict', {
    key: res.keyOnFirstScreen >= 1,
    click: res.click >= 1,
    touch: res.touch >= 1,
    keyOnTitle: res.keyOnTitle >= 1,
    hookFirst: Object.values(firstCapture).every((f) => f && /src\/app\/app\.js/.test(f.script)),
  });
}
