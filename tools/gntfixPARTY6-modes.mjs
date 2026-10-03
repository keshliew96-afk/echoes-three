// gntcparty6 — Ally-build modes by real input (?party=suggest|manual|auto): pre-decisions, Enter stops, summary line;
// + the mocked-pad path on a Leave-suggested swap card (D-pad moves Replaces, A commits).
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntcparty6-lib.mjs';
const BASEURL = process.argv[2] || 'http://127.0.0.1:5199/';
const out = { modes: [], pad: [] };
const b = await launch();
try {
  for (const mode of ['suggest', 'manual', 'auto']) {
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=7&party=${mode}`);
    await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(800);
    await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
    const t0 = Date.now();
    await sleep(1300);
    const cards0 = await E(page, () => window.__echoes.state().run.party.cards.map((c) => [c.seat, c.decided, c.choice, c.by]));
    const text = await E(page, () => document.querySelector('.rn-draft').innerText.replace(/\s+/g, ' ').slice(0, 400));
    const benches0 = await E(page, () => [1, 2, 3].map((s) => window.__echoes.cmd('partyView', s).bench.length));
    await shot(page, `gntfixPARTY6-modes-${mode}`);
    let enters = 0; const seats = [];
    for (let i = 0; i < 8; i++) { const s = await E(page, () => window.__echoes.runUi().screen); if (s !== 'draft') break; seats.push(await E(page, () => window.__echoes.runUi().draft.viewSeat)); await page.keyboard.press('Enter'); enters++; await sleep(500); }
    const ms = Date.now() - t0;
    await sleep(500);
    const after = await E(page, () => [1, 2, 3].map((s) => { const v = window.__echoes.cmd('partyView', s); return { bench: v.bench.length, filled: v.filled, slots: v.slots.join(',') }; }));
    const r = { mode, cards0, enters, seats, ms, benches0, after, text, errors: errors.length };
    out.modes.push(r);
    console.log(`${mode}: cards at open ${JSON.stringify(cards0)} | Enter presses to commit ${enters} (viewed seats ${JSON.stringify(seats)}) | benches ${JSON.stringify(benches0)} -> ${JSON.stringify(after.map((a) => a.bench + '/' + a.filled))}`);
    console.log('   text:', text.slice(0, 260));
    await page.close();
  }
  // pad path on a Leave-suggested Tank swap card
  {
    const { page } = await open(b, `${BASEURL}?menu=0&seed=2`);
    await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(800);
    await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
    await sleep(600);
    await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); [['heavy_slam', 0], ['shield_wall', 1], ['shoulder_charge', 2], ['taunting_roar', 3]].forEach(([id, k]) => X.cmd('partySwap', 1, id, k)); X.cmd('draftDecline'); return 1; });
    for (let hop = 0; hop < 5; hop++) {
      await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
      const isSkill = await E(page, () => window.__echoes.state().run.path.options.some((x) => x.reward === 'skill'));
      await E(page, () => { const o = window.__echoes.state().run.path.options; const k = o.findIndex((x) => x.reward === 'skill'); return window.__echoes.content.world().runSystem().choosePath(k >= 0 ? o[k].side : o[0].side); });
      await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
      await sleep(800);
      await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
      await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
      await sleep(1400);
      if (isSkill) break;
      await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); X.cmd('draftDecline'); return 1; });
    }
    const card = await E(page, () => { const c = window.__echoes.state().run.party.cards[1]; return { type: c.type, id: c.id, swap: c.swap, suggest: c.suggest, replace: c.replace }; });
    const before = await E(page, () => window.__echoes.cmd('partyView', 1).slots);
    // pad: RB to the Tank tab, D-pad down to move the Replaces mark, A to take
    await E(page, () => window.__padPress(5)); await sleep(300);
    const vs = await E(page, () => window.__echoes.runUi().draft.viewSeat);
    await E(page, () => window.__padPress(13)); await sleep(300);
    const mark = await E(page, () => { const s = document.querySelector('.rn-draft .rn-rep.rn-sel'); return s ? { slot: s.dataset.slot, skill: s.dataset.skill } : null; });
    await shot(page, 'gntfixPARTY6-modes-pad-mid');
    await E(page, () => window.__padPress(0)); await sleep(500);
    const cardAfter = await E(page, () => { const p = window.__echoes.state().run.party; if (!p) return 'closed'; const c = p.cards[1]; return { decided: c.decided, choice: c.choice, replace: c.replace, by: c.by }; });
    for (let i = 0; i < 5; i++) { const s = await E(page, () => window.__echoes.runUi().screen); if (s !== 'draft') break; await E(page, () => window.__padPress(0)); await sleep(600); }
    const after = await E(page, () => window.__echoes.cmd('partyView', 1).slots);
    out.pad.push({ card, before, vs, mark, cardAfter, after });
    console.log(`pad: Tank card ${JSON.stringify(card)} view ${vs}, D-pad mark ${JSON.stringify(mark)}, A -> ${JSON.stringify(cardAfter)}; loadout ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  }
} finally { await b.close(); }
writeJson('gntfixPARTY6-modes', out);
