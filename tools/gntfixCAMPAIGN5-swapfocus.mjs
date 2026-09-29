// gntfixCAMPAIGN5 — fix builder r5 (own file): F3 — on a full-slot SWAP offer, what does the confirm commit after
// the player picks the skill to replace? (critic: Enter declined whenever the AI suggestion was Leave.)
// Per seed: ?level=2&seed=S&fresh=1 (the Level-2 starter grant gives the Healer 4 skills), room 1 finished by cmd
// killAllEnemies, then REAL input only on the party page's Healer swap card:
//   key   : W/S to replace slot 2 (index 1), Enter
//   arrow : ArrowUp/ArrowDown to slot 2, Enter
//   mouse : click the slot-2 tile, Enter
//   wheel : mouse wheel over the tile row to slot 2, Enter
//   pad   : D-pad down to slot 2, A (mocked standard gamepad)
//   click : click the slot-2 tile, then CLICK "Take · Replace"
//   none  : CONTROL — no selector move, Enter (reflexive Enter: must follow the suggestion: Leave keeps the loadout)
//   tabkey: W/S to slot 2, E (to the Tank tab), F1 (back to the Healer), Enter — the pick survives a tab switch
//   xkey  : W/S to slot 2, then X (explicit Leave — must keep the loadout byte-identical)
// Records the suggestion, focus before / after the pick, the committed event (draft_taken / draft_declined), the
// skills before / after, the replaced slot, bench growth and a screenshot of the card with the pick made.
// usage: node tools/gntfixCAMPAIGN5-swapfocus.mjs [--seeds 101,102,103,104,105] [--how key] [--base URL] [--tag x]
import { launchEchoes } from './gnt-arch-browser.mjs';
import fs from 'fs';

const A = {};
for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith('--')) A[process.argv[i].slice(2)] = process.argv[i + 1];
const base = A.base || 'http://127.0.0.1:4365/';
const seeds = (A.seeds || '101,102,103,104,105').split(',').map(Number);
const how = A.how || 'key';
const tag = A.tag || how;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = `captures/gntfixCAMPAIGN5-swapfocus-${tag}`;
const PAD = `(() => {
  const pad = { id: 'gf5 mock (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
  window.__gf5pad = {
    set(i, on) { pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; pad.timestamp = performance.now(); },
    async press(i, ms = 150) { this.set(i, true); await new Promise(r => setTimeout(r, ms)); this.set(i, false); await new Promise(r => setTimeout(r, ms)); },
  };
  navigator.getGamepads = () => [pad, null, null, null];
  window.addEventListener('load', () => { try { const ev = new Event('gamepadconnected'); ev.gamepad = pad; window.dispatchEvent(ev); } catch (e) {} });
})();`;

