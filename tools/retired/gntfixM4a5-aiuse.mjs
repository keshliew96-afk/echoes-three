// gntccontent5 — do AI-held allies USE their equipped skills? In-page carried campaign (?menu=0&seed=S, sim frozen,
// startCampaign({level:1}), autopilot, stepN 120). Per combat room: each ally seat's equipped loadout (tracked through
// swaps), ally_cast per seat+skill, room ticks; at each cast the caster's distance to its target and to the nearest
// hostile (class identity); partyAiLog() at the end. Usage: node tools/gntccontent5-aiuse.mjs <s1-s2>
import { boot, ev, writeJson, BASE } from './gntccontent5-lib.mjs';
const seeds = (process.argv[2] || '1-3').split('-').map(Number);
const list = [];
for (let s = seeds[0]; s <= (seeds[1] || seeds[0]); s++) list.push(s);
const PASSIVE = new Set(['iron_stance', 'razor_wake', 'kestrel_watch', 'warding_aura', 'quiet_hearth']);
const out = { runs: [] };
for (const seed of list) {
  const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`);
  const res = await ev(page, async (seed, PASSIVE) => {
    PASSIVE = new Set(PASSIVE);
    const E = window.__echoes;
    E.sim.freeze();
    const rooms = [];
    let cur = null;
    const dists = { 1: [], 2: [], 3: [] };
    const loadout = () => [1, 2, 3].map((k) => E.cmd('partyView', k).slots.slice());
    const off = E.on('*', (e) => {
      if (e.type === 'room_enter') {
        cur = { level: E.state().run.act, room: e.index, mode: e.mode, t0: e.tick, end: null, lo: loadout(), casts: { 1: {}, 2: {}, 3: {} }, basics: { 1: 0, 2: 0, 3: 0 } };
        rooms.push(cur);
      } else if (!cur) return;
      else if (e.type === 'ally_cast' && e.partyIndex >= 1) {
        cur.casts[e.partyIndex][e.skill] = (cur.casts[e.partyIndex][e.skill] || 0) + 1;
        const st = E.state();
        const hs = st.enemies.filter((x) => x.hp > 0);
        const near = hs.length ? Math.min(...hs.map((x) => Math.hypot(x.x - e.x, x.z - e.z))) : null;
        const tg = hs.find((x) => x.id === e.target);
        dists[e.partyIndex].push({ skill: e.skill, near: near == null ? null : +near.toFixed(2), tgt: tg ? +Math.hypot(tg.x - e.x, tg.z - e.z).toFixed(2) : null, combo: e.combo ?? null });
      } else if (e.type === 'ally_basic' && e.partyIndex >= 1) cur.basics[e.partyIndex]++;
      else if ((e.type === 'room_cleared' || e.type === 'level_clear' || e.type === 'defeat') && cur.end == null) cur.end = e.tick;
      else if (e.type === 'party_commit' || e.type === 'skill_swapped') cur.lo2 = loadout();
    });
    E.cmd('startCampaign', { level: 1 });
    E.cmd('autopilot', true);
    let guard = 0, outcome = null;
    while (guard++ < 3000) {
      E.sim.stepN(120, null);
      const st = E.state();
      const ph = st.run && st.run.phase;
      if (!st.run || !st.run.active || ph === 'victory' || ph === 'defeat' || (st.run.summary && st.run.summary.result)) { outcome = (st.run && st.run.summary && st.run.summary.result) || ph || 'ended'; break; }
      if (guard % 20 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    let aiLog = null;
    try { aiLog = E.cmd('partyAiLog'); } catch (er) { aiLog = String(er); }
    off && off();
    E.cmd('autopilot', false);
    E.sim.thaw();
    // idle equipped actives: combat rooms >= 1200 ticks, a skill equipped for the whole room (in lo and lo2 if any) with 0 casts
    const idle = [];
    let pairs = 0;
    for (const r of rooms) {
      if (r.mode === 'shop' || r.end == null) continue;
      const dur = r.end - r.t0;
      if (dur < 1200) continue;
      for (const seat of [1, 2, 3]) {
        const eq = r.lo[seat - 1].filter((s) => !PASSIVE.has(s) && (!r.lo2 || r.lo2[seat - 1].includes(s)));
        for (const s of eq) { pairs++; if (!r.casts[seat][s]) idle.push({ level: r.level, room: r.room, mode: r.mode, seat, skill: s, sec: +(dur / 60).toFixed(1) }); }
      }
    }
    const perSkill = {};
    for (const r of rooms) for (const seat of [1, 2, 3]) for (const [s, n] of Object.entries(r.casts[seat])) perSkill[s] = (perSkill[s] || 0) + n;
    return { seed, outcome, rooms: rooms.map((r) => ({ level: r.level, room: r.room, mode: r.mode, sec: r.end != null ? +((r.end - r.t0) / 60).toFixed(1) : null, lo: r.lo, casts: r.casts, basics: r.basics })), idle, pairs, perSkill, dists, aiLog: typeof aiLog === 'string' ? aiLog : JSON.stringify(aiLog).slice(0, 4000) };
  }, seed, [...PASSIVE]);
  res.errors = errors;
  out.runs.push(res);
  const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  console.log(`seed ${seed} ${res.outcome} idle ${res.idle.length}/${res.pairs} errors ${errors.length}`, JSON.stringify(res.idle.slice(0, 12)));
  console.log('  medians: sword tgt', med(res.dists[2].map((d) => d.tgt)), 'archer near', med(res.dists[3].map((d) => d.near)), 'sword near', med(res.dists[2].map((d) => d.near)), 'tank near', med(res.dists[1].map((d) => d.near)));
  console.log('  perSkill', JSON.stringify(res.perSkill));
  await browser.close();
  writeJson('gntfixM4a5-aiuse.json', out);
}
