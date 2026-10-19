// gntcparty6 — a player's REORDER (socket screen, real keys) followed by a SWAP the player makes on the
// next skill page (real keys S + Enter). Does the commit keep the player's order and put the new skill in
// the marked key? Seats 1-3, Suggested (default) mode.
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntcparty6-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const SEEDS = opt('seeds', '2,4').split(',').map(Number);
const out = [];
const b = await launch();
const slots = (page, s) => E(page, (x) => window.__echoes.cmd('partyView', x).slots, s);
async function clearRoom(page) {
  for (let i = 0; i < 60; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) === 'draft') return true; await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; }); await sleep(1500); }
  return false;
}
try {
  for (const seed of SEEDS) {
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=${seed}`, { width: 1600, height: 900 });
    const rec = { seed, seats: {} };
    try {
      await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
      await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
      await sleep(900);
      await clearRoom(page);
      await sleep(1200);
      // page 1: leave every ally card (keep the kits), commit with the Healer's Enter
      await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); return 1; });
      await page.keyboard.press('F1'); await sleep(300);
      for (let i = 0; i < 6; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) !== 'draft') break; await page.keyboard.press('Enter'); await sleep(600); }
      await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
      // reorder every ally by REAL keys: rows 1 <-> 4
      await page.keyboard.press('KeyB'); await sleep(900); rec.afterB = await E(page, () => ({ scr: window.__echoes.runUi().screen, su: JSON.stringify(window.__echoes.content.socketUi()).slice(0, 200) }));
      for (const s of [1, 2, 3]) {
        rec.seats[s] = { kit: await slots(page, s) };
        await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]); await sleep(600);
        rec.seats[s].trace = []; for (const k of ['Digit1', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'Enter', 'Digit4']) { await page.keyboard.press(k); await sleep(380); rec.seats[s].trace.push({ k, su: await E(page, () => { const x = window.__echoes.content.socketUi(); return x ? { v: x.viewSeat, f: x.focus, h: x.headerInHand, scr: window.__echoes.runUi().screen } : null; }) }); }
        rec.seats[s].reordered = await slots(page, s);
      }
      await page.keyboard.press('Escape'); await sleep(900);
      // walk doors until a skill-promising page
      let found = false;
      for (let hop = 0; hop < 5 && !found; hop++) {
        await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
        const pick = await E(page, () => { const o = window.__echoes.state().run.path.options; const k = o.find((x) => x.reward === 'skill'); return k ? { side: k.side, skill: true } : { side: o[0].side, skill: false }; });
        await E(page, (sd) => window.__echoes.content.world().runSystem().choosePath(sd), pick.side);
        await waitFor(page, () => ['combat', 'shop'].includes(window.__echoes.state().run.phase), null, 30000);
        await sleep(900);
        await clearRoom(page);
        await sleep(1300);
        if (pick.skill) { found = true; break; }
        await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); X.cmd('draftDecline'); return 1; });
      }
      rec.found = found;
      const cards = await E(page, () => window.__echoes.state().run.party.cards.map((c) => ({ seat: c.seat, type: c.type, id: c.id, swap: c.swap, replace: c.replace, suggest: c.suggest })));
      rec.cards = cards;
      for (const s of [1, 2, 3]) {
        const c = cards.find((x) => x.seat === s);
        if (!c || c.type !== 'skill' || !c.swap) { rec.seats[s].skip = c; continue; }
        rec.seats[s].prePage = await slots(page, s);
        await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]); await sleep(450);
        await page.keyboard.press('KeyS'); await sleep(350);
        const mark = await E(page, () => { const sel = document.querySelector('.rn-draft .rn-rep.rn-sel'); return sel ? { slot: Number(sel.dataset.slot), skill: sel.dataset.skill } : null; });
        rec.seats[s].mark = mark;
        rec.seats[s].offered = c.id;
        await shot(page, `gntfixPARTY6-reorderswap-s${seed}-seat${s}-mid`);
        await page.keyboard.press('Enter'); await sleep(600);
      }
      await page.keyboard.press('F1'); await sleep(300);
      for (let i = 0; i < 6; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) !== 'draft') break; await page.keyboard.press('Enter'); await sleep(600); }
      await sleep(500);
      for (const s of [1, 2, 3]) {
        const r = rec.seats[s];
        r.after = await slots(page, s);
        if (!r.mark) continue;
        const expect = r.prePage.slice(); expect[r.mark.slot] = r.offered;
        r.expected = expect;
        r.inPlace = JSON.stringify(expect) === JSON.stringify(r.after);
        r.othersKeptOrder = JSON.stringify(r.prePage.filter((x, k) => k !== r.mark.slot)) === JSON.stringify(r.after.filter((x) => x !== r.offered));
        console.log(`seed ${seed} seat ${s}: kit ${JSON.stringify(r.kit)} -> player reorder ${JSON.stringify(r.reordered)} -> page ${JSON.stringify(r.prePage)}; marked key ${r.mark.slot + 1} (${r.mark.skill}) for ${r.offered} -> after ${JSON.stringify(r.after)} | in place ${r.inPlace}, the other three keep the player's order ${r.othersKeptOrder}`);
      }
      rec.errors = errors.slice(0, 3);
    } catch (e) { rec.err = String(e.message).slice(0, 300); console.log('ERR', seed, e.message); }
    out.push(rec);
    await page.close();
  }
} finally { await b.close(); }
writeJson('gntfixPARTY6-reorderswap', out);
