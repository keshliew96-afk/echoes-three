#!/usr/bin/env node
// GI.1 "no dead end" sweep (docs/gauntlet/PLAN.md §7 INT). Owner: INT.
//
// Every screen a player can reach is opened BY REAL INPUT and left again by
// the back key, from both entry points that exist in this game — the title and
// the in-game pause menu. After each step the sweep asserts the stack is what
// it should be, that exactly one focus ring is visible, and that the focus the
// screen was opened from came back.
//
//   node tools/gntINT-deadends.mjs [--url http://127.0.0.1:5199] [--out f]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5199');
const outPath = arg('out', 'captures/gntINT-deadends.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
let failures = 0;
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ''}`);
}
const st = (page) =>
  page.evaluate(() => ({
    state: window.__echoes.app.state,
    stack: window.__echoes.app.stack(),
    focus: (window.__echoes.app.focus() || {}).id ?? null,
    rings: window.__echoes.app.ringCount(),
  }));
const press = async (page, key, times = 1, gap = 120) => {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await sleep(gap);
  }
};
async function navTo(page, id, max = 24) {
  const cur = async () => (await st(page)).focus;
  if ((await cur()) === id) return true;
  for (let i = 0; i < max; i++) {
    await press(page, 'ArrowDown');
    if ((await cur()) === id) return true;
  }
  for (let i = 0; i < max; i++) {
    await press(page, 'ArrowUp');
    if ((await cur()) === id) return true;
  }
  return false;
}
async function waitFor(page, body, { timeout = 20000, every = 140 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return true;
    await sleep(every);
  }
  return false;
}

// open `itemId` from the current screen, expect `screenId`, then come back.
async function roundTrip(page, label, itemId, screenId, backKey = 'Escape') {
  const from = await st(page);
  const found = await navTo(page, itemId);
  await press(page, 'Enter');
  const opened = await waitFor(page, `window.__echoes.app.stack().includes(${JSON.stringify(screenId)})`, { timeout: 12000 });
  const inside = await st(page);
  await press(page, backKey);
  const closed = await waitFor(page, `!window.__echoes.app.stack().includes(${JSON.stringify(screenId)})`, { timeout: 12000 });
  await sleep(400);
  const back = await st(page);
  check(
    `${label}: open -> ${screenId} -> back, focus restored`,
    found && opened && closed && inside.rings === 1 && back.rings === 1 && back.stack.join() === from.stack.join() && back.focus === itemId,
    { from: from.stack, inside: { stack: inside.stack, rings: inside.rings, focus: inside.focus }, back }
  );
  return opened && closed;
}

const browser = await launchEchoes({ gpu: true });
try {
  // A save must exist first, or Load / Continue / Records are honest dead
  // items (disabled with a reason) and there is nothing to sweep.
  const { page, errors } = await openEchoes(browser, `${base}/?fresh=1&menu=0&seed=7`);
  await waitFor(page, `window.__echoes.tick>120`, { timeout: 60000 });
  await press(page, 'F5'); // quicksave
  await sleep(1500);
  const saved = await page.evaluate(() => window.__echoes.save.list().length);
  check('S0 a quicksave exists to sweep with', saved > 0, { slots: saved });

  // Pause -> every sub-screen and back.
  await press(page, 'Escape');
  await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
  check('S1 pause opened from the camp', (await st(page)).stack.join() === 'pause');
  await roundTrip(page, 'S2 pause > Settings', 'pz-settings', 'settings');
  await roundTrip(page, 'S3 pause > Save Game', 'pz-save', 'saves');
  await roundTrip(page, 'S4 pause > Load Game', 'pz-load', 'saves');

  // A settings change made from the pause menu must not strand the player.
  await navTo(page, 'pz-settings');
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('settings')`);
  await navTo(page, 'ap-display-renderScale');
  await press(page, 'ArrowLeft', 3, 150);
  await press(page, 'Escape'); // leaving with an armed change asks Keep/Revert
  const asked = await waitFor(page, `window.__echoes.app.stack().includes('keep-display')`, { timeout: 8000 });
  await navTo(page, 'ap-keep-revert', 6);
  await press(page, 'Enter');
  await sleep(800);
  const afterRevert = await st(page);
  check('S5 Keep/Revert from the pause > Settings path returns to the pause menu', asked && afterRevert.stack.join() === 'pause' && afterRevert.rings === 1, afterRevert);
  const reverted = await page.evaluate(() => window.__echoes.settings.get('display.renderScale'));
  check('S6 Revert put the render scale back', reverted === 1, { renderScale: reverted });

  // Resume -> the game is live again.
  await navTo(page, 'pz-resume');
  await press(page, 'Enter');
  await waitFor(page, `!window.__echoes.app.stack().includes('pause')`);
  const t0 = await page.evaluate(() => window.__echoes.tick);
  await sleep(700);
  const t1 = await page.evaluate(() => window.__echoes.tick);
  check('S7 Resume gives the game back', t1 > t0, { t0, t1 });

  // Quit to title, then sweep the title.
  await press(page, 'Escape');
  await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
  await navTo(page, 'pz-quit');
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('confirm')`);
  await navTo(page, 'ap-confirm-ok');
  await press(page, 'Enter');
  check('S8 quit to title', await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 }), await st(page));

  await roundTrip(page, 'S9 title > Settings', 'ap-title-settings', 'settings');
  await roundTrip(page, 'S10 title > Load Game', 'ap-title-load', 'saves');
  await roundTrip(page, 'S11 title > Records', 'ap-title-records', 'records');
  await roundTrip(page, 'S12 title > Multiplayer', 'ap-title-multiplayer', 'mp-menu');

  // Every settings tab reachable and non-empty, back always one level.
  await navTo(page, 'ap-title-settings');
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('settings')`);
  const tabs = [];
  for (let i = 0; i < 6; i++) {
    const t = await page.evaluate(() => {
      const el = document.querySelector('.ap-settings .ap-tab.ap-active');
      const body = document.querySelector('.ap-tabbody.ap-active');
      return {
        tab: el ? el.textContent.trim() : null,
        rows: body ? body.querySelectorAll('[data-nav]').length : 0,
        text: body ? (body.textContent || '').trim().length : 0,
        rings: window.__echoes.app.ringCount(),
        focus: (window.__echoes.app.focus() || {}).id ?? null,
      };
    });
    if (t.tab && !tabs.some((x) => x.tab === t.tab)) tabs.push(t);
    await press(page, 'PageDown');
    await sleep(350);
  }
  // Controls is a READ-ONLY reference tab (PLAN §3.2: rebinding is out of
  // scope this iteration), so it legitimately has no adjustable rows — but it
  // must still carry content and leave exactly one focus ring on the screen.
  check(
    'S13 every settings tab opens with content and one focus ring',
    tabs.length >= 5 && tabs.every((t) => (t.rows > 0 || (t.tab === 'Controls' && t.text > 200)) && t.rings === 1 && t.focus),
    tabs
  );
  await press(page, 'Escape');
  await waitFor(page, `!window.__echoes.app.stack().includes('settings')`);
  check('S14 Escape leaves Settings to the title', (await st(page)).stack.join() === 'title');

  // Exit: Cancel must come back; Confirm must land on the honest farewell card
  // (a page script may not close a tab it did not open) and Return must work.
  await navTo(page, 'ap-title-exit');
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('confirm')`);
  await navTo(page, 'ap-confirm-cancel', 6);
  await press(page, 'Enter');
  await sleep(700);
  check('S15 Exit > Cancel returns to the title', (await st(page)).stack.join() === 'title' && (await st(page)).rings === 1, await st(page));
  await navTo(page, 'ap-title-exit');
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.stack().includes('confirm')`);
  await navTo(page, 'ap-confirm-ok', 6);
  await press(page, 'Enter');
  const farewell = await waitFor(page, `window.__echoes.app.state==='farewell'`, { timeout: 12000 });
  check('S16 Exit > Confirm shows the honest farewell card', farewell, await st(page));
  await press(page, 'Enter'); // Return to Title
  const returned = await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 12000 });
  check('S17 farewell > Return to Title', returned && (await st(page)).rings === 1, await st(page));

  check('Z no page errors during the sweep', errors.length === 0, errors.slice(0, 5));
} finally {
  await browser.close();
}
mkdirSync(join(root, dirname(outPath)), { recursive: true });
writeFileSync(join(root, outPath), JSON.stringify({ schema: 'gntINT-deadends/1', at: new Date().toISOString(), base, failures, checks }, null, 1));
console.log(`\n${checks.length - failures}/${checks.length} checks passed -> ${outPath}`);
process.exit(failures ? 1 : 0);
