import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntfixPARTY5-lib.mjs';
const sizes = (process.argv[2] || '1024x576,1024x640,1600x900,2560x1440').split(',').map((s) => s.split('x').map(Number));
const out = [];
const b = await launch();
try {
  for (const [W, H] of sizes) {
    const { page, errors } = await open(b, `${process.env.GNTC_BASE || 'http://127.0.0.1:5199/'}?menu=0&seed=7`, { width: W, height: H });
    await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(900);
    await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
    await sleep(1400);
    await page.keyboard.press('Enter'); await sleep(900);
    await page.keyboard.press('KeyB'); await sleep(900);
    for (const s of [0, 1, 2, 3]) {
      await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]); await sleep(450);
      const a = await E(page, () => {
        const root = document.querySelector('.nd-page');
        const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const texts = [...root.querySelectorAll('*')].filter((el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
        const tb = texts.map((el) => ({ el, r: el.getBoundingClientRect() }));
        const ov = [];
        for (let i = 0; i < tb.length; i++) for (let j = i + 1; j < tb.length; j++) { const A = tb[i], B = tb[j]; if (A.el.contains(B.el) || B.el.contains(A.el)) continue; const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left); const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top); if (w > 2 && h > 2) { const small = Math.min(A.r.width * A.r.height, B.r.width * B.r.height); if ((w * h) / small > 0.15) ov.push(`"${A.el.textContent.trim().slice(0, 14)}" x "${B.el.textContent.trim().slice(0, 14)}"`); } }
        const clipped = texts.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible').map((el) => el.textContent.trim().slice(0, 20));
        const rr = root.getBoundingClientRect();
        const su = window.__echoes.content.socketUi();
        const renderedMin = Math.min(...texts.map((el) => { const fs = parseFloat(getComputedStyle(el).fontSize); return fs * (su.scale || 1); }));
        const rowsWithSeat = [...root.querySelectorAll('[data-seat]')].filter((e) => !e.classList.contains('rn-ptab')).map((e) => e.className.slice(0, 20) + ':' + e.dataset.seat);
        return { scale: su.scale, viewSeat: su.viewSeat, ov: ov.slice(0, 6), clipped: clipped.slice(0, 6), inWindow: rr.top >= -1 && rr.bottom <= innerHeight + 1 && rr.left >= -1 && rr.right <= innerWidth + 1, renderedMinFont: Math.round(renderedMin * 10) / 10, rowsWithSeat: [...new Set(rowsWithSeat)].slice(0, 8) };
      });
      out.push({ size: `${W}x${H}`, seat: s, ...a });
      console.log(`${W}x${H} seat ${s}: scale ${a.scale} viewSeat ${a.viewSeat} overlaps ${a.ov.length} clipped ${a.clipped.length} inWindow ${a.inWindow} renderedMinFont ${a.renderedMinFont}px rows-with-data-seat ${JSON.stringify(a.rowsWithSeat)}`);
      if (s >= 2) await shot(page, `gntfixPARTY5-sockaudit-${W}x${H}-seat${s}`);
    }
    await page.close();
  }
} finally { await b.close(); }
writeJson('gntfixPARTY5-sockaudit', out);
