// gntcparty6 — does a player's manual skill REORDER on an AI-held ally survive the next party-page commit?
// Real keys on the socket screen (B, F2, 1, ArrowLeft -> header, Enter, 4 / ArrowDown, Enter), then the next
// room's page committed with Enter. Modes: suggest (default) and manual.
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntcparty6-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const MODES = opt('modes', 'suggest,manual').split(',');
const SEAT = Number(opt('seat', '1'));
const out = [];
const b = await launch();
const su = (page) => E(page, () => { const x = window.__echoes.content.socketUi(); return { viewSeat: x.viewSeat, rows: x.rows && x.rows.map((r) => (r && (r.skill || r.id)) || r), focus: x.focus, headerInHand: x.headerInHand, inHand: x.inHand }; });
const slots = (page, s) => E(page, (x) => window.__echoes.cmd('partyView', x).slots, s);
try {
  for (const mode of MODES) {
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=7&party=${mode}`, { width: 1600, height: 900 });
    const rec = { mode, steps: [] };
    try {
      await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
      await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
      await sleep(900);
      await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
      await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
      await sleep(1300);
      // commit page 1 with Enter presses from the Healer's tab
      await page.keyboard.press('F1'); await sleep(300);
      for (let i = 0; i < 6; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) !== 'draft') break; await page.keyboard.press('Enter'); await sleep(600); }
      await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
      rec.before = await slots(page, SEAT);
      await page.keyboard.press('KeyB'); await sleep(900);
      await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][SEAT]); await sleep(600);
      rec.steps.push({ k: 'open', su: await su(page) });
      for (const k of ['Digit1', 'ArrowLeft', 'Enter', 'Digit4']) {
        await page.keyboard.press(k); await sleep(380);
        rec.steps.push({ k, su: await su(page), slots: await slots(page, SEAT) });
      }
      await shot(page, `gntfixPARTY6-reorder-${mode}-after`);
      rec.reordered = await slots(page, SEAT);
      await page.keyboard.press('Escape'); await sleep(900); rec.steps.push({ k: 'esc', scr: await E(page, () => window.__echoes.runUi().screen), app: await E(page, () => { try { return window.__echoes.app.state(); } catch (e) { return String(e).slice(0, 60); } }) });
      // walk a door and clear the next room, commit its page by real Enter
      const side = await E(page, () => { const o = window.__echoes.state().run.path.options; const k = o.find((x) => x.win === 'kill_all') || o[0]; return k.side; });
      rec.choose = await E(page, (sd) => { const r = window.__echoes.content.world().runSystem().choosePath(sd); return JSON.stringify(r === undefined ? 'undef' : r).slice(0, 200); }, side); await sleep(3000); rec.afterChoose = await E(page, () => { const v = window.__echoes.state().run; return { phase: v.phase, room: v.room, path: JSON.stringify(v.path).slice(0, 300), screen: window.__echoes.runUi().screen }; }); console.log('choose', side, rec.choose, JSON.stringify(rec.afterChoose));
      await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
      await sleep(900);
      for (let i = 0; i < 60; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) === 'draft') break; await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; }); await sleep(1500); }
      await sleep(1300);
      rec.card = await E(page, (s) => { const c = window.__echoes.state().run.party.cards.find((x) => x.seat === s); return { type: c.type, id: c.id, swap: c.swap, decided: c.decided, choice: c.choice, suggest: c.suggest }; }, SEAT);
      rec.onPage = await slots(page, SEAT);
      await page.keyboard.press('F1'); await sleep(300);
      let enters = 0;
      for (let i = 0; i < 8; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) !== 'draft') break; await page.keyboard.press('Enter'); enters++; await sleep(600); }
      await sleep(500);
      rec.enters = enters;
      rec.afterCommit = await slots(page, SEAT);
      rec.events = await E(page, () => window.__echoes.events.filter((e) => /loadout_reorder|skill_swapped|party_commit/.test(e.type)).slice(-6));
      rec.errors = errors.slice(0, 3);
      const kept = rec.card && rec.card.choice !== 'take' ? JSON.stringify(rec.afterCommit) === JSON.stringify(rec.reordered) : null;
      console.log(`[${mode}] before ${JSON.stringify(rec.before)} -> reordered ${JSON.stringify(rec.reordered)} -> page card ${JSON.stringify(rec.card)} -> after commit ${JSON.stringify(rec.afterCommit)} (enters ${enters}) keptOrder=${kept}`);
    } catch (e) { rec.err = String(e.message).slice(0, 300); console.log('ERR', mode, e.message); }
    out.push(rec);
    await page.close();
  }
} finally { await b.close(); }
writeJson('gntfixPARTY6-reorder', out);
