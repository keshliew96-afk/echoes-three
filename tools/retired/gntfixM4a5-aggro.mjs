// gntccontent5 — "the Tank protects": share of hostile attack starts aimed at each party member over a carried campaign
// (?menu=0&seed=S, frozen sim, autopilot). Starts = telegraph_start / enemy_bite / enemy_fire events whose target is a
// party member (id 0-3). Also the taunt redirect: an enemy taunted (status_apply taunt) whose next attack start within
// 60 ticks goes at the Tank. Usage: node tools/gntccontent5-aggro.mjs <s1-s2>
import { boot, ev, writeJson, BASE } from './gntccontent5-lib.mjs';
const [a, b] = (process.argv[2] || '1-3').split('-').map(Number);
const out = { runs: [] };
for (let seed = a; seed <= (b || a); seed++) {
  const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`);
  const r = await ev(page, async () => {
    const E = window.__echoes;
    E.sim.freeze();
    const shapes = {};
    const by = { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0], 3: [0, 0, 0, 0] };
    const taunted = new Map();
    let redirect = 0, tauntN = 0, level = 1;
    const tgtOf = (e) => e.target ?? e.targetId ?? e.victim ?? e.aimAt ?? null;
    E.on('*', (e) => {
      if (e.type === 'level_start') level = e.level;
      if (/^(telegraph_start|enemy_bite|enemy_fire|enemy_attack|enemy_windup)$/.test(e.type)) {
        if (!shapes[e.type]) shapes[e.type] = JSON.stringify(e).slice(0, 220);
        const t = tgtOf(e);
        if (t != null && t >= 0 && t <= 3) {
          by[level][t]++;
          const src = e.id ?? e.attacker ?? e.attackerId ?? e.source;
          if (taunted.has(src)) { if (t === 1 && E.tick - taunted.get(src) <= 60) redirect++; taunted.delete(src); }
        }
      }
      if (e.type === 'status_apply' && e.status === 'taunt') { tauntN++; taunted.set(e.id, e.tick); }
    });
    E.cmd('startCampaign', { level: 1 });
    E.cmd('autopilot', true);
    let guard = 0, outcome = null;
    while (guard++ < 3000) {
      E.sim.stepN(120, null);
      const st = E.state();
      const ph = st.run && st.run.phase;
      if (!st.run || !st.run.active || ph === 'victory' || ph === 'defeat' || (st.run.summary && st.run.summary.result)) { outcome = (st.run && st.run.summary && st.run.summary.result) || ph; break; }
      if (guard % 20 === 0) await new Promise((res) => setTimeout(res, 0));
    }
    E.cmd('autopilot', false);
    E.sim.thaw();
    return { outcome, by, shapes, tauntN, redirect };
  });
  r.seed = seed;
  r.errors = errors;
  out.runs.push(r);
  const tot = (lv) => r.by[lv].reduce((q, x) => q + x, 0);
  console.log('seed', seed, r.outcome, 'share of attack starts [H,T,S,A] per level', [1, 2, 3].map((lv) => r.by[lv].map((x) => (tot(lv) ? ((100 * x) / tot(lv)).toFixed(1) : '-')).join('/') + ' (n ' + tot(lv) + ')').join('  '), 'taunts', r.tauntN, 'redirected<=60t', r.redirect);
  if (seed === a) console.log('shapes', JSON.stringify(r.shapes).slice(0, 900));
  await browser.close();
}
const sum = [0, 0, 0, 0];
for (const r of out.runs) for (const lv of [1, 2, 3]) r.by[lv].forEach((x, i) => { sum[i] += x; });
const T = sum.reduce((q, x) => q + x, 0);
out.total = { sum, share: sum.map((x) => +((100 * x) / T).toFixed(1)) };
console.log('TOTAL share [H,T,S,A] %', out.total.share.join('/'), 'n', T);
writeJson('gntfixM4a5-aggro.json', out);
