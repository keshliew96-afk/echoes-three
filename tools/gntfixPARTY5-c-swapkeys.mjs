// gntcparty5 — full-slot SWAP offers by REAL input for every seat (Healer + 3 allies).
// For each seed and seat: open the room-1 party page, view the seat (F1-F4), move the Replaces mark
// with S (keyboard) or a click on a Replaces tile (mouse), then Enter / click Take; record what the
// commit did to that seat's loadout vs the player's visible choice.
import { launch, open, E, sleep, writeJson, shot, waitFor } from './gntfixPARTY5-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const SEEDS = (opt('seeds', '1,2,3,4,5,6')).split(',').map(Number);
const SEATS = (opt('seats', '0,1,2,3')).split(',').map(Number);
const MODES = (opt('modes', 'keys,mouse')).split(',');
const BASEURL = opt('url', process.env.GNTC_BASE || 'http://127.0.0.1:5199/');
const b = await launch();
const rows = [];
const allErrors = [];
async function slotsOf(page, seat) {
  return E(page, (s) => {
    const X = window.__echoes;
    if (s === 0) { const v = X.cmd('buildView'); return v.skills.map((k) => k.id); }
    return X.cmd('partyView', s).slots;
  }, seat);
}
try {
  for (const seed of SEEDS) for (const seat of SEATS) for (const mode of MODES) {
    let page, errors;
    try {
      ({ page, errors } = await open(b, `${BASEURL}?menu=0&seed=${seed}`));
    } catch (e) { rows.push({ seed, seat, mode, err: 'boot ' + e.message }); continue; }
    try {
      if (seat === 0) {
        // Give the Healer 4 skills (2 starting + 2) so its room-1 skill reward is a swap offer.
        await E(page, () => { const X = window.__echoes; X.cmd('startRun', { act: 1 }); return 1; });
        await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
        await E(page, () => { const X = window.__echoes; X.cmd('giveSkill', 'lantern_flurry'); X.cmd('giveSkill', 'dewfall'); return 1; });
      } else {
        await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
        await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
      }
      await sleep(1200);
      await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
      await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
      await sleep(1400);
      const before = await slotsOf(page, seat);
      const card0 = await E(page, (s) => { const p = window.__echoes.state().run.party; return p ? p.cards.find((c) => c.seat === s) : null; }, seat);
      if (!card0 || card0.type !== 'skill' || !card0.swap) { rows.push({ seed, seat, mode, skip: 'no swap card', card0, before }); await page.close(); continue; }
      // view the seat
      await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][seat]);
      await sleep(400);
      const view = await E(page, () => { const u = window.__echoes.runUi(); return u.draft ? u.draft.viewSeat : null; });
      const sugg = card0.suggest;
      let target;
      if (mode === 'keys') {
        await page.keyboard.press('KeyS');
        await sleep(350);
      } else {
        // click a Replaces tile different from the current mark
        const cur = await E(page, (s) => window.__echoes.state().run.party.cards.find((c) => c.seat === s).replace, seat);
        const want = cur === 0 ? 1 : 0;
        const box = await E(page, (w) => {
          const tiles = [...document.querySelectorAll('.rn-draft .rn-rep')].filter((t) => t.offsetParent);
          const t = tiles.find((x) => Number(x.dataset.slot) === w) || tiles[w];
          if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, cls: t.className, n: tiles.length };
        }, want);
        if (box) { await page.mouse.click(box.x, box.y); await sleep(350); }
        else rows.push({ seed, seat, mode, note: 'no replace tile found' });
      }
      const mid = await E(page, (s) => { const X = window.__echoes; const c = X.state().run.party.cards.find((x) => x.seat === s); const sel = document.querySelector('.rn-draft .rn-sel, .rn-draft [aria-selected="true"]'); return { replace: c.replace, choice: c.choice, decided: c.decided, by: c.by, ui: (document.querySelector('.rn-draft') || {}).innerText || '' }; }, seat);
      target = mid.replace;
      await shot(page, `gntfixPARTY5-swap-${mode}-s${seed}-seat${seat}-mid`);
      // commit: Enter (keys) or click Take (mouse)
      if (mode === 'keys') {
        await page.keyboard.press('Enter');
      } else {
        const tb = await E(page, () => { const t = [...document.querySelectorAll('.rn-draft .rn-take')].find((x) => x.offsetParent); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, txt: t.innerText }; });
        if (tb) await page.mouse.click(tb.x, tb.y);
      }
      await sleep(600);
      const afterFirst = await E(page, (s) => { const X = window.__echoes; const p = X.state().run.party; const c = p && p.cards.find((x) => x.seat === s); return { phase: X.state().run.phase, screen: X.runUi().screen, card: c ? { replace: c.replace, choice: c.choice, decided: c.decided, by: c.by } : null, viewSeat: X.runUi().draft ? X.runUi().draft.viewSeat : null }; }, seat);
      // finish the page: press Enter until the page commits (the Healer's own card etc.)
      for (let i = 0; i < 6; i++) {
        const ph = await E(page, () => window.__echoes.runUi().screen);
        if (ph !== 'draft') break;
        await page.keyboard.press('Enter');
        await sleep(600);
      }
      await sleep(500);
      const after = await slotsOf(page, seat);
      const commitEv = await E(page, () => { const X = window.__echoes; const ev = X.events.filter((e) => e.type === 'party_commit' || e.type === 'skill_swapped' || e.type === 'draft_taken' || e.type === 'draft_declined'); return ev.slice(-8); });
      const newId = card0.id;
      const got = after.indexOf(newId);
      rows.push({ seed, seat, mode, offered: newId, suggest: sugg, before, view, visibleTarget: target, afterFirst, after, gotSlot: got, ok: got === target, discarded: got < 0, n: after.filter(Boolean).length, commitEv });
      console.log(`seed ${seed} seat ${seat} ${mode}: offered ${newId} suggest ${JSON.stringify(sugg)} target ${target} -> slot ${got} ${got === target ? 'OK' : got < 0 ? 'DISCARDED' : 'WRONG SLOT'} after=${JSON.stringify(after)}`);
      if (errors.length) allErrors.push({ seed, seat, mode, errors: errors.slice(0, 3) });
    } catch (e) { rows.push({ seed, seat, mode, err: String(e.message || e).slice(0, 300) }); console.log('ERR', seed, seat, mode, e.message); }
    await page.close();
  }
} finally { await b.close(); }
writeJson(`gntfixPARTY5-swapkeys${opt('tag', '')}`, { rows, allErrors });
const tested = rows.filter((r) => r.offered);
console.log(`tested ${tested.length}: ok ${tested.filter((r) => r.ok).length}, discarded ${tested.filter((r) => r.discarded).length}, wrong slot ${tested.filter((r) => !r.ok && !r.discarded).length}; page errors ${allErrors.length}`);
