import { launch, open, E, sleep, shot } from './gntfixPARTY5-lib.mjs';
import { readFileSync } from 'node:fs';
const n = Number(process.argv[2] || 2);
const fx = JSON.parse(readFileSync(`captures/gntcsave5-v150-manual-${n}.json`, 'utf8'));
const b = await launch();
try {
  const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=3&fresh=1');
  const r = await E(page, async (fx) => {
    const X = window.__echoes; const S = X.save;
    window.__ev = []; X.on('*', (e) => { if (!/^(hit|ally_basic|move|tick|aura_pulse|enemy_|telegraph|projectile)/.test(e.type)) window.__ev.push(e.type + (e.phase ? ':' + e.phase : '') + (e.reason ? ':' + e.reason : '')); });
    await S.save(fx.slot.id);
    const k = Object.keys(localStorage).find((x) => x === 'echoes.save.v1.' + fx.slot.id);
    localStorage.setItem(k, JSON.stringify(fx));
    const lr = await S.load(fx.slot.id);
    const samples = [];
    for (const ms of [0, 100, 500, 1500, 3000]) { await new Promise((res) => setTimeout(res, ms ? ms - (samples.length ? 0 : 0) : 0)); const run = X.state().run; samples.push({ ms, phase: run.phase, act: run.act, room: run.room, wallet: run.wallet, party: !!run.party, screen: X.runUi().screen }); }
    return { k, lr: lr && { ok: lr.ok, error: lr.error, detail: lr.detail, keys: Object.keys(lr) }, samples, ev: window.__ev.slice(0, 60) };
  }, fx);
  console.log(JSON.stringify(r, null, 1).slice(0, 4000));
  await shot(page, `gntfixPARTY5-fixture${n}`);
  console.log('errors', errors);
} finally { await b.close(); }
