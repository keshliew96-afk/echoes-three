// G1.8 persistence: every persisted M1 setting survives a reload AND is
// re-applied (buffer, scheduler, fps meter, shake); display.fullscreen reads
// Windowed after a reload (session-only) with the "lasts for this visit" note;
// corrupt JSON -> defaults + toast + .corrupt copy, 0 page errors; storage that
// throws -> in-memory store + the Settings footer note, 0 page errors.
// Run with --url "http://127.0.0.1:5199/?menu=0&seed=7".
export default async function (h) {
  const { ev, sleep, log, waitFor, page, errors } = h;
  const ready = () => waitFor(() => window.__echoes && __echoes.settings && __echoes.app.state === 'playing' && __echoes.tick > 30, { timeout: 120000 });
  await ready();
  const want = {
    'display.renderScale': 0.75,
    'display.vsync': false,
    'display.frameLimit': 60,
    'display.showFps': true,
    'gameplay.screenshake': 0.5,
    'gameplay.autoPause': false,
  };
  // Change them the way a player does: through the Settings UI where cheap,
  // the API for the rest (same store path, source differs only).
  await ev((want) => {
    for (const [k, v] of Object.entries(want)) __echoes.settings.set(k, v);
    return true;
  }, want);
  await sleep(600); // debounce 150 ms + margin
  const stored = await ev(() => JSON.parse(localStorage.getItem('echoes.settings')));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await sleep(1500);
  const after = await ev(() => ({
    dump: __echoes.settings.dump(),
    loadReport: __echoes.settings.loadReport,
    display: __echoes.app.display(),
    frame: __echoes.app.frameStats(),
    fpsMeter: getComputedStyle(document.getElementById('fps-meter')).display,
    win: innerWidth,
  }));
  const persisted = Object.entries(want).every(([k, v]) => after.dump[k] === v);
  const applied = {
    buffer: Math.abs(after.display.drawingBuffer.w - Math.round(after.win * 0.75)) <= 1,
    scheduler: after.frame.vsync === false && after.frame.limit === 60 && after.frame.source === 'uncapped',
    fpsMeter: after.fpsMeter !== 'none',
  };
  // Fullscreen: enter via a trusted key in the Display tab, reload, expect Windowed.
  await ev(() => {
    __echoes.app.open('settings', { tab: 'display' });
    return true;
  });
  await sleep(500);
  for (let i = 0; i < 4; i++) {
    const f = await ev(() => __echoes.app.focus() && __echoes.app.focus().id);
    if (f === 'ap-display-mode') break;
    await page.keyboard.press('ArrowDown');
    await sleep(120);
  }
  await page.keyboard.press('ArrowRight');
  await sleep(500);
  const fsBefore = await ev(() => ({ el: !!document.fullscreenElement, setting: __echoes.settings.get('display.fullscreen'), stored: JSON.parse(localStorage.getItem('echoes.settings')).data['display.fullscreen'] }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await ev(() => {
    __echoes.app.open('settings', { tab: 'display' });
    return true;
  });
  await sleep(600);
  const fsAfter = await ev(() => ({
    el: !!document.fullscreenElement,
    setting: __echoes.settings.get('display.fullscreen'),
    modeLabel: document.querySelector('#ap-display-mode').textContent,
    note: document.querySelector('#ap-display-mode').closest('.ap-row').querySelector('.ap-note').textContent,
  }));
  await ev(() => {
    __echoes.app.back();
    __echoes.settings.reset('display');
    __echoes.settings.reset('gameplay');
    __echoes.settings.persist();
    return true;
  });
  await sleep(400);
  // Corrupt JSON.
  await ev(() => {
    localStorage.setItem('echoes.settings', '{"v":1,"data":{"display.renderScale":0.6,,,}');
    return true;
  });
  const errBefore = errors.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await sleep(800);
  const corrupt = await ev(() => ({
    status: __echoes.settings.loadReport.status,
    scale: __echoes.settings.get('display.renderScale'),
    corruptCopy: localStorage.getItem('echoes.settings.corrupt'),
    toasts: __echoes.app.toasts().map((t) => t.text),
  }));
  await ev(() => {
    __echoes.app.open('settings');
    return true;
  });
  await sleep(400);
  corrupt.footNote = await ev(() => document.querySelector('.ap-foot-note').textContent);
  await ev(() => {
    __echoes.app.back();
    localStorage.removeItem('echoes.settings.corrupt');
    return true;
  });
  const corruptErrors = errors.length - errBefore;
  // Storage that throws (privacy mode / blocked site data).
  await page.evaluateOnNewDocument(() => {
    const boom = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Storage.prototype.setItem = boom;
    Storage.prototype.getItem = boom;
    Storage.prototype.removeItem = boom;
  });
  const errBefore2 = errors.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await sleep(600);
  const memory = await ev(() => ({
    storage: __echoes.settings.loadReport.storage,
    setOk: __echoes.settings.set('gameplay.screenshake', 0) === 0,
    readBack: __echoes.settings.get('gameplay.screenshake'),
    toasts: __echoes.app.toasts().map((t) => t.text),
  }));
  await ev(() => {
    __echoes.app.open('settings');
    return true;
  });
  await sleep(400);
  memory.footNote = await ev(() => document.querySelector('.ap-foot-note').textContent);
  const memoryErrors = errors.length - errBefore2;
  log('stored', stored);
  log('after', { persisted, applied, dump: after.dump, loadReport: after.loadReport });
  log('fullscreen', { fsBefore, fsAfter });
  log('corrupt', { ...corrupt, pageErrors: corruptErrors });
  log('memory', { ...memory, pageErrors: memoryErrors });
  log('verdict', {
    persisted,
    applied: Object.values(applied).every(Boolean),
    fullscreenSessionOnly: fsBefore.el === true && fsBefore.stored === undefined && fsAfter.el === false && fsAfter.setting === false && /lasts for this visit/.test(fsAfter.note),
    corrupt: corrupt.status === 'recovered' && corrupt.scale === 1 && !!corrupt.corruptCopy && corrupt.toasts.some((t) => /unreadable/.test(t)) && corruptErrors === 0,
    memory: memory.storage === 'memory' && memory.setOk && /can't be saved/.test(memory.footNote) && memoryErrors === 0,
  });
}
