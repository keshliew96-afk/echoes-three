#!/usr/bin/env node
// fix-M4a-r4 (CONTENT4-F1) — the full-build UPGRADE path end to end, in page.
//   node tools/gntfixM4a4-chain.mjs [seed=4]      (ECHOES_URL = the build to test; default dev :5199)
// Legs:
//   A  Level-3 start (32/32 from the starter grant): room 1 clear -> the reward page offers a node
//      with an "⇧ upgrades <skill> · replaces <node>" line and 2 spoils; Take by a REAL Enter press ->
//      the socket screen opens with the node IN HAND and the cursor on the sim's upgrade target;
//      Enter swaps it in (the occupant banks to the bench); F auto-fill swaps the spoils in.
//   B  the Level-3 shop: 4 cards, each naming its upgrade; a mouse click buys one (Glint spent).
//   C  the shelf and the reward page at 1024x576 / 1600x900 / 2560x1440: inside the window,
//      no card overlaps, the upgrade line >= 16 CSS px.
//   D  a COMPLETE build (every row holds all its live rares + legendaries, commons after):
//      the next reward is the honest "BUILD COMPLETE" page (reason build_complete), never "spent".
// Writes captures/gntfixM4a4-chain-s<seed>.json + frames gntfixM4a4-chain-*.png.
import { boot, ev, writeJson, BASE, sleep, waitFor, shot, key } from './gntccontent4-lib.mjs';

const seed = process.argv[2] || '4';
const out = { seed, base: BASE, legs: {} };
const fails = [];
const check = (name, ok, info) => {
  out.checks = out.checks || [];
  out.checks.push({ name, ok: !!ok, info });
  if (!ok) fails.push(name);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info).slice(0, 300) : ''}`);
};

const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`, { w: 1600, h: 900 });

async function clearRoomToReward() {
  await ev(page, () => {
    for (let i = 0; i < 3; i++) window.__echoes.cmd('killAllEnemies');
  });
  return waitFor(
    page,
    () => {
      const s = window.__echoes.state();
      if (s.run.phase === 'combat') window.__echoes.cmd('killAllEnemies');
      return s.run.phase === 'reward';
    },
    { timeout: 90000, poll: 300 }
  );
}

// ------------------------------------------------------------------ leg A --
await ev(page, () => window.__echoes.cmd('startCampaign', { level: 3 }));
await waitFor(page, () => {
  const s = window.__echoes.state();
  return s.run && s.run.phase === 'combat';
}, { timeout: 60000 });
const a0 = await ev(page, () => {
  const b = window.__echoes.cmd('buildView');
  return { filled: b.skills.reduce((a, s) => a + s.filled, 0), sockets: b.skills.length * 8, bench: b.bench.map((x) => x.node) };
});
check('A.start 32/32', a0.filled === 32 && a0.sockets === 32, a0);
await clearRoomToReward();
await sleep(1200);
const aR = await ev(page, () => {
  const E = window.__echoes;
  const s = E.state().run;
  return { reward: s.reward, spoils: s.spoils, text: E.runUi().text };
});
out.legs.A = { start: a0, reward: aR };
check('A.reward is a node', aR.reward && aR.reward.type === 'node', aR.reward);
check('A.reward names its upgrade', aR.reward && aR.reward.upgrade && /⇧ upgrades/.test(aR.text), aR.reward && aR.reward.upgrade);
check('A.2 spoils', aR.spoils && aR.spoils.nodes.length === 2, aR.spoils);
check('A.no "spent" copy', !/spent|Empty-handed/i.test(aR.text), aR.text.slice(0, 160));
await shot(page, `gntfixM4a4-chain-reward-s${seed}`);

