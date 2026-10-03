// gntfixPARTY5-textw — measures candidate ribbon label widths in the game's font stack (scratch sizing aid).
import { launch, sleep } from './gntfixPARTY5-lib.mjs';
const b = await launch();
const p = await b.newPage();
await p.setContent('<html><body style="font-family: system-ui, -apple-system, \'Segoe UI\', sans-serif"></body></html>');
const r = await p.evaluate(() => {
  const m = (txt, css) => { const s = document.createElement('span'); s.style.cssText = `white-space:nowrap;font-size:16px;${css}`; s.textContent = txt; document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return Math.round(w * 10) / 10; };
  const out = {};
  for (const t of ['SWORDSMAN', 'ARCHER', 'TANK', 'HEALER', 'Swordsman', 'Archer']) { out[t + ' 800 .04em'] = m(t, 'font-weight:800;letter-spacing:0.04em'); out[t + ' 800 0'] = m(t, 'font-weight:800;letter-spacing:0'); out[t + ' 700 0'] = m(t, 'font-weight:700;letter-spacing:0'); }
  for (const t of ['✓ SUGGESTED', '+ SUGGEST', '✓ Suggested', '+ Suggest', '✓ AI PICK', '✓ PICK']) { out[t + ' 800 0'] = m(t, 'font-weight:800;letter-spacing:0'); out[t + ' 700 0'] = m(t, 'font-weight:700;letter-spacing:0'); }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
