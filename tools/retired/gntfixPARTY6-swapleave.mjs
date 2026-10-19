// gntcparty6 — swap offers whose AI SUGGESTION is Leave: the player moves the Replaces mark (S / click)
// and presses Enter / clicks Take. Does the new skill enter the loadout (Take) or is it discarded?
// Also: does a manual reorder of an AI-held seat survive the next page commit? (Suggested and Manual.)
import { launch, open, E, sleep, writeJson, shot, waitFor } from './gntcparty6-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const SEEDS = (opt('seeds', '1,2,3,4')).split(',').map(Number);
const MODES = (opt('modes', 'keys,mouse')).split(',');
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const PREF = { 1: ['heavy_slam', 'shield_wall', 'shoulder_charge', 'taunting_roar'], 2: ['flurry', 'lunge_strike', 'crescent_finisher', 'fox_step'], 3: ['piercing_shot', 'volley', 'pinning_arrow', 'vault_shot'] };
const rows = [];
const b = await launch();
const slotsOf = (page, s) => E(page, (x) => (x === 0 ? window.__echoes.cmd('buildView').skills.map((k) => k.id) : window.__echoes.cmd('partyView', x).slots), s);
try {
  for (const seed of SEEDS) for (const mode of MODES) {
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=${seed}`);
    try {
      await E(page, () => { const X = window.__echoes; X.cmd('startRun', { act: 1 }); return 1; });
      await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
      await E(page, () => { const X = window.__echoes; X.cmd('giveSkill', 'mending_tide'); X.cmd('giveSkill', 'kindred_shield'); return 1; });
      await sleep(800);
      await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
      await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
      await sleep(600);
      // page 1: leave every card, then put the AI-preferred loadouts on the allies (combat inactive), commit
      const sw = await E(page, (pref) => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); const out = {}; for (const s of [1, 2, 3]) out[s] = pref[s].map((id, k) => X.cmd('partySwap', s, id, k)); const v = [1, 2, 3].map((s) => X.cmd('partyView', s).slots); X.cmd('draftDecline'); return { out, v }; }, PREF);
      // walk doors until a skill-promising page (<= room 6)
      let found = false;
      for (let hop = 0; hop < 5 && !found; hop++) {
        await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
        const side = await E(page, () => { const o = window.__echoes.state().run.path.options; const k = o.findIndex((x) => x.reward === 'skill'); return k >= 0 ? o[k].side : o[0].side; });
        const isSkill = await E(page, () => window.__echoes.state().run.path.options.some((x) => x.reward === 'skill'));
        await E(page, (sd) => window.__echoes.content.world().runSystem().choosePath(sd), side);
        await waitFor(page, () => window.__echoes.state().run.phase === 'combat' || window.__echoes.state().run.phase === 'shop', null, 30000);
        await sleep(900);
        await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
        await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
        await sleep(1400);
        if (isSkill) { found = true; break; }
        await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); X.cmd('draftDecline'); return 1; });
      }
      const pre = await E(page, () => [1, 2, 3].map((s) => window.__echoes.cmd('partyView', s).slots));
      const cards = await E(page, () => window.__echoes.state().run.party.cards.map((c) => ({ seat: c.seat, type: c.type, id: c.id, swap: c.swap, suggest: c.suggest, replace: c.replace, decided: c.decided, choice: c.choice })));
      const rewardSeat0 = await E(page, () => { const r = window.__echoes.state().run.reward; return r ? { type: r.type || r.reward, id: r.id, swap: r.swap, replace: r.replace, suggest: r.suggest } : null; });
      const before = {}; for (const s of [0, 1, 2, 3]) before[s] = await slotsOf(page, s);
      const tested = [];
      for (const c of [...cards.filter((x) => x.seat > 0), ...cards.filter((x) => x.seat === 0)]) {
        if (c.type !== 'skill' || !c.swap) continue;
        if (!(c.suggest && c.suggest.choice === 'leave')) continue;
        await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][c.seat]); await sleep(450);
        let target;
        if (mode === 'keys') {
          await page.keyboard.press('KeyS'); await sleep(350);
        } else {
          const box = await E(page, () => { const t = [...document.querySelectorAll('.rn-draft .rn-rep')].filter((x) => x.offsetParent)[1]; if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
          if (box) { await page.mouse.click(box.x, box.y); await sleep(350); }
        }
        const ui = await E(page, () => { const sel = document.querySelector('.rn-draft .rn-rep.rn-sel'); const take = document.querySelector('.rn-draft .rn-take'); const dec = document.querySelector('.rn-draft .rn-decline'); return { selSlot: sel ? Number(sel.dataset.slot) : null, selSkill: sel ? sel.dataset.skill : null, takeFocus: take ? take.className.includes('rn-focus') : null, leaveFocus: dec ? dec.className.includes('rn-focus') : null, chip: [...document.querySelectorAll('.rn-draft .rn-ptab')].map((t) => t.innerText.replace(/\s+/g, ' ')) }; });
        target = ui.selSlot;
        await shot(page, `gntfixPARTY6-swapleave-${mode}-s${seed}-seat${c.seat}-mid`);
        if (mode === 'keys') await page.keyboard.press('Enter');
        else { const tb = await E(page, () => { const t = document.querySelector('.rn-draft .rn-take'); const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }); await page.mouse.click(tb.x, tb.y); }
        await sleep(600);
        const cardAfter = await E(page, (s) => { const p = window.__echoes.state().run.party; if (!p) return 'page closed'; const k = p.cards.find((x) => x.seat === s); return { decided: k.decided, choice: k.choice, replace: k.replace, by: k.by }; }, c.seat);
        tested.push({ seat: c.seat, offered: c.id, suggest: c.suggest, ui, target, cardAfter });
        if (await E(page, () => window.__echoes.runUi().screen) !== 'draft') break;
      }
      // finish the page with Enter presses (Healer's own card)
      for (let i = 0; i < 6; i++) { const s = await E(page, () => window.__echoes.runUi().screen); if (s !== 'draft') break; await page.keyboard.press('Enter'); await sleep(600); }
      await sleep(400);
      const after = {}; for (const s of [0, 1, 2, 3]) after[s] = await slotsOf(page, s);
      for (const t of tested) {
        const have = after[t.seat].indexOf(t.offered);
        const tgtSkill = before[t.seat][t.target];
        const removed = before[t.seat].filter((x) => !after[t.seat].includes(x));
        t.result = { have, removed, tgtSkill, taken: have >= 0, rightVictim: removed.length === 1 && removed[0] === tgtSkill, before: before[t.seat], after: after[t.seat] };
        console.log(`seed ${seed} ${mode} seat ${t.seat}: offered ${t.offered} (AI suggests ${t.suggest.choice}); player marked slot ${t.target} (${tgtSkill}) and pressed Take/Enter [card after: ${JSON.stringify(t.cardAfter)}] -> ${have >= 0 ? `TAKEN into slot ${have}, removed ${removed}` : 'DISCARDED (loadout unchanged)'}`);
      }
      rows.push({ seed, mode, sw, pre, cards, rewardSeat0, tested, errors: errors.slice(0, 3) });
      if (!tested.length) console.log(`seed ${seed} ${mode}: no swap card suggested Leave (cards ${JSON.stringify(cards.map((c) => [c.seat, c.type, c.swap, c.suggest && c.suggest.choice]))})`);
    } catch (e) { rows.push({ seed, mode, err: String(e.message).slice(0, 300) }); console.log('ERR', seed, mode, e.message); }
    await page.close();
  }
} finally { await b.close(); }
writeJson('gntfixPARTY6-swapleave', rows);
const all = rows.flatMap((r) => r.tested || []);
console.log(`leave-suggested swap cards tested ${all.length}: taken ${all.filter((t) => t.result && t.result.taken).length}, discarded ${all.filter((t) => t.result && !t.result.taken).length}`);