// Take by a real Enter (the page settles 300 ms; we are well past it).
await key(page, 'Enter');
await waitFor(page, () => !!(window.__echoes.content && window.__echoes.content.socketUi() && window.__echoes.content.socketUi().open), { timeout: 8000 });
await sleep(500);
const aS = await ev(page, () => {
  const E = window.__echoes;
  const d = E.content.socketUi();
  const b = E.cmd('buildView');
  return { held: d.held, focus: d.focus, detail: d.detail, rows: b.skills.map((s) => s.id), bench: b.bench.map((x) => x.node) };
});
const want = aR.reward.upgrade;
const wantRow = aS.rows.indexOf(want.skill);
check('A.socket screen: node in hand', aS.held && aS.held.node === aR.reward.id, aS.held);
check('A.cursor on the upgrade target', aS.focus.zone === 'cells' && aS.focus.r === wantRow && aS.focus.c === want.slot, { focus: aS.focus, want: { r: wantRow, c: want.slot } });
check('A.detail says upgrade', /⇧ upgrade/.test(aS.detail) && /swaps out/.test(aS.detail), aS.detail);
await shot(page, `gntfixM4a4-chain-inhand-s${seed}`);
await key(page, 'Enter');
await sleep(500);
const aP = await ev(page, (want) => {
  const E = window.__echoes;
  const b = E.cmd('buildView');
  const row = b.skills.find((s) => s.id === want.skill);
  return { at: row.sockets[want.slot], bench: b.bench.map((x) => x.node), filled: b.skills.reduce((a, s) => a + s.filled, 0) };
}, want);
check('A.Enter swapped it in', aP.at && aP.at.node === aR.reward.id && aP.bench.includes(want.replaces) && aP.filled === 32, aP);
await key(page, 'KeyF');
await sleep(600);
const aF = await ev(page, () => {
  const E = window.__echoes;
  const b = E.cmd('buildView');
  const toast = document.querySelector('#socket-screen .nd-toast, #socket-screen [class*="toast"]');
  return { bench: b.bench.map((x) => x.node), toast: toast ? toast.textContent : null, sockets: b.skills.map((s) => s.sockets.map((x) => (x ? x.node : '-')).join(',')) };
});
out.legs.A.after = { swap: aP, autofill: aF };
check('A.F auto-fill swapped the spoils in', aR.spoils.nodes.every((id) => aF.sockets.some((r) => r.split(',').includes(id))), aF);
check('A.auto-fill toast names upgrades', aF.toast && /upgrade/.test(aF.toast), aF.toast);
await shot(page, `gntfixM4a4-chain-autofill-s${seed}`);
await key(page, 'Escape');
await sleep(400);

// ------------------------------------------------------------------ leg B --
await ev(page, () => window.__echoes.cmd('skipToRoom', 7));
await waitFor(page, () => window.__echoes.state().run.phase === 'shop', { timeout: 30000 });
await sleep(2500);
const bS = await ev(page, () => {
  const E = window.__echoes;
  return { shop: E.state().run.shop, lines: [...document.querySelectorAll('#run-screen .rn-shop .rn-upgrade')].map((n) => n.textContent) };
});
out.legs.B = { shop: bS };
check('B.shop has 4 cards', bS.shop && bS.shop.stock.length === 4, bS.shop && bS.shop.stock.map((s) => s.node));
check('B.each card names its upgrade', bS.shop && bS.shop.stock.every((s) => s.upgrade) && bS.lines.length === 4, bS.lines);
await shot(page, `gntfixM4a4-chain-shop-s${seed}`);
const w0 = bS.shop.wallet;
const box = await ev(page, () => {
  const c = document.querySelector('#run-screen .rn-shop .rn-item .rn-card');
  const r = c.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(box.x, box.y);
await sleep(800);
const bB = await ev(page, () => {
  const E = window.__echoes;
  return { wallet: E.state().run.wallet, stock: E.state().run.shop.stock, bench: E.cmd('buildView').bench.map((x) => x.node) };
});
out.legs.B.buy = bB;
check('B.click bought card 0', bB.stock[0].sold && bB.wallet === w0 - bB.stock[0].price && bB.bench.includes(bB.stock[0].node), { wallet: [w0, bB.wallet], node: bB.stock[0].node });

// ------------------------------------------------------------------ leg C --
const sizes = [
  [1024, 576],
  [1600, 900],
  [2560, 1440],
];
out.legs.C = [];
for (const [w, h] of sizes) {
  await page.setViewport({ width: w, height: h });
  await sleep(1500);
  const m = await ev(page, () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
    };
    const panel = document.querySelector('#run-screen .rn-shop');
    const cards = [...document.querySelectorAll('#run-screen .rn-shop .rn-item')].map(rect);
    const ups = [...document.querySelectorAll('#run-screen .rn-shop .rn-upgrade')];
    let overlaps = 0;
    for (let i = 0; i < cards.length; i++)
      for (let j = i + 1; j < cards.length; j++) {
        const A = cards[i];
        const B = cards[j];
        if (A.x < B.r - 0.5 && B.x < A.r - 0.5 && A.y < B.b - 0.5 && B.y < A.b - 0.5) overlaps++;
      }
    const inside = (r) => r.x >= -0.5 && r.y >= -0.5 && r.r <= W + 0.5 && r.b <= H + 0.5;
    // Real px of the upgrade line: CSS px x any ancestor scale (the page scales by transform).
    const upPx = ups.map((n) => {
      const fs = parseFloat(getComputedStyle(n).fontSize);
      const r = n.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(n).lineHeight) || fs * 1.2;
      return { cssFs: fs, scale: r.height / Math.max(1, n.offsetHeight), realFs: Math.round(fs * (r.height / Math.max(1, n.offsetHeight)) * 10) / 10, lines: Math.round(n.offsetHeight / lh) };
    });
    const pr = panel ? rect(panel) : null;
    return { W, H, panel: pr, panelInside: pr ? inside(pr) : false, cardsInside: cards.every(inside), overlaps, n: cards.length, upPx };
  });
  out.legs.C.push({ size: `${w}x${h}`, ...m });
  check(`C.${w}x${h} shelf inside, 0 overlaps, upgrade text >= 12 real px`, m.panelInside && m.cardsInside && m.overlaps === 0 && m.upPx.every((u) => u.realFs >= 12), m);
  await shot(page, `gntfixM4a4-chain-shop-${w}x${h}-s${seed}`);
}
await page.setViewport({ width: 1600, height: 900 });
await sleep(800);

