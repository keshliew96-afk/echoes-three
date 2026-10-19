// gntccontent5 — how much of each combat room is each party member under a shield shell? Carried campaign in page
// (?menu=0&seed=S, frozen sim, autopilot, stepN 30); every 30 ticks inside combat rooms: which members carry a live
// shield (tracked from status_apply shield {id, untilTick} and shield_broken {id}); per level coverage % per member.
import { boot, ev, writeJson, BASE } from './gntccontent5-lib.mjs';
const seeds = (process.argv[2] || '1-2').split('-').map(Number);
const out = { runs: [] };
for (let seed = seeds[0]; seed <= (seeds[1] || seeds[0]); seed++) {
  const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`);
  const r = await ev(page, async () => {
    const E = window.__echoes;
    E.sim.freeze();
    const until = new Map();
    let inCombat = false, level = 1;
    const cov = {};
    const brokenSample = [];
    E.on('*', (e) => {
      if (e.type === 'status_apply' && e.status === 'shield' && (e.kind === 'ally' || e.kind === 'player')) until.set(e.id, Math.max(until.get(e.id) || 0, e.untilTick));
      else if (e.type === 'shield_broken') { if (brokenSample.length < 3) brokenSample.push(JSON.stringify(e).slice(0, 160)); const id = e.id ?? e.target ?? e.targetId; if (id != null) until.set(id, 0); }
      else if (e.type === 'room_enter') { inCombat = e.mode !== 'shop'; level = E.state().run.act; }
      else if (e.type === 'room_cleared' || e.type === 'level_clear') inCombat = false;
    });
    E.cmd('startCampaign', { level: 1 });
    E.cmd('autopilot', true);
    let guard = 0, outcome = null;
    while (guard++ < 12000) {
      E.sim.stepN(30, null);
      const st = E.state();
      if (inCombat && st.run.phase === 'combat') {
        const c = (cov[level] = cov[level] || { n: 0, on: [0, 0, 0, 0] });
        c.n++;
        st.party.forEach((p, i) => { if ((until.get(p.id) || 0) > E.tick && !p.downed) c.on[i]++; });
      }
      const ph = st.run && st.run.phase;
      if (!st.run || !st.run.active || ph === 'victory' || ph === 'defeat' || (st.run.summary && st.run.summary.result)) { outcome = (st.run && st.run.summary && st.run.summary.result) || ph; break; }
      if (guard % 80 === 0) await new Promise((res) => setTimeout(res, 0));
    }
    E.cmd('autopilot', false);
    E.sim.thaw();
    const pct = {};
    for (const [lv, c] of Object.entries(cov)) pct[lv] = c.on.map((x) => +((100 * x) / c.n).toFixed(1));
    return { outcome, pct, samples: Object.fromEntries(Object.entries(cov).map(([k, c]) => [k, c.n])), brokenSample };
  });
  r.seed = seed;
  r.errors = errors;
  out.runs.push(r);
  console.log('seed', seed, r.outcome, 'shield coverage % [healer, tank, sword, archer] by level', JSON.stringify(r.pct), 'samples', JSON.stringify(r.samples), r.brokenSample[0]);
  await browser.close();
}
writeJson('gntfixM4a5-shellcover.json', out);
