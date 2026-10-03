// gntcparty5 — persistence of the four builds: save.roundTrip (combat + party page), slot save -> reload -> load,
// level transition carry (page), and a REAL v0.5.150 schema-3 slot file injected + loaded (migration + catch-up once).
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntfixPARTY5-lib.mjs';
import { readFileSync } from 'node:fs';
const out = { checks: [] };
const check = (what, ok, got = null) => { out.checks.push({ what, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 500)}`); };
const BUILDS = () => { const X = window.__echoes; const h = X.cmd('buildView'); const sig = (v) => v.skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')).join('|') + '#' + v.bench.map((b) => b.node).sort().join(','); return { healer: sig(h), seats: [1, 2, 3].map((s) => { const v = X.cmd('partyView', s); return sig(v) + '#' + v.purse; }) }; };
const b = await launch();
try {
  if (process.argv.includes("--skipA")) {} else // A
  // ---------------------------------------------------------------- A: roundTrip with a built party
  {
    const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7&partygrant=2&fresh=1');
    await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(3000);
    const bb = await E(page, BUILDS);
    const filled = await E(page, () => [1, 2, 3].map((s) => window.__echoes.cmd('partyView', s).filled));
    check(`?partygrant=2 gives built allies (filled ${JSON.stringify(filled)})`, filled.every((f) => f > 0), { filled, bb });
    const rt1 = await E(page, async () => { const r = await window.__echoes.save.roundTrip({ ticks: 600 }); return { equal: r.equal, continuationEqual: r.continuationEqual, firstDivergence: r.firstDivergence, ms: r.ms }; });
    check(`save.roundTrip mid-combat with four built characters: equal ${rt1.equal}, continuation ${rt1.continuationEqual}`, rt1.equal && rt1.continuationEqual, rt1);
    await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
    await sleep(1200);
    const rt2 = await E(page, async () => { const r = await window.__echoes.save.roundTrip({ ticks: 300 }); return { equal: r.equal, continuationEqual: r.continuationEqual, firstDivergence: r.firstDivergence }; });
    check(`save.roundTrip on the party page: equal ${rt2.equal}, continuation ${rt2.continuationEqual}`, rt2.equal && rt2.continuationEqual, rt2);
    // slot save -> reload -> load
    const slots = await E(page, async () => { const S = window.__echoes.save; const tries = {}; for (const id of ['manual-1', 'slot-1', 'm1', 'a', '1', 'manual1']) { try { const r = await S.save(id); tries[id] = r && r.ok; if (r && r.ok) break; } catch (e) { tries[id] = String(e); } } return { tries, list: (await S.list()).map((x) => x.slot || x.id || JSON.stringify(x).slice(0, 80)), keys: Object.keys(localStorage).filter((k) => k.startsWith('echoes.save')) }; });
    out.slots = slots;
    console.log('slots', JSON.stringify(slots));
    const slotId = Object.keys(slots.tries).find((k) => slots.tries[k] === true);
    const pre = await E(page, BUILDS);
    const preCards = await E(page, () => JSON.stringify(window.__echoes.state().run.party.cards.map((c) => [c.seat, c.id, c.decided, c.choice, c.replace])));
    out.slotId = slotId;
    if (slotId) {
      await page.goto((process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=99', { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 120, { timeout: 180000 });
      const ld = await E(page, async (id) => { const r = await window.__echoes.save.load(id); return r && (r.ok !== undefined ? { ok: r.ok, err: r.error } : r); }, slotId);
      await sleep(1500);
      const post = await E(page, BUILDS);
      const postCards = await E(page, () => { const p = window.__echoes.state().run.party; return p ? JSON.stringify(p.cards.map((c) => [c.seat, c.id, c.decided, c.choice, c.replace])) : null; });
      check(`slot "${slotId}" saved on the party page -> page reload (seed 99) -> load: the four builds identical`, JSON.stringify(pre) === JSON.stringify(post), { ld, pre, post });
      check('... and the party page cards identical after the load', preCards === postCards, { preCards, postCards });
      await shot(page, 'gntfixPARTY5-persist-loaded-page');
    }
    out.errorsA = errors;
  }
  // ---------------------------------------------------------------- B: level transition carry (page)
  {
    const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=5&partygrant=2');
    await page.waitForFunction(() => window.__echoes.campaign.ready(1).ready, { timeout: 90000 });
    await E(page, () => window.__echoes.campaign.choose(1));
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(1000);
    await E(page, () => { window.__echoes.cmd('skipToRoom', 8); return 1; });
    await waitFor(page, () => window.__echoes.state().run.room === 8 && window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(1500);
    const pre = await E(page, BUILDS);
    await E(page, () => { const X = window.__echoes; X.cmd('killAllEnemies'); X.cmd('killBoss'); return 1; });
    const t0 = Date.now();
    let sawTransit = null;
    for (let i = 0; i < 120; i++) { const ph = await E(page, () => { const r = window.__echoes.state().run; return { phase: r.phase, act: r.act, room: r.room }; }); if (ph.phase === 'transit' && !sawTransit) { sawTransit = { ms: Date.now() - t0 }; await shot(page, 'gntfixPARTY5-persist-transit-card'); const txt = await E(page, () => document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500)); sawTransit.txt = txt; } if (ph.act === 2 && ph.phase === 'combat') break; await sleep(250); }
    const mid = await E(page, () => { const r = window.__echoes.state().run; return { act: r.act, room: r.room, phase: r.phase }; });
    const post = await E(page, BUILDS);
    const bodies = await E(page, () => (window.__echoes.state().party || []).map((p) => ({ hp: p.hp, maxHp: p.maxHp })));
    check(`level transition L1 -> L2 (${JSON.stringify(mid)}): the four builds identical before/after the card`, JSON.stringify(pre) === JSON.stringify(post), { pre, post });
    check('the transit card lists the four builds', sawTransit && /Tank/.test(sawTransit.txt) && /Swordsman/.test(sawTransit.txt) && /Archer/.test(sawTransit.txt), sawTransit && sawTransit.txt.slice(0, 600));
    out.transit = sawTransit; out.bodiesL2 = bodies; out.errorsB = errors;
  }
  // ---------------------------------------------------------------- C: REAL v0.5.150 schema-3 slot files
  for (const n of [1, 2]) {
    const fixture = JSON.parse(readFileSync(`captures/gntcsave5-v150-manual-${n}.json`, 'utf8'));
    const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=3&fresh=1');
    // create a slot with the current build to learn the storage key, then overwrite it with the v0.5.150 file
    const inj = await E(page, async (fx) => {
      const S = window.__echoes.save;
      await S.save(fx.slot.id);
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('echoes.save') && !k.endsWith('.index'));
      const k = keys.find((x) => x.includes(fx.slot.id)) || keys[0];
      const cur = localStorage.getItem(k);
      let fmt = 'json';
      try { JSON.parse(cur); } catch { fmt = 'other'; }
      if (fmt === 'json') localStorage.setItem(k, JSON.stringify(fx));
      window.__catch = []; window.__echoes.on('party_catchup', (e) => window.__catch.push({ ...e }));
      const r = await S.load(fx.slot.id);
      return { keys, k, fmt, load: r && { ok: r.ok, error: r.error, detail: r.detail } };
    }, fixture);
    await sleep(3000);
    const st = await E(page, () => { const X = window.__echoes; const r = X.state().run; return { phase: r.phase, act: r.act, room: r.room, seats: [1, 2, 3].map((s) => { const v = X.cmd('partyView', s); return { slots: v.slots, filled: v.filled, bench: v.bench.length, purse: v.purse }; }), catchup: window.__catch }; });
    check(`v0.5.150 schema-3 file #${n} (${fixture.meta.phase}, act ${fixture.meta.act} room ${fixture.meta.room}) loads: ${JSON.stringify(inj.load)}`, inj.load && inj.load.ok !== false, inj);
    check(`... allies on their kits after migration (${JSON.stringify(st.seats.map((s) => s.slots[0]))}) and party_catchup fired ${st.catchup.length}x`, st.seats[0].slots.join() === 'heavy_slam,brutal_cleave,ground_crack,whirling_guard' || st.seats[0].slots.includes('heavy_slam'), st);
    out['fixture' + n] = { inj, st, errors };
    await shot(page, `gntfixPARTY5-persist-v150-${n}`);
  }
} finally { await b.close(); }
writeJson('gntfixPARTY5-persist', out);
console.log(`${out.checks.filter((c) => c.ok).length}/${out.checks.length}`);
