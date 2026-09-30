// socket class nodes on an ally by REAL keys; grey / inert / live verdict display on the socket screen.
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntfixPARTY5-lib.mjs';
const W = Number(process.argv[2] || 1600), H = Number(process.argv[3] || 900);
const b = await launch();
const log = [];
const su = (page) => E(page, () => { const x = window.__echoes.content.socketUi(); return { viewSeat: x.viewSeat, rows: x.rows, bench: (x.bench || []).map((n) => (n && (n.node || n.id || n)) ), inHand: x.inHand, focus: x.focus, headerInHand: x.headerInHand, cells: (x.cells || []).map((r) => r.map((c) => (c.state === 'filled' ? (c.grey ? 'G' : c.inert ? 'I' : 'L') : c.focus ? '*' : '.')).join('')) }; });
const detail = (page) => E(page, () => { const d = [...document.querySelectorAll('.nd-page *')].filter((e) => e.offsetParent && /SOCKET \d OF 8/.test(e.textContent || '') && e.children.length < 12); const el = d[d.length - 1]; return el ? el.closest('div').parentElement.innerText.replace(/\s+/g, ' ').slice(0, 400) : null; });
try {
  const { page, errors } = await open(b, `${process.env.GNTC_BASE || 'http://127.0.0.1:5199/'}?menu=0&seed=7`, { width: W, height: H });
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(1000);
  await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  await sleep(1400);
  const setup = await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); X.cmd('partyMode', 'manual');
    const sw = [['shield_wall', 0], ['iron_stance', 1], ['taunting_roar', 2]].map(([id, k]) => X.cmd('partySwap', 1, id, k));
    const g = ['tremor', 'provoke', 'anchor', 'aegis', 'retaliate', 'brace'].map((n) => X.cmd('partyGrantNode', 1, n));
    return { sw, g, v: X.cmd('partyView', 1).slots, bench: X.cmd('partyView', 1).bench.map((x) => x.node) }; });
  log.push({ setup });
  await page.keyboard.press('F1'); await sleep(300);
  await page.keyboard.press('Enter'); await sleep(900);
  log.push({ phase: await E(page, () => window.__echoes.state().run.phase), tankBench: await E(page, () => window.__echoes.cmd('partyView', 1).bench.map((x) => x.node)) });
  await page.keyboard.press('KeyB'); await sleep(900);
  await page.keyboard.press('F2'); await sleep(600);
  log.push({ step: 'open tank', su: await su(page) });
  await shot(page, `gntfixPARTY5-sockreal-${W}-0-open`);
  // Real keys: Enter on the focused socket (pick from bench?)
  const seq = ['Enter', 'Enter', 'ArrowDown', 'Enter', 'Enter', 'ArrowDown', 'Enter', 'Enter', 'ArrowDown', 'Enter', 'Enter'];
  let i = 0;
  for (const k of seq) {
    await page.keyboard.press(k); await sleep(350);
    const s = await su(page);
    log.push({ key: k, su: s, detail: await detail(page) });
    if (k === 'Enter' && i % 2 === 1) await shot(page, `gntfixPARTY5-sockreal-${W}-${i}`);
    i++;
  }
  // put Tremor on Shield Wall (grey) via cmd if not placed, then focus it for the detail line
  const final = await E(page, () => { const X = window.__echoes; const v = X.cmd('partyView', 1); return { slots: v.slots, skills: v.skills.map((k) => ({ id: k.id, sockets: k.sockets.map((x) => (x ? x.node + (x.grey ? '(grey)' : x.inert ? '(inert)' : '') : '-')).join(','), live: k.live, filled: k.filled })), bench: v.bench.map((x) => x.node) }; });
  log.push({ final });
  await shot(page, `gntfixPARTY5-sockreal-${W}-final`);
  log.push({ errors });
  console.log(JSON.stringify(log, null, 1).slice(0, 12000));
} finally { await b.close(); }
writeJson(`gntfixPARTY5-sockreal-${W}`, log);
