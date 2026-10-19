// gntccontent5 — full-slot SWAP offers by REAL keys (ruling A17). ?level=2&seed=S: every seat holds 4 skills; room 1
// (a skill room) is finished by cmd killAllEnemies, then only keyboard input:
//   healerS   : S (move Replaces one down), Enter            -> expect the Healer's new skill in the chosen slot
//   healerW2  : W, W, Enter
//   healerX   : X                                             -> expect the loadout / rows / bench byte-identical
//   tankS     : F2 (Tank tab), S, Enter                       -> expect the Tank's chosen skill replaced, its nodes on its bench
//   tankSA    : F2, S, A (focus Take), Enter
// Usage: node tools/gntccontent5-swap.mjs <mode> <seeds a-b>
import { boot, ev, writeJson, BASE, sleep, waitFor, shot, key } from './gntccontent5-lib.mjs';
const mode = process.argv[2] || 'healerS';
const [a, b] = (process.argv[3] || '101-105').split('-').map(Number);
const out = { mode, runs: [] };
const snap = () => {
  const E = window.__echoes;
  const hb = E.cmd('buildView');
  const seat = (k) => { const v = E.cmd('partyView', k); return { slots: v.slots, rows: v.skills.map((s) => s.sockets.map((x) => (x ? x.node : null))), bench: v.bench.map((x) => x.node || x).sort() }; };
  return { t: E.tick, phase: E.state().run.phase, healer: { slots: hb.skills.map((s) => s.id), rows: hb.skills.map((s) => s.sockets.map((x) => (x ? x.node : null))), bench: hb.bench.map((x) => x.node).sort() }, tank: seat(1), sw: seat(2), ar: seat(3), draft: E.runUi().draft, reward: E.state().run.reward };
};
for (let seed = a; seed <= (b || a); seed++) {
  const { browser, page, errors } = await boot(BASE + `?level=2&seed=${seed}`);
  const r = { seed };
  try {
    await waitFor(page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat' && s.run.room === 1; }, { timeout: 90000 });
    await sleep(1200);
    await ev(page, () => { window.__sw = []; window.__echoes.on('*', (e) => { if (/draft_|party_pick|skill_swapped|party_commit|party_offer|reward_offer|node_released|skill_equip|build_autofill|node_socketed|swap/.test(e.type)) window.__sw.push(JSON.parse(JSON.stringify(e))); }); window.__echoes.cmd('killAllEnemies'); });
    r.w = await waitFor(page, () => window.__echoes.state().run.phase === 'reward', { timeout: 30000 });
    await sleep(1500);
    r.before = await ev(page, snap);
    const seq = { healerS: ['KeyS'], healerW2: ['KeyW', 'KeyW'], healerX: [], tankS: ['F2', 'KeyS'], tankSA: ['F2', 'KeyS', 'KeyA'], tankSthenH: ['F2', 'KeyS', 'Enter'], tankSAthenX: ['F2', 'KeyS', 'KeyA', 'Enter'], healerSA: ['KeyS', 'KeyA'] }[mode];
    for (const k of seq) { await key(page, k); await sleep(k === 'F2' ? 700 : 350); }
    r.mid = await ev(page, () => ({ draft: window.__echoes.runUi().draft, buttons: window.__echoes.runUi().buttons, focusEl: document.activeElement && (document.activeElement.textContent || '').trim().slice(0, 40) }));
    await shot(page, `gntfixM4a5-swap-${mode}-s${seed}-pre`);
    await key(page, mode === 'healerX' || mode === 'tankSAthenX' ? 'KeyX' : 'Enter');
    await sleep(1500);
    r.card1 = await ev(page, () => { const pg = window.__echoes.cmd('partyPage'); return { phase: window.__echoes.state().run.phase, cards: pg && pg.cards ? pg.cards.map((c) => ({ seat: c.seat, decided: c.decided, choice: c.choice, replace: c.replace, by: c.by, id: c.id })) : null }; });
    r.after = await ev(page, snap);
    r.events = await ev(page, () => window.__sw.filter((e) => !/reward_offer|party_offer/.test(e.type)).slice(0, 30));
    await shot(page, `gntfixM4a5-swap-${mode}-s${seed}-post`);
  } catch (e) { r.err = String(e).slice(0, 300); }
  r.errors = errors.slice();
  out.runs.push(r);
  const d0 = r.before && r.before.draft, d1 = r.mid && r.mid.draft;
  const types = (r.events || []).map((e) => e.type + (e.seat != null ? '@' + e.seat : '') + (e.replaced ? '<' + e.replaced : '') + (e.by ? '/' + e.by : ''));
  console.log(`card1 ${JSON.stringify(r.card1)}`);
  console.log(`seed ${seed} suggest ${r.before && r.before.reward && r.before.reward.suggest} replace ${d0 && d0.replace}->${d1 && d1.replace} focus ${d0 && d0.focus}->${d1 && d1.focus} view ${d1 && d1.viewSeat} | ${types.join(' ')} | healer ${JSON.stringify(r.before && r.before.healer.slots)} -> ${JSON.stringify(r.after && r.after.healer.slots)} | tank ${JSON.stringify(r.before && r.before.tank.slots)} -> ${JSON.stringify(r.after && r.after.tank.slots)} errors ${r.errors.length} ${r.err || ''}`);
  await browser.close();
}
writeJson(`gntfixM4a5-swap-${mode}.json`, out);
