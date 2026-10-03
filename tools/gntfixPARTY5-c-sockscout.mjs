import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntfixPARTY5-lib.mjs';
const W = Number(process.argv[2] || 1024), H = Number(process.argv[3] || 576);
const b = await launch();
const out = {};
try {
  const { page, errors } = await open(b, `${process.env.GNTC_BASE || 'http://127.0.0.1:5199/'}?menu=0&seed=7`, { width: W, height: H });
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(1000);
  await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  await sleep(1400);
  // wheel over the Replaces row on the Tank card
  await page.keyboard.press('F2'); await sleep(400);
  const r0 = await E(page, () => window.__echoes.state().run.party.cards[1].replace);
  const rb = await E(page, () => { const t = document.querySelector('.rn-draft .rn-rep'); const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(rb.x, rb.y); await page.mouse.wheel({ deltaY: 120 }); await sleep(350);
  const r1 = await E(page, () => window.__echoes.state().run.party.cards[1].replace);
  await page.mouse.wheel({ deltaY: 120 }); await sleep(350);
  const r2 = await E(page, () => window.__echoes.state().run.party.cards[1].replace);
  out.wheelOverReplaces = { r0, r1, r2 };
  console.log('wheel over Replaces row', r0, r1, r2);
  // Leave every ally card so the kit stays; give the Tank class nodes; commit with the Healer's Enter
  await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave'); X.cmd('partyGrantNode', 1, 'provoke'); X.cmd('partyGrantNode', 1, 'tremor'); X.cmd('partyGrantNode', 1, 'anchor'); X.cmd('partyGrantNode', 2, 'parry'); X.cmd('partyGrantNode', 3, 'skewer'); return 1; });
  await page.keyboard.press('F1'); await sleep(350);
  await page.keyboard.press('Enter'); await sleep(900);
  out.phase = await E(page, () => window.__echoes.state().run.phase);
  // open the socket screen with B on the path
  await page.keyboard.press('KeyB'); await sleep(900);
  await page.keyboard.press('F2'); await sleep(600);
  await shot(page, `gntfixPARTY5-sock-${W}x${H}-tank-bench`);
  const info = await E(page, () => {
    const t = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^SOCKETS$/.test((e.textContent || '').trim()));
    let root = t; for (let i = 0; i < 8 && root && root.parentElement; i++) { root = root.parentElement; if (root.getBoundingClientRect().height > innerHeight * 0.6) break; }
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const texts = [...root.querySelectorAll('*')].filter((el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const fs = texts.map((el) => ({ f: parseFloat(getComputedStyle(el).fontSize), t: el.textContent.trim().slice(0, 20), c: el.className }));
    const cells = [...root.querySelectorAll('*')].filter(vis).filter((el) => /^[1-8]$/.test((el.textContent || '').trim()) && el.children.length === 0).map((el) => el.parentElement.getBoundingClientRect().width);
    const rowsSeat = [...root.querySelectorAll('[data-seat]')].map((e) => e.dataset.seat);
    const su = window.__echoes.content.socketUi();
    return { rootCls: root.className, minFont: Math.min(...fs.map((x) => x.f)), smallTexts: fs.filter((x) => x.f < 16).slice(0, 12), nSmall: fs.filter((x) => x.f < 16).length, nText: fs.length, cellW: cells.slice(0, 4), rowsSeat: [...new Set(rowsSeat)], su: JSON.stringify(su).slice(0, 1500) };
  });
  out.info = info;
  console.log(JSON.stringify(info, null, 1).slice(0, 3000));
  out.errors = errors;
} finally { await b.close(); }
writeJson(`gntfixPARTY5-sockscout-${W}x${H}`, out);