const R = { base, how, seeds, rows: [] };
const ui = (page) => page.evaluate(() => { const u = window.__echoes.runUi(); const d = u && (u.draft || u.party); return d ? { focus: d.focus, replace: d.replace, swap: d.swap, viewSeat: d.viewSeat } : null; });
const tileCenter = (page, slot) => page.evaluate((slot) => { const e = document.querySelector(`.rn-rep[data-slot="${slot}"][data-seat="0"]`); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, slot);
const btnCenter = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
const buttons = (page) => page.evaluate(() => [...document.querySelectorAll('.rn-draft .rn-btn')].map((b) => { const cs = getComputedStyle(b); return { text: b.textContent, focus: b.classList.contains('rn-focus'), bg: cs.backgroundColor, border: cs.borderColor, color: cs.color, shadow: cs.boxShadow !== 'none' }; }));

const browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: 1600, height: 900 });
try {
  for (const seed of seeds) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    if (how === 'pad') await page.evaluateOnNewDocument(PAD);
    const row = { seed, how };
    try {
      await page.goto(base + `?level=2&seed=${seed}&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.campaign && window.__echoes.tick > 0, { timeout: 180000 });
      await page.waitForFunction(() => { const s = window.__echoes.state(); return s.run.phase === 'combat' && s.run.room === 1 && window.__echoes.app.state === 'playing'; }, { timeout: 90000 });
      await page.evaluate(() => { const E = window.__echoes; window.__gf5ev = []; for (const ty of ['draft_taken', 'draft_declined', 'skill_swapped']) E.on(ty, (e) => window.__gf5ev.push({ ty, e: JSON.stringify(e).slice(0, 240) })); });
      await sleep(800);
      // killAllEnemies until the reward page (a wave that spawns after the first kill would hold the room)
      for (let k = 0; k < 30; k++) { if (await page.evaluate(() => window.__echoes.state().run.phase === 'reward')) break; await page.evaluate(() => window.__echoes.cmd('killAllEnemies')); await sleep(1000); }
      await page.waitForFunction(() => window.__echoes.state().run.phase === 'reward', { timeout: 30000 });
      await sleep(1200);
      row.reward = await page.evaluate(() => { const r = window.__echoes.state().run.reward; return r && { type: r.type, id: r.id, swap: r.swap, replace: r.replace, suggest: r.suggest }; });
      const b0 = await page.evaluate(() => { const b = window.__echoes.state().build; return { skills: b.skills.map((k) => k.id), bench: (b.bench || []).length, json: JSON.stringify(b) }; });
      row.skills0 = b0.skills;
      row.bench0 = b0.bench;
      row.ui0 = await ui(page);
      if (!(row.reward && row.reward.swap)) throw new Error('no swap offer on this seed');
      const target = row.ui0.replace === 1 ? 2 : 1; // always MOVE the selector (to slot index `target`)
      row.target = target;
      if (how === 'key' || how === 'xkey' || how === 'arrow' || how === 'tabkey') {
        const [up, down] = how === 'arrow' ? ['ArrowUp', 'ArrowDown'] : ['KeyW', 'KeyS'];
        for (let i = 0; i < 4 && (await ui(page)).replace !== target; i++) { await page.keyboard.press((await ui(page)).replace > target ? up : down); await sleep(300); }
      } else if (how === 'mouse' || how === 'click') {
        const c = await tileCenter(page, target);
        row.tile = c;
        if (c) { await page.mouse.click(c.x, c.y); await sleep(400); }
      } else if (how === 'wheel') {
        const c = await tileCenter(page, target);
        if (c) { await page.mouse.move(c.x, c.y); for (let i = 0; i < 4 && (await ui(page)).replace !== target; i++) { await page.mouse.wheel({ deltaY: (await ui(page)).replace > target ? -120 : 120 }); await sleep(300); } }
      } else if (how === 'pad') {
        for (let i = 0; i < 4 && (await ui(page)).replace !== target; i++) { await page.evaluate((b) => window.__gf5pad.press(b, 160), (await ui(page)).replace > target ? 12 : 13); await sleep(300); }
      }
      if (how === 'tabkey') { await page.keyboard.press('KeyE'); await sleep(400); row.uiTab = await ui(page); await page.keyboard.press('F1'); await sleep(400); }
      row.ui1 = await ui(page);
      row.buttons = await buttons(page);
      await page.screenshot({ path: `${OUT}-s${seed}.png` });
      if (how === 'pad') await page.evaluate(() => window.__gf5pad.press(0, 160));
      else if (how === 'xkey') await page.keyboard.press('KeyX');
      else if (how === 'click') { const c = await btnCenter(page, '.rn-draft .rn-take'); if (c) await page.mouse.click(c.x, c.y); }
      else await page.keyboard.press('Enter');
      await sleep(1200);
      row.events = await page.evaluate(() => window.__gf5ev.filter((x) => !/"seat":[123]/.test(x.e)));
      const b1 = await page.evaluate(() => { const b = window.__echoes.state().build; return { skills: b.skills.map((k) => k.id), bench: (b.bench || []).length, json: JSON.stringify(b) }; });
      row.skills1 = b1.skills;
      row.bench1 = b1.bench;
      row.took = JSON.stringify(row.skills1) !== JSON.stringify(row.skills0);
      row.replacedRight = row.took && row.skills1[target] === row.reward.id && row.skills0.filter((_, i) => i !== target).every((id, k) => row.skills1.filter((_, i) => i !== target)[k] === id);
      row.buildIdentical = b1.json === b0.json;
      row.committed = row.events.length ? row.events[0].ty : null;
    } catch (e) {
      row.fatal = String((e && e.stack) || e).slice(0, 400);
    }
    row.errors = errors.slice();
    R.rows.push(row);
    console.log(JSON.stringify({ seed, suggest: row.reward && row.reward.suggest, ui0: row.ui0, ui1: row.ui1, committed: row.committed, took: row.took, replacedRight: row.replacedRight, same: row.buildIdentical, errors: row.errors.length, fatal: row.fatal }));
    fs.writeFileSync(`${OUT}.json`, JSON.stringify(R, null, 1));
    await ctx.close();
  }
} finally {
  const expectTake = !['none', 'xkey'].includes(how);
  R.summary = {
    rows: R.rows.length,
    swapOffers: R.rows.filter((r) => r.reward && r.reward.swap).length,
    suggestLeave: R.rows.filter((r) => r.reward && (r.reward.suggest === 'leave' || (r.reward.suggest && r.reward.suggest.choice === 'leave'))).length,
    expected: how === 'none' ? 'follows the suggestion' : expectTake ? 'taken (chosen slot replaced)' : 'declined (build identical)',
    ok: R.rows.filter((r) => (how === 'none' ? true : expectTake ? r.replacedRight : r.buildIdentical && r.committed === 'draft_declined')).length,
    pageErrors: R.rows.reduce((a, r) => a + (r.errors || []).length, 0),
  };
  fs.writeFileSync(`${OUT}.json`, JSON.stringify(R, null, 1));
  console.log('SUMMARY', JSON.stringify(R.summary));
  await browser.close();
}
