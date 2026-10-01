// Save critic r6 — SAVE6-F1 reproduction entirely through player input: fresh title -> Load Game -> Import… (REAL file
// chooser, captures/gntfixM26-drift-retired-skill.json = a genuine v0.5.165 export whose Healer slot-2 skill id is
// "retired_skill", integrity hash recomputed) -> the imported row -> Enter -> 4 s -> Esc -> screenshot.
import { join } from 'path';
const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';
export default async function (h) {
  const P = () => h.page;
  const foc = async () => h.ev(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id }; });
  const navTo = async (id, keys = ['ArrowDown', 'ArrowUp']) => { for (const k of keys) for (let i = 0; i < 16; i++) { if ((await foc()).focus === id) return true; await h.key(k); await h.sleep(100); } return (await foc()).focus === id; };
  const toasts = async () => h.ev(() => [...document.querySelectorAll('[class*="toast"]')].filter((e) => e.offsetParent !== null && e.innerText.trim()).map((e) => e.innerText.trim()).join(' / ').slice(0, 300));
  const file = join(h.outDir, 'gntfixM26-drift-retired-skill.json');
  await h.open(BASE + '?fresh=1');
  await h.sleep(1500);
  await h.gesture();
  await h.sleep(900);
  await navTo('ap-title-new'); await h.key('Enter'); await h.ready(200); await h.sleep(900); await h.key('Escape'); await h.sleep(700); await navTo('pz-save'); await h.key('Enter'); await h.sleep(900);
  let chooser = null;
  const w = P().waitForFileChooser({ timeout: 5000 }).then((c) => { chooser = c; }).catch(() => {});
  const c = await h.ev(() => { const e = document.getElementById('sv-import'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await P().mouse.move(c.x, c.y, { steps: 6 }); await h.sleep(200); await P().mouse.click(c.x, c.y);
  await w;
  if (chooser) await chooser.accept([file]); else { const inp = await P().$('#sv-import-file'); await inp.uploadFile(file); }
  await h.sleep(1500);
  const imported = { via: chooser ? 'chooser' : 'upload', toast: await toasts(), rows: await h.ev(() => [...document.querySelectorAll('[id^="sv-slot-"]')].map((e) => e.id + ' :: ' + e.innerText.replace(/\n+/g, ' | ').slice(0, 160))) };
  const id = await h.ev(() => { const s = window.__echoes.save.list().find((x) => /Drift/.test(x.name)); return s && s.id; });
  await navTo('sv-mode-load'); await h.key('Enter'); await h.sleep(700);
  await navTo('sv-slot-' + id);
  await h.shot('driftrepro-row');
  const e0 = h.errors.length;
  await h.key('Enter'); await h.sleep(700);
  const confirmText = await h.ev(() => { const c = document.getElementById('ap-confirm-ok'); return c && c.offsetParent !== null ? c.parentElement.parentElement.innerText.split('\n').join(' | ').slice(0, 200) : null; });
  if (confirmText) await h.key('Enter');
  await h.sleep(4000);
  const after = await h.ev(async () => { const E = window.__echoes; const t1 = E.tick; await new Promise((r) => setTimeout(r, 1000)); let st = null; try { st = E.state().run.phase; } catch (e) { st = 'state threw: ' + e.message; } return { app: E.app.state, ticksPer1s: E.tick - t1, state: st }; });
  await h.shot('driftrepro-after');
  await h.key('Escape'); await h.sleep(800);
  const pause = { f: await foc(), items: await h.ev(() => [...document.querySelectorAll('[id^="pz-"]')].filter((e) => e.offsetParent !== null).map((e) => e.id)) };
  await h.shot('driftrepro-pause');
  // try every exit a player has
  await h.key('ArrowDown'); await h.key('Enter'); await h.sleep(600);
  const afterEnter = await foc();
  const out = { confirmText, imported, id, after, pause, afterEnter, pageErrors: h.errors.slice(e0).map((s) => String(s).slice(0, 200)) };
  h.log('repro', out);
}
