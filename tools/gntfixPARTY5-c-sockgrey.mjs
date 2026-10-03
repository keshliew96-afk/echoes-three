import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntfixPARTY5-lib.mjs';
const b = await launch();
const out = [];
try {
  const { page, errors } = await open(b, `${process.env.GNTC_BASE || 'http://127.0.0.1:5199/'}?menu=0&seed=7`, { width: 1600, height: 900 });
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(1000);
  await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  await sleep(1400);
  const setup = await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); X.cmd('partyMode', 'manual');
    [['shield_wall', 0], ['iron_stance', 1], ['taunting_roar', 2], ['shoulder_charge', 3]].forEach(([id, k]) => X.cmd('partySwap', 1, id, k));
    [['tremor'], ['anchor'], ['provoke'], ['tremor'], ['provoke'], ['provoke'], ['retaliate']].forEach(([n]) => X.cmd('partyGrantNode', 1, n));
    const s = [X.cmd('partySocket', 1, 'shield_wall', 'tremor', 0), X.cmd('partySocket', 1, 'iron_stance', 'anchor', 0), X.cmd('partySocket', 1, 'taunting_roar', 'provoke', 0), X.cmd('partySocket', 1, 'shoulder_charge', 'tremor', 0), X.cmd('partySocket', 1, 'shield_wall', 'provoke', 1), X.cmd('partySocket', 1, 'shoulder_charge', 'provoke', 1), X.cmd('partySocket', 1, 'iron_stance', 'retaliate', 1)];
    return s; });
  out.push({ setup });
  await page.keyboard.press('F1'); await sleep(300);
  await page.keyboard.press('Enter'); await sleep(900);
  await page.keyboard.press('KeyB'); await sleep(900);
  await page.keyboard.press('F2'); await sleep(600);
  // walk focus over the socketed cells and read the detail panel
  const read = () => E(page, () => { const x = window.__echoes.content.socketUi(); const t = document.querySelector('.nd-page').innerText; const m = t.match(/[^\n]*SOCKET \d OF 8[\s\S]{0,260}/); return { focus: x.focus, cells: (x.cells || []).map((r) => r.map((c) => (c.state === 'filled' ? (c.grey ? 'G' : c.inert ? 'I' : 'L') : c.focus ? '*' : '.')).join('')), detail: m ? m[0].replace(/\s+/g, ' ') : null }; });
  // focus: cells zone r0c0 — get there with Right from bench? try Tab/Left
  for (const k of ['ArrowLeft', 'ArrowLeft', 'ArrowLeft']) { await page.keyboard.press(k); await sleep(200); }
  out.push({ start: await read() });
  const moves = [[], ['ArrowRight'], ['ArrowDown', 'ArrowLeft'], ['ArrowRight'], ['ArrowDown', 'ArrowLeft'], ['ArrowDown'], ['ArrowRight']];
  let n = 0;
  for (const mv of moves) { for (const k of mv) { await page.keyboard.press(k); await sleep(250); } const r = await read(); out.push(r); await shot(page, `gntfixPARTY5-sockgrey-${n++}`); }
  const pv = await E(page, () => window.__echoes.cmd('partyView', 1).skills.map((k) => ({ id: k.id, s: k.sockets.slice(0, 2).map((x) => x && JSON.stringify(x)), live: k.live })));
  out.push({ pv, errors });
  console.log(JSON.stringify(out, null, 1).slice(0, 9000));
} finally { await b.close(); }
writeJson('gntfixPARTY5-sockgrey', out);