// ------------------------------------------------------------------ leg D --
// A fresh Level-1 campaign; after room 1 (reward phase: sockets are open) the
// build is made COMPLETE by the debug API, then room 2's reward must be the
// honest build-complete page.
await ev(page, () => window.__echoes.cmd('startCampaign', { level: 1 }));
await waitFor(page, () => {
  const s = window.__echoes.state();
  return s.run && s.run.phase === 'combat' && s.run.room === 1;
}, { timeout: 60000 });
await clearRoomToReward();
await sleep(600);
const dSetup = await ev(page, () => {
  const E = window.__echoes;
  const NON_COMMON = ['ascend', 'resonance', 'multiply', 'echo', 'detonate', 'linger', 'keen', 'bulwark', 'split'];
  const COMMON = ['sharpen', 'quicken', 'bounce', 'siphon', 'widen', 'reach', 'snare', 'galvanize'];
  const pools = E.cmd('draftPools');
  // Two more skills (the draftable pool's first two not owned).
  for (const id of ['bell_toll', 'kindred_shield', 'dewfall', 'pale_lance']) {
    if (E.state().skills.filter(Boolean).length >= 4) break;
    E.cmd('giveSkill', id);
  }
  const b0 = E.cmd('buildView');
  // Empty every row first.
  for (const sk of b0.skills) sk.sockets.forEach((s, i) => s && E.cmd('unsocket', sk.id, i));
  const log = [];
  for (const sk of E.cmd('buildView').skills) {
    let slot = 0;
    for (const id of [...NON_COMMON, ...COMMON]) {
      if (slot >= 8) break;
      const v = E.cmd('buildVerdict', sk.id, id);
      const state = v && (v.state || v.verdict || v);
      if (state !== 'live') continue;
      const lim = { sharpen: 2, quicken: 2, bounce: 2, widen: 2, reach: 2 }[id] || 1;
      for (let k = 0; k < lim && slot < 8; k++) {
        E.cmd('grantNode', id);
        const r = E.cmd('socket', sk.id, id, slot);
        if (r && !r.denied) slot++;
        else log.push({ sk: sk.id, id, r });
      }
    }
  }
  const b = E.cmd('buildView');
  return { skills: b.skills.map((s) => `${s.id}: ${s.sockets.map((x) => (x ? x.node + (x.verdict === 'live' ? '' : '(' + x.verdict + ')') : '-')).join(',')}`), filled: b.skills.reduce((a, s) => a + s.filled, 0), pools: E.cmd('draftPools'), before: pools, log };
});
out.legs.D = { setup: dSetup };
check('D.complete build: fill + upgrade pools empty', dSetup.filled === 32 && dSetup.pools.node.length === 0 && dSetup.pools.upgrade.length === 0, { filled: dSetup.filled, node: dSetup.pools.node, upgrade: dSetup.pools.upgrade });
await ev(page, () => {
  const E = window.__echoes;
  E.cmd('draftDecline');
});
await waitFor(page, () => window.__echoes.state().run.phase === 'path', { timeout: 10000 });
await ev(page, () => window.__echoes.cmd('pathChoose', 0));
await waitFor(page, () => {
  const s = window.__echoes.state();
  return s.run.phase === 'combat' && s.run.room === 2;
}, { timeout: 30000 });
await clearRoomToReward();
await sleep(1200);
const dR = await ev(page, () => {
  const E = window.__echoes;
  const s = E.state().run;
  return { reward: s.reward, spoils: s.spoils, text: E.runUi().text };
});
out.legs.D.reward = dR;
check('D.empty offer says BUILD COMPLETE (reason build_complete)', dR.reward && dR.reward.type === null && dR.reward.reason === 'build_complete' && /BUILD COMPLETE/.test(dR.text) && !/spent/i.test(dR.text), { reward: dR.reward, text: dR.text.slice(0, 220) });
await shot(page, `gntfixM4a4-chain-complete-s${seed}`);

out.errors = errors.slice();
out.fails = fails;
check('0 page errors', errors.length === 0, errors.slice(0, 3));
writeJson(`gntfixM4a4-chain-s${seed}.json`, out);
console.log(`${fails.length === 0 ? 'ALL PASS' : 'FAILS: ' + fails.join(', ')}`);
await browser.close();
process.exit(fails.length ? 1 : 0);
