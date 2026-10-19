// fix-M1-r6 (MENU-R6-F1) probe — Settings > Display mode with a gamepad, keys and the mouse.
// Parts A / B are the menu critic r6 sequences (tools/gntcmenu6-padfs.mjs / -padfs2.mjs) with
// renamed outputs; part C adds the cases the fix must also hold:
//   C1 a pad press with NO user activation (driven from a page-side timer >= 6 s after the last
//      puppeteer evaluate) keeps the chip on the real state and shows the gamepad note
//   C2 a click on the chip with the pointer already resting there (no pointer motion after the
//      pad) enters fullscreen on the first try
//   C3 pad A while fullscreen leaves fullscreen (exiting needs no gesture)
//   C4 keyboard Enter right after pad presses enters on the first try, Enter again leaves
// A per-frame sampler counts every rendered frame whose chip text differs from the real state
// (document.fullscreenElement) — "lie frames" — and the longest such run.
// Usage: [ECHOES_URL=<base>/] node tools/gntfixM16-padfs.mjs [--tag before|after]
import sharp from 'sharp';
import { launch, logger, sleep, CAP, URL_BASE, reachTitle, installGamepad, padTap } from './gntcmenu6-lib.mjs';

const tagIdx = process.argv.indexOf('--tag');
const TAG = tagIdx > 0 ? process.argv[tagIdx + 1] : 'run';
const NAME = `gntfixM16-padfs-${TAG}`;
const log = logger(NAME);
const browser = await launch({});
let fails = 0;
const expect = (label, cond, detail) => {
  if (!cond) fails++;
  log(`${cond ? 'PASS' : 'FAIL'} ${label}`, detail || '');
};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  let ok = false;
  for (let i = 0; i < 3 && !ok; i++) {
    try {
      await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
      await reachTitle(page);
      ok = true;
    } catch (e) {
      log('boot retry', String(e.message || e));
      await sleep(2000);
    }
  }
  if (!ok) throw new Error('could not reach the title');
  log('version', await page.evaluate(() => window.__echoes.version));
  await installGamepad(page);
  // Per-frame truth sampler (rAF): chip text vs document.fullscreenElement.
  await page.evaluate(() => {
    const S = (window.__m16 = { frames: 0, lie: 0, run: 0, maxRun: 0, lieSamples: [] });
    const tick = () => {
      const v = document.getElementById('ap-display-mode');
      if (v) {
        S.frames++;
        const shows = v.textContent.trim() === 'Fullscreen (browser)';
        const real = !!document.fullscreenElement;
        if (shows !== real) {
          S.lie++;
          S.run++;
          if (S.run > S.maxRun) S.maxRun = S.run;
          if (S.lieSamples.length < 12) S.lieSamples.push({ t: Math.round(performance.now()), shows, real, store: window.__echoes.settings.get('display.fullscreen') });
        } else S.run = 0;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>') }; });
  const st = async (label) => {
    const s = await page.evaluate(() => {
      const r = document.querySelector('[data-row-id="ap-display-mode"]');
      const v = document.getElementById('ap-display-mode');
      return {
        value: v ? v.textContent.trim() : null,
        note: r ? (r.querySelector('.ap-note') || {}).textContent : null,
        fsEl: !!document.fullscreenElement,
        set: window.__echoes.settings.get('display.fullscreen'),
        focus: window.__echoes.app.focus().id,
        stack: window.__echoes.app.stack().join('>'),
        src: window.__echoes.app.lastSource ? window.__echoes.app.lastSource() : null,
        lie: window.__m16.lie,
      };
    });
    const file = `${CAP}/${NAME}-${label}.png`;
    await page.screenshot({ path: file });
    const r = await page.evaluate(() => { const e = document.querySelector('[data-row-id="ap-display-mode"]'); const b = e.getBoundingClientRect(); return [Math.floor(b.x), Math.floor(b.y), Math.ceil(b.width), Math.ceil(b.height)]; });
    await sharp(file).extract({ left: r[0], top: r[1], width: r[2], height: r[3] }).toFile(`${CAP}/${NAME}-${label}-row.png`);
    log(label, s);
    return s;
  };
  const truthful = (s) => (s.value === 'Fullscreen (browser)') === s.fsEl;
  const exitFs = async () => {
    if (await page.evaluate(() => !!document.fullscreenElement)) {
      await page.evaluate(() => document.exitFullscreen());
      await sleep(500);
    }
  };

  // ---------------------------------------------------------------- A --
  log('--- A: critic padfs sequence');
  for (let i = 0; i < 8 && (await F()).id !== 'ap-title-settings'; i++) { await padTap(page, 13); await sleep(120); }
  await padTap(page, 0); await sleep(700);
  await padTap(page, 13); await sleep(200);
  let s = await st('A0-focused');
  expect('A0 focus on Display mode', s.focus === 'ap-display-mode', s.focus);
  for (const [lab, btn] of [['A1-padA', 0], ['A2-padA', 0], ['A3-padA', 0], ['A4-dpadRight', 15], ['A5-dpadRight', 15]]) {
    await padTap(page, btn); await sleep(500);
    s = await st(lab);
    expect(`${lab} chip matches the real state (windowed)`, truthful(s) && s.value === 'Windowed' && !s.fsEl, s.value);
    expect(`${lab} gamepad note shown`, /gamepad button/.test(s.note || ''), s.note);
  }
  await page.keyboard.press('Enter'); await sleep(700);
  s = await st('A6-keyEnter');
  expect('A6 first keyboard Enter after pad presses enters fullscreen', s.fsEl && s.value === 'Fullscreen (browser)', { fsEl: s.fsEl, value: s.value });
  await page.keyboard.press('Enter'); await sleep(700);
  s = await st('A7-keyEnter');
  expect('A7 second Enter leaves fullscreen', !s.fsEl && s.value === 'Windowed', { fsEl: s.fsEl, value: s.value });
  await exitFs();
  { const x = await page.evaluate(() => window.__echoes.app.stack().join('>')); if (/keep-display/.test(x)) log('A keep-display open', x); }

  // ---------------------------------------------------------------- B --
  log('--- B: critic padfs2 sequence (mouse)');
  await padTap(page, 0); await sleep(500);
  s = await st('B1-padA');
  expect('B1 pad A keeps Windowed', truthful(s) && !s.fsEl && s.value === 'Windowed', s.value);
  const vb = await page.evaluate(() => { const r = document.getElementById('ap-display-mode').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.click(vb[0], vb[1]); await sleep(700);
  s = await st('B2-clickValue');
  expect('B2 click on the chip enters fullscreen on the first try', s.fsEl && s.value === 'Fullscreen (browser)', { fsEl: s.fsEl, value: s.value });
  await exitFs();
  s = await st('B2b-exited');
  expect('B2b external exit mirrored', !s.fsEl && s.value === 'Windowed', s.value);
  await padTap(page, 0); await sleep(500);
  s = await st('B3-padA');
  expect('B3 pad A keeps Windowed', truthful(s) && !s.fsEl, s.value);
  const nb = await page.evaluate(() => { const r = document.querySelector('[data-row-id="ap-display-mode"] .ap-next').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.click(nb[0], nb[1]); await sleep(700);
  s = await st('B4-clickNext');
  expect('B4 click on the next arrow enters fullscreen on the first try', s.fsEl && s.value === 'Fullscreen (browser)', { fsEl: s.fsEl, value: s.value });
  await exitFs();
  await padTap(page, 0); await sleep(500);
  s = await st('B6-padA');
  expect('B6 pad A keeps Windowed', truthful(s) && !s.fsEl, s.value);

  // ---------------------------------------------------------------- C --
  log('--- C1: pad press with no user activation (page-side timer, >= 6 s after the last evaluate)');
  await page.evaluate(() => {
    window.__m16act = null;
    setTimeout(() => {
      window.__m16act = { before: navigator.userActivation ? navigator.userActivation.isActive : null };
      window.__gcPress(0, true);
      setTimeout(() => window.__gcPress(0, false), 80);
    }, 6500);
  });
  await sleep(8000);
  const act = await page.evaluate(() => window.__m16act);
  s = await st('C1-padA-noActivation');
  expect('C1 pad A without activation keeps the real state + the note', truthful(s) && !s.fsEl && /gamepad button/.test(s.note || ''), { act, value: s.value, note: s.note });

  log('--- C2: click with the pointer already resting on the chip (no motion since the pad)');
  // Rest the pointer on the chip, then use the pad, then click without moving.
  await page.mouse.move(vb[0], vb[1]); await sleep(200);
  await padTap(page, 0); await sleep(500);
  s = await st('C2a-padA');
  expect('C2a pad A keeps Windowed', truthful(s) && !s.fsEl, { value: s.value, src: s.src });
  await page.mouse.down(); await page.mouse.up(); await sleep(700);
  s = await st('C2b-clickNoMove');
  expect('C2b resting-pointer click enters fullscreen on the first try', s.fsEl && s.value === 'Fullscreen (browser)', { fsEl: s.fsEl, value: s.value });

  log('--- C3: pad A while fullscreen leaves it');
  if (!s.fsEl) { await page.keyboard.press('Enter'); await sleep(700); }
  await padTap(page, 0); await sleep(700);
  s = await st('C3-padA-inFullscreen');
  expect('C3 pad A in fullscreen leaves fullscreen', !s.fsEl && s.value === 'Windowed', { fsEl: s.fsEl, value: s.value });
  await exitFs();

  log('--- C4: keyboard Enter right after pad presses');
  await padTap(page, 15); await sleep(300); await padTap(page, 14); await sleep(300);
  await page.keyboard.press('Enter'); await sleep(700);
  s = await st('C4a-keyEnter');
  expect('C4a Enter enters on the first try', s.fsEl && s.value === 'Fullscreen (browser)', { fsEl: s.fsEl, value: s.value });
  await page.keyboard.press('Enter'); await sleep(700);
  s = await st('C4b-keyEnter');
  expect('C4b Enter leaves', !s.fsEl && s.value === 'Windowed', { fsEl: s.fsEl, value: s.value });
  await exitFs();
  // Leave Settings cleanly (a keep-display dialog may be up after entering).
  { const x = await page.evaluate(() => window.__echoes.app.stack().join('>')); log('stack at end', x); }

  const m = await page.evaluate(() => window.__m16);
  log('sampler', { frames: m.frames, lieFrames: m.lie, longestLieRunFrames: m.maxRun, samples: m.lieSamples });
  expect('no rendered frame shows a display mode that is not real', m.lie === 0, { lieFrames: m.lie, frames: m.frames });
  const dlog = await page.evaluate(() => (window.__echoes.app.displayLog ? window.__echoes.app.displayLog().slice(-14) : null));
  log('display log tail', dlog);
  log('page errors', errors.length, errors.slice(0, 3));
  if (errors.length) fails++;
  log(`RESULT ${fails === 0 ? 'PASS' : 'FAIL'} fails=${fails}`);
} finally {
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
