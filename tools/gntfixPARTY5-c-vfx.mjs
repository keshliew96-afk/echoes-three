// gntcparty5 — class-skill VFX gallery (own captures) + a max-stress Level 3 combat frame for readability.
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntfixPARTY5-lib.mjs';
const out = { casts: [], l3: null };
const b = await launch();
try {
  // A: live run room 1 (real enemies), cast each new class skill with partyCast and capture +4 frames / +250 ms
  const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=11');
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(600);
  await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
  await sleep(800);
  await E(page, () => { const X = window.__echoes; for (const s of [1, 2, 3]) X.cmd('partyPick', s, 'leave');
    [['taunting_roar', 0], ['shield_wall', 1], ['shoulder_charge', 2], ['iron_stance', 3]].forEach(([id, k]) => X.cmd('partySwap', 1, id, k));
    [['fox_step', 0], ['crescent_finisher', 1], ['riposte', 2], ['razor_wake', 3]].forEach(([id, k]) => X.cmd('partySwap', 2, id, k));
    [['vault_shot', 0], ['pinning_arrow', 1], ['rain_of_arrows', 2], ['kestrel_watch', 3]].forEach(([id, k]) => X.cmd('partySwap', 3, id, k));
    X.cmd('draftDecline'); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
  await E(page, () => window.__echoes.content.world().runSystem().choosePath(0));
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await sleep(2500);
  for (const [seat, slot, name] of [[1, 0, 'taunting_roar'], [1, 1, 'shield_wall'], [1, 2, 'shoulder_charge'], [2, 0, 'fox_step'], [2, 1, 'crescent_finisher'], [2, 2, 'riposte'], [3, 0, 'vault_shot'], [3, 1, 'pinning_arrow'], [3, 2, 'rain_of_arrows']]) {
    // hurt someone so Shield Wall has a recipient
    if (name === 'shield_wall') await E(page, () => { const X = window.__echoes; const p = X.state().party; if (p && p[0]) X.cmd('setHp', p[0].id, 0.5); return 1; });
    const r = await E(page, (a) => { const X = window.__echoes; const res = X.cmd('partyCast', a[0], a[1]); const me = (X.state().party || [])[a[0]]; return { res: JSON.stringify(res).slice(0, 200), x: me && me.x, z: me && me.z }; }, [seat, slot]);
    await page.evaluate(() => new Promise((res) => { let n = 0; const f = () => (++n >= 4 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await shot(page, `gntfixPARTY5-vfx-${name}-f4`);
    await sleep(250);
    await shot(page, `gntfixPARTY5-vfx-${name}-250ms`);
    const fx = await E(page, () => { try { return window.__echoes.content.classFx(); } catch (e) { return String(e); } });
    out.casts.push({ name, r, fx: JSON.stringify(fx).slice(0, 300) });
    console.log(name, r.res, JSON.stringify(fx).slice(0, 160));
    await sleep(900);
  }
  out.errorsA = errors;
  await page.close();
  // B: max-stress Level 3 room 3 combat frame
  const { page: p2, errors: e2 } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=4&level=3&partygrant=max');
  await sleep(4000);
  const st = await E(p2, () => { const r = window.__echoes.state().run; return { phase: r.phase, act: r.act, room: r.room }; });
  if (st.phase !== 'combat') { await p2.waitForFunction(() => window.__echoes.campaign && window.__echoes.campaign.ready(3).ready, { timeout: 90000 }).catch(() => null); }
  await E(p2, () => { window.__echoes.cmd('skipToRoom', 3); return 1; });
  await waitFor(p2, () => window.__echoes.state().run.phase === 'combat' && window.__echoes.state().run.room === 3, null, 40000).catch(() => null);
  await sleep(9000);
  await shot(p2, 'gntfixPARTY5-vfx-l3max-9s');
  const shells = await E(p2, () => (window.__echoes.state().party || []).map((p) => ({ cls: p.classId, hp: Math.round(p.hp), shield: p.status && p.status.shield ? JSON.stringify(p.status.shield).slice(0, 80) : null })));
  await sleep(4000);
  await shot(p2, 'gntfixPARTY5-vfx-l3max-13s');
  out.l3 = { st, shells, errors: e2 };
  console.log('L3', JSON.stringify(out.l3).slice(0, 800));
} finally { await b.close(); }
writeJson('gntfixPARTY5-vfx', out);
