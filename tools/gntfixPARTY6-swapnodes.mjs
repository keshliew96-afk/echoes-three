// gntcparty6 — a full-slot SWAP that replaces a skill HOLDING nodes, by REAL keys, every seat.
// Checks: the replaced skill = the marked one; its nodes go to that character's bench (or are re-placed by the
// AI-held auto-fill) with 0 nodes lost; skill_swapped payload; the Healer's socket screen chained with auto-fill.
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntcparty6-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const SEEDS = opt('seeds', '2,4').split(',').map(Number);
const MARK = Number(opt('mark', '2'));
const TAG = opt('tag', '');
const NODES = { 0: ['reach', 'widen', 'sharpen'], 1: ['aegis', 'reach', 'widen'], 2: ['reach', 'widen', 'sharpen'], 3: ['reach', 'widen', 'sharpen'] };
const out = [];
const b = await launch();
const VIEW = (s) => {
  const X = window.__echoes;
  const v = s === 0 ? X.cmd('buildView') : X.cmd('partyView', s);
  const sk = v.skills.map((k) => ({ id: k.id, nodes: k.sockets.filter(Boolean).map((x) => x.node || x.id || x) }));
  return { slots: sk.map((k) => k.id), sk, bench: (v.bench || []).map((x) => (x.node || x.id) + ':' + (x.provenance || '')), total: sk.reduce((a, k) => a + k.nodes.length, 0) + (v.bench || []).length };
};
async function clearRoom(page) {
  for (let i = 0; i < 60; i++) {
    if ((await E(page, () => window.__echoes.runUi().screen)) === 'draft') return true;
    await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
    await sleep(1500);
  }
  return false;
}
async function closeExtra(page) {
  for (let i = 0; i < 3; i++) {
    const scr = await E(page, () => window.__echoes.runUi().screen);
    if (scr === 'path' || scr === 'none') break;
    await page.keyboard.press('Escape'); await sleep(700);
  }
}
try {
  for (const seed of SEEDS) {
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=${seed}`, { width: 1600, height: 900 });
    const rec = { seed, seats: {}, log: [] };
    try {
      await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
      await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
      await E(page, () => { const X = window.__echoes; X.cmd('giveSkill', 'lantern_flurry'); X.cmd('giveSkill', 'dewfall'); return 1; });
      await sleep(900);
      await clearRoom(page); await sleep(1300);
      await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); return 1; });
      await page.keyboard.press('F1'); await sleep(300);
      await page.keyboard.press('KeyX'); await sleep(500);
      for (let i = 0; i < 6; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) !== 'draft') break; await page.keyboard.press('Enter'); await sleep(600); }
      await closeExtra(page);
      await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
      rec.socketOps = await E(page, (a) => {
        const X = window.__echoes; const ops = {};
        for (const s of [0, 1, 2, 3]) {
          const v = s === 0 ? X.cmd('buildView') : X.cmd('partyView', s);
          const sk = v.skills[a.MARK].id; ops[s] = { skill: sk, r: [] };
          a.NODES[s].forEach((n, i) => {
            const g = s === 0 ? X.cmd('grantNode', n) : X.cmd('partyGrantNode', s, n, 'grant');
            const so = s === 0 ? X.cmd('socket', sk, n) : X.cmd('partySocket', s, sk, n, i);
            ops[s].r.push({ g: JSON.stringify(g).slice(0, 80), so: JSON.stringify(so).slice(0, 120) });
          });
        }
        return ops;
      }, { MARK, NODES });
      for (const s of [0, 1, 2, 3]) rec.seats[s] = { before: await E(page, VIEW, s) };
      let found = false;
      for (let hop = 0; hop < 5 && !found; hop++) {
        await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
        const pick = await E(page, () => { const o = window.__echoes.state().run.path.options; const k = o.find((x) => x.reward === 'skill'); return k ? { side: k.side, skill: true } : { side: o[0].side, skill: false }; });
        await E(page, (sd) => window.__echoes.content.world().runSystem().choosePath(sd), pick.side);
        await waitFor(page, () => ['combat', 'shop'].includes(window.__echoes.state().run.phase), null, 30000);
        await sleep(900);
        await clearRoom(page); await sleep(1300);
        if (pick.skill) { found = true; break; }
        await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); X.cmd('draftDecline'); return 1; });
        await closeExtra(page);
      }
      rec.found = found;
      await E(page, () => { window.__sw = []; window.__echoes.on('skill_swapped', (e) => window.__sw.push(JSON.parse(JSON.stringify(e)))); return 1; });
      rec.cards = await E(page, () => window.__echoes.state().run.party.cards.map((c) => ({ seat: c.seat, type: c.type, id: c.id, swap: c.swap, suggest: c.suggest })));
      for (const s of [0, 1, 2, 3]) rec.seats[s].onPage = await E(page, VIEW, s);
      for (const s of [1, 2, 3, 0]) {
        const c = rec.cards.find((x) => x.seat === s);
        if (!c || c.type !== 'skill' || !c.swap) { rec.seats[s].skip = c; continue; }
        await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]); await sleep(450);
        let mark = null;
        const m0 = await E(page, () => { const sel = document.querySelector('.rn-draft .rn-rep.rn-sel'); return sel ? Number(sel.dataset.slot) : null; });
        if (m0 === MARK) { await page.keyboard.press('KeyS'); await sleep(330); await page.keyboard.press('KeyW'); await sleep(330); }
        for (let i = 0; i < 5; i++) {
          mark = await E(page, () => { const sel = document.querySelector('.rn-draft .rn-rep.rn-sel'); return sel ? Number(sel.dataset.slot) : null; });
          if (mark === MARK) break;
          await page.keyboard.press('KeyS'); await sleep(330);
        }
        rec.seats[s].mark = mark; rec.seats[s].offered = c.id;
        rec.seats[s].cardText = await E(page, () => { const d = document.querySelector('.rn-draft'); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 600) : null; });
        await shot(page, `gntfixPARTY6-swapnodes${TAG}-s${seed}-seat${s}-mid`);
        if (s !== 0) { await page.keyboard.press('Enter'); await sleep(600); }
      }
      rec.focusBeforeCommit = await E(page, () => { const a = document.activeElement; return a ? (a.className || a.tagName) + ':' + (a.innerText || '').slice(0, 30) : null; });
      for (let i = 0; i < 6; i++) { if ((await E(page, () => window.__echoes.runUi().screen)) !== 'draft') break; await page.keyboard.press('Enter'); await sleep(700); }
      await sleep(700);
      rec.afterScreen = await E(page, () => {
        const u = window.__echoes.runUi(); const su = window.__echoes.content.socketUi();
        const pg = document.querySelector('.nd-page');
        return { screen: u.screen, socket: su && su.open ? { viewSeat: su.viewSeat, inHand: su.inHand, rows: su.rows && su.rows.length, txt: pg ? pg.innerText.replace(/\s+/g, ' ').slice(0, 500) : null } : null };
      });
      await shot(page, `gntfixPARTY6-swapnodes${TAG}-s${seed}-after`);
      for (const s of [0, 1, 2, 3]) rec.seats[s].after = await E(page, VIEW, s);
      rec.swapped = await E(page, () => window.__sw);
      rec.errors = errors.slice(0, 5);
      for (const s of [0, 1, 2, 3]) {
        const r = rec.seats[s]; if (r.mark === undefined || r.mark === null) continue;
        const rep = r.onPage.slots.filter((x) => !r.after.slots.includes(x));
        const repNodes = r.onPage.sk[MARK].nodes;
        console.log(`seed ${seed} seat ${s}: marked key ${r.mark + 1} (${r.onPage.slots[MARK]} holding ${JSON.stringify(repNodes)}) for ${r.offered} -> replaced ${JSON.stringify(rep)}; nodes total ${r.onPage.total} -> ${r.after.total}; bench after ${JSON.stringify(r.after.bench)}; slots after ${JSON.stringify(r.after.slots)}; skills after ${JSON.stringify(r.after.sk.map((k) => k.id + '[' + k.nodes.join(',') + ']'))}`);
      }
    } catch (e) { rec.err = String(e.message).slice(0, 300); console.log('ERR', seed, e.message); }
    out.push(rec);
    await page.close();
  }
} finally { await b.close(); }
writeJson(`gntfixPARTY6-swapnodes${TAG}`, out);
