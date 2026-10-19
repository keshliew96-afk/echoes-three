// In-page campaign runner (critic-owned): ?menu=0&seed=S, sim frozen, startCampaign({level}), autopilot on,
// sim.stepN in chunks. Per room: mode, layout, ticks to clear, party HP damage taken, downs, enemies spawned by type,
// spawned enemy HP (sum / mean), elites, wave count; per level: outcome, build at the card (skills, sockets filled, bench, Glint).
import { boot, ev, writeJson, BASE, sleep } from './gntccontent4-lib.mjs';
const from = +(process.argv[2] || 1);
const seeds = (process.argv[3] || '1-5').split('-').map(Number);
const list = [];
for (let s = seeds[0]; s <= (seeds[1] || seeds[0]); s++) list.push(s);
const TAG = process.argv[4] ? '-' + process.argv[4] : '';
const out = { from, base: BASE, runs: [] };
const allErrors = [];
for (const seed of list) {
  const { browser, page, errors, consoleLines } = await boot(BASE + `?menu=0&seed=${seed}`);
  const res = await ev(page, async (from, seed) => {
    const E = window.__echoes;
    // a fresh world with this seed
    E.sim.freeze();
    const rooms = [];
    const cards = [];
    let cur = null;
    const party = new Set([0, 1, 2, 3]);
    const off = E.on('*', (e) => {
      const t = e.type;
      if (t === 'room_enter') {
        const st = E.state();
        cur = { level: st.run.act, room: e.room ?? st.run.room, mode: e.mode ?? st.run.mode, layout: st.run.layout && st.run.layout.layoutId, t0: e.tick, dmg: 0, downs: 0, spawns: {}, hpSum: 0, n: 0, elites: 0, waves: 0, clearTick: null, maxLive: 0 };
        rooms.push(cur);
      } else if (!cur) return;
      else if (t === 'hit' && party.has(e.target) && typeof e.amount === 'number') cur.dmg += e.amount;
      else if (t === 'downed') cur.downs++;
      else if (t === 'enemy_spawn' || t === 'boss_spawn') { const k = e.etype || e.kind || (t === 'boss_spawn' ? 'stag' : '?'); cur.spawns[k] = (cur.spawns[k] || 0) + 1; cur.n++; if (typeof e.hp === 'number') cur.hpSum += e.hp; else if (typeof e.maxHp === 'number') cur.hpSum += e.maxHp; if (e.elite) cur.elites++; }
      else if (t === 'wave_start') cur.waves++;
      else if (t === 'room_cleared' && cur.clearTick == null) cur.clearTick = e.tick;
      else if (t === 'level_clear') { cur.clearTick = cur.clearTick ?? e.tick; cur.levelClear = e.tick; }
      else if (t === 'level_transit' || t === 'level_start') {
        const b = E.cmd('buildView');
        cards.push({ type: t, tick: e.tick, level: E.state().run.act, skills: b.skills.map((s) => s.id), filled: b.skills.reduce((a, s) => a + s.filled, 0), live: b.skills.reduce((a, s) => a + s.live, 0), bench: b.bench.length, wallet: E.state().run.wallet, hp: E.state().party.map((m) => m.hp + '/' + m.maxHp).join(' ') });
      } else if (t === 'defeat' || t === 'run_wiped') cur.defeat = e.tick;
    });
    const st0 = E.cmd('startCampaign', { level: from });
    E.cmd('autopilot', true);
    let guard = 0, outcome = null, lastRoomTick = 0;
    const t0 = performance.now();
    while (guard++ < 400) {
      E.sim.stepN(600, null);
      const st = E.state();
      const ph = st.run && st.run.phase;
      if (!st.run || !st.run.active || ph === 'victory' || ph === 'defeat' || (st.run.summary && st.run.summary.result)) {
        outcome = (st.run && (st.run.summary && st.run.summary.result)) || ph || 'ended';
        break;
      }
      if (cur && E.tick - cur.t0 > 60 * 240 && cur.clearTick == null && cur.mode !== 'shop') { outcome = 'stuck'; break; }
      // yield so the page can render / load level assets
      if (guard % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const endState = E.state().run;
    const camp = E.cmd('campaignState');
    off && off();
    E.cmd('autopilot', false);
    try { E.cmd('abandonRun'); } catch {}
    E.sim.thaw();
    return { seed, st0: st0 && st0.act, outcome, endPhase: endState && endState.phase, summary: endState && endState.summary, camp, rooms: rooms.map((r) => ({ ...r, ticks: r.clearTick != null ? r.clearTick - r.t0 : (r.defeat ? r.defeat - r.t0 : null) })), cards, wallMs: Math.round(performance.now() - t0) };
  }, from, seed);
  res.pageErrors = errors.slice();
  res.consoleErrors = consoleLines.filter((l) => /^[error]/.test(l)).slice(0, 10);
  out.runs.push(res);
  const lv = {};
  for (const r of res.rooms) { (lv[r.level] = lv[r.level] || []).push(`${r.room}${r.mode[0]}:${r.ticks == null ? '-' : (r.ticks / 60).toFixed(0) + 's'}/${Math.round(r.dmg)}${r.downs ? 'd' + r.downs : ''}`); }
  console.log(`from ${from} seed ${seed} pageErrors ${errors.length} outcome ${res.outcome} phase ${res.endPhase} wall ${res.wallMs}ms`, JSON.stringify(lv), 'cards', JSON.stringify(res.cards.map((c) => [c.type, c.level, c.skills.length, c.filled, c.bench, c.wallet])));
  allErrors.push(...errors);
  await browser.close();
  out.errors = allErrors;
  writeJson(`gntfixM4a4-camp-from${from}${TAG}.json`, out);
}
out.errors = allErrors;
writeJson(`gntfixM4a4-camp-from${from}${TAG}.json`, out);
console.log('errors', allErrors.length, allErrors.slice(0, 3));
