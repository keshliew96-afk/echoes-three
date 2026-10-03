// What does Level 3 offer a carried build (32/32 sockets)? Autopilot (fast, frozen) through L1 and L2, then real-time L3:
// room-1 clear -> reward page frame + spoils; skip to the shop -> shelf frame; every reward/spoils/shop event in L3.
import { boot, ev, writeJson, BASE, sleep, waitFor, shot } from './gntccontent4-lib.mjs';
const seed = process.argv[2] || '1';
const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`);
const r = { seed };
r.fast = await ev(page, async () => {
  const E = window.__echoes;
  window.__c4 = [];
  E.on('*', (e) => { if (/reward|spoils|node_granted|shop|draft|glint_gain|level_start/.test(e.type)) window.__c4.push({ ...e, level: E.state().run && E.state().run.act }); });
  E.sim.freeze();
  E.cmd('startCampaign', { level: 1 });
  E.cmd('autopilot', true);
  let g = 0;
  while (g++ < 300) { E.sim.stepN(300, null); const st = E.state(); if (st.run.act === 3 && st.run.phase === 'combat') break; if (!st.run.active) break; }
  E.cmd('autopilot', false);
  E.sim.thaw();
  const b = E.cmd('buildView');
  return { level: E.state().run.act, phase: E.state().run.phase, room: E.state().run.room, filled: b.skills.reduce((a, s) => a + s.filled, 0), bench: b.bench.map((x) => x.node), wallet: E.state().run.wallet };
});
console.log('reached', JSON.stringify(r.fast));
await ev(page, () => { const E = window.__echoes; for (let i = 0; i < 3; i++) E.cmd('killAllEnemies'); });
const w = await waitFor(page, () => { const s = window.__echoes.state(); if (s.run.phase === 'combat') window.__echoes.cmd('killAllEnemies'); return s.run.phase === 'reward' || s.run.phase === 'path'; }, { timeout: 90000, poll: 400 });
await sleep(1500);
r.reward = await ev(page, () => { const E = window.__echoes; const u = E.runUi(); return { phase: E.state().run.phase, screen: u.screen, text: u.text, reward: E.state().run.reward, spoils: E.state().run.spoils }; });
await shot(page, `gntfixM4a4-c-l3-reward-s${seed}`);
await ev(page, () => window.__echoes.cmd('skipToRoom', 7));
await sleep(2500);
r.shop = await ev(page, () => { const E = window.__echoes; const u = E.runUi(); return { phase: E.state().run.phase, screen: u.screen, text: u.text, cards: u.cards && u.cards.map((c) => c.name), wallet: E.state().run.wallet, shop: E.state().run.shop }; });
await shot(page, `gntfixM4a4-c-l3-shop-s${seed}`);
r.events = await ev(page, () => window.__c4.filter((e) => e.level === 3 || /level_start/.test(e.type)).slice(-30));
r.errors = errors;
writeJson(`gntfixM4a4-c-l3rewards-s${seed}.json`, r);
console.log(JSON.stringify({ reward: r.reward, shop: r.shop }, null, 1).slice(0, 3000));
console.log('L3 events', JSON.stringify(r.events.map((e) => [e.type, e.room, e.reward || e.nodes || e.id || e.item, e.line])).slice(0, 1500));
await browser.close();
