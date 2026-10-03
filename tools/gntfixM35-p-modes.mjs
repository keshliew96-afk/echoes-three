// gntfixM35 copy of tools/gntPARTY-modes.mjs (PARTY's probe, logic unchanged) — outputs renamed to captures/gntfixM35/party-* so the owner's evidence stays intact.
// PARTY GP.12: the Ally-builds modes are real — measured by REAL input on the
// running game (the production preview):
//   Suggested — ONE Enter commits the page (AI-held cards open pre-decided),
//               AI-held benches auto-filled at commit;
//   Manual    — FOUR focus stops (Enter walks every card), nothing
//               pre-decided, ally benches untouched at commit;
//   Automatic — ONE Enter, no ally tab stop, the summary line on the page,
//               ally shop buys made when the shelf opens;
//   "Socket my new nodes" On fills the Healer's own bench at commit, Off
//   leaves it;
//   Shop in Suggested: view every tab (E), then Advance on the Healer's lamp
//   → every AI-held tab's still-marked buys happen (purses drop by their
//   prices); a card un-marked by a click on its ribbon is not bought; a tab
//   the player bought on keeps only the player's buys.
//   node tools/gntPARTY-modes.mjs [--url http://127.0.0.1:4400/]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const BASE = opt('url', 'http://127.0.0.1:4400/');
const results = [];
function check(name, pass, got = null) {
  results.push({ name, pass: !!pass, got });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + JSON.stringify(got).slice(0, 500)}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function toPage(page) {
  await page.evaluate(() => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await sleep(1200);
  await page.evaluate(() => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await page.waitForFunction(() => window.__echoes.runUi().screen === 'draft', { timeout: 20000 });
  await sleep(500); // past the settle window
}
const pageState = (page) => page.evaluate(() => { const v = window.__echoes.state().run; return { phase: v.phase, party: v.party ? { mode: v.party.mode, cards: v.party.cards.map((c) => ({ seat: c.seat, decided: c.decided, type: c.type, id: c.id })) } : null, benches: [1, 2, 3].map((s) => window.__echoes.cmd('partyView', s).bench.length), filled: [1, 2, 3].map((s) => window.__echoes.cmd('partyView', s).filled), healerBench: window.__echoes.cmd('buildView').bench.length }; });
async function entersToCommit(page) {
  let n = 0;
  for (; n < 8; n++) {
    const ph = await page.evaluate(() => window.__echoes.state().run.phase);
    if (ph !== 'reward') break;
    await page.keyboard.press('Enter');
    await sleep(420); // each switch restarts the settle window
  }
  return n;
}

const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
let errors = [];
try {
  for (const mode of ['suggest', 'manual', 'auto']) {
    const { page, errors: errs } = await openEchoes(browser, `${BASE}?menu=0&seed=7&party=${mode}`, { width: 1600, height: 900 });
    errors = errors.concat(errs);
    await waitReady(page, { minTick: 120 });
    await page.bringToFront();
    await toPage(page);
    const s0 = await pageState(page);
    const txt = await page.evaluate(() => document.querySelector('.rn-draft').textContent.replace(/\s+/g, ' '));
    const pre = s0.party ? s0.party.cards.filter((c) => c.seat > 0 && c.decided).length : null;
    const n = await entersToCommit(page);
    await sleep(600);
    const s1 = await pageState(page);
    const gained = s1.filled.map((f, i) => f - s0.filled[i]);
    if (mode === 'suggest') {
      check(`Suggested: the ally cards open pre-decided (${pre}/3), ONE Enter commits (${n})`, pre === 3 && n === 1, { pre, n });
      check(`Suggested: AI-held benches auto-filled at commit (benches ${JSON.stringify(s1.benches)}, sockets +${JSON.stringify(gained)})`, s1.benches.every((b) => b === 0) && gained.some((g) => g > 0), { s0, s1 });
    } else if (mode === 'manual') {
      check(`Manual: nothing pre-decided (${pre}/3), FOUR focus stops to commit (${n})`, pre === 0 && n === 4, { pre, n });
      check(`Manual: ally benches untouched at commit (benches ${JSON.stringify(s0.benches)} → ${JSON.stringify(s1.benches)}, sockets +${JSON.stringify(gained)})`, gained.every((g) => g === 0) && s1.benches.some((b, i) => b >= s0.benches[i]), { s0, s1 });
    } else {
      check(`Automatic: ONE Enter (${n}), the summary line on the page ("${(txt.match(/[^.]*builds? themselves[^.]*|[^.]*automatic[^.]*/i) || [''])[0].slice(0, 80)}")`, n === 1 && /automatic|build themselves|auto/i.test(txt), { n, txt: txt.slice(0, 300) });
      // The shop: ally buys at open.
      await page.evaluate(() => { window.__echoes.cmd('skipToRoom', 7); return 1; });
      await page.waitForFunction(() => window.__echoes.runUi().screen === 'shop', { timeout: 20000 });
      await sleep(400);
      const shop = await page.evaluate(() => { const ps = window.__echoes.state().run.partyShop; return ps.shelves.slice(1).map((s) => s.stock.filter((c) => c.sold).length); });
      check(`Automatic: the ally shelves buy when the shop opens (sold ${JSON.stringify(shop)})`, shop.some((x) => x > 0), shop);
    }
    await page.close();
  }
  // ---------------------------------------------- Socket my new nodes --
  for (const on of [false, true]) {
    const { page, errors: errs } = await openEchoes(browser, `${BASE}?menu=0&seed=7`, { width: 1600, height: 900 });
    errors = errors.concat(errs);
    await waitReady(page, { minTick: 120 });
    await page.bringToFront();
    await page.evaluate((v) => { window.__echoes.settings.set('gameplay.autoSocketOwn', v); return 1; }, on);
    // Room 1 promises a skill; walk to a node room (room 2 promises the door's reward) — use the page as is.
    await toPage(page);
    const s0 = await pageState(page);
    await page.keyboard.press('Enter');
    await sleep(800);
    // The socket screen may have chained open on a node: close it.
    await page.keyboard.press('Escape');
    await sleep(300);
    const s1 = await pageState(page);
    check(`"Socket my new nodes" ${on ? 'On' : 'Off'}: the Healer's bench at commit ${s0.healerBench} → ${s1.healerBench} (${on ? 'filled' : 'left on the bench'})`, on ? s1.healerBench === 0 : s1.healerBench >= s0.healerBench && s1.healerBench > 0, { s0, s1 });
    await page.close();
  }
  // ------------------------------------------------- shop in Suggested --
  {
    const { page, errors: errs } = await openEchoes(browser, `${BASE}?menu=0&seed=7&party=suggest`, { width: 1600, height: 900 });
    errors = errors.concat(errs);
    await waitReady(page, { minTick: 120 });
    await page.bringToFront();
    await page.evaluate(() => { const E = window.__echoes; E.cmd('startRun', { act: 1 }); return 1; });
    await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
    await page.evaluate(() => { window.__echoes.cmd('skipToRoom', 7); return 1; });
    await page.waitForFunction(() => window.__echoes.runUi().screen === 'shop', { timeout: 20000 });
    await sleep(500);
    const before = await page.evaluate(() => { const ps = window.__echoes.state().run.partyShop; return ps.shelves.slice(1).map((s) => ({ seat: s.seat, purse: s.purse, marked: s.stock.map((c, i) => (c.marked ? i : -1)).filter((i) => i >= 0), prices: s.stock.map((c) => c.price) })); });
    // View every tab by E (viewing never cancels a mark).
    for (let k = 0; k < 4; k++) {
      await page.keyboard.press('KeyE');
      await sleep(250);
    }
    // Tank tab: un-mark its first marked card by a click on the ribbon.
    await page.keyboard.press('F2');
    await sleep(350);
    const unmark = before[0].marked[0];
    const rib = await page.evaluate((i) => { const r = [...document.querySelectorAll('.rn-shop .rn-suggest')].find((x) => Number(x.dataset.idx) === i && x.offsetParent); if (!r) return null; const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, unmark);
    if (rib) await page.mouse.click(rib.x, rib.y);
    await sleep(250);
    // Swordsman tab: the player buys its cheapest card (Digit key).
    await page.keyboard.press('F3');
    await sleep(350);
    const sw = before[1];
    const cheapest = sw.prices.indexOf(Math.min(...sw.prices));
    await page.keyboard.press(`Digit${cheapest + 1}`);
    await sleep(900);
    // Advance on the Healer's lamp.
    await page.keyboard.press('F1');
    await sleep(350);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__echoes.state().run.phase !== 'shop', { timeout: 15000 });
    const after = await page.evaluate(() => [1, 2, 3].map((s) => ({ seat: s, purse: window.__echoes.cmd('partyView', s).purse, bench: window.__echoes.cmd('partyView', s).bench.length, filled: window.__echoes.cmd('partyView', s).filled })));
    const spent = before.map((b, i) => b.purse - after[i].purse);
    const tankWant = before[0].marked.filter((i) => i !== unmark).reduce((a, i) => a + before[0].prices[i], 0);
    const archerWant = before[2].marked.reduce((a, i) => a + before[2].prices[i], 0);
    check(`shop (Suggested): after viewing every tab, Advance buys the still-marked cards — Tank spent ${spent[0]} (marked minus the un-marked one = ${tankWant}), Archer ${spent[2]} (= ${archerWant})`, spent[0] === tankWant && spent[2] === archerWant, { before, after, spent, unmark });
    check(`shop (Suggested): the tab the player bought on keeps only the player's buy (Swordsman spent ${spent[1]} = its cheapest ${sw.prices[cheapest]})`, spent[1] === sw.prices[cheapest], { before: sw, after: after[1] });
    await page.close();
  }
} finally {
  await browser.close();
}
check('no page errors', errors.length === 0, errors.slice(0, 5));
mkdirSync('captures', { recursive: true });
writeFileSync('captures/gntfixM35/party-modes.json', JSON.stringify({ tool: 'gntPARTY-modes', results }, null, 1));
const failed = results.filter((r) => !r.pass);
console.log(`${results.length - failed.length}/${results.length} checks pass`);
process.exit(failed.length ? 1 : 0);
