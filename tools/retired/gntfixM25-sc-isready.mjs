// fix-M2-r5 copy of the save critic r5 probe (BASE via GFM25_BASE) — attribute the three.js "reading 'isReady'" page errors to an operation.
import { install, MOMENTS } from './gntcsave5-lib.mjs';
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  const names = (process.env.GCS5_MOMENTS || 'card,l2mid,act2haz,l3content,built4').split(',');
  const errs = [];
  let cur = 'boot';
  const hookPage = (p) => p.on('pageerror', (e) => errs.push({ op: cur, t: Date.now(), msg: String(e && e.message || e).slice(0, 120) }));
  hookPage(h.page);
  const at = async (op, fn) => { cur = op; const r = await fn(); await h.sleep(2500); return r; };
  const rows = [];
  for (const m of names) {
    const before = errs.length;
    await at(m + ':open', () => h.open(`${BASE}?menu=0&seed=13&fresh=1&freeze=1`));
    await at(m + ':build', async () => { await h.ev(install); return h.ev(`(${MOMENTS[m].toString()})()`); });
    await at(m + ':thaw-render', () => h.ev(() => { window.__echoes.sim.thaw(); return true; }));
    await at(m + ':freeze', () => h.ev(() => { window.__echoes.sim.freeze(); return true; }));
    await at(m + ':save', () => h.ev(async () => (await window.__echoes.save.save('manual-6', { name: 'isready' })).ok));
    await at(m + ':reopen', () => h.open(`${BASE}?menu=0&seed=13`));
    await at(m + ':load', () => h.ev(async () => (await window.__echoes.save.load('manual-6')).ok));
    await at(m + ':play', () => h.sleep(2000));
    rows.push({ m, errs: errs.length - before });
  }
  h.log('attrib', { rows, errs });
}
