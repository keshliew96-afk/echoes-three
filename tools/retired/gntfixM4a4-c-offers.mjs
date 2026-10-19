// Every reward offer across full autopilot campaigns: with 4 skills owned no skill is ever offered (substituted by a node with
// the line); skills never exceed 4; per-level node supply (spoils, drafts, purchases, grants) and sockets filled at each Stag entry.
import { boot, ev, writeJson, BASE, sleep } from './gntccontent4-lib.mjs';
const seeds = (process.argv[2] || '1-5').split('-').map(Number);
const out = { runs: [] };
for (let seed = seeds[0]; seed <= (seeds[1] || seeds[0]); seed++) {
  const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`);
  const res = await ev(page, async () => {
    const E = window.__echoes;
    E.sim.freeze();
    const offers = [], maxSkills = [], stag = [], supply = {};
    const off = E.on('*', (e) => {
      if (e.type === 'reward_offer') {
        const owned = E.state().skills.filter(Boolean).length;
        offers.push({ tick: e.tick, level: E.state().run.act, room: e.room, promised: e.promised, reward: e.reward, id: e.id, substituted: !!e.substituted, line: e.line, free: e.freeSkillSlots, owned });
      }
      if (e.type === 'node_granted') { const L = E.state().run.act; const k = L + ':' + e.provenance; supply[k] = (supply[k] || 0) + 1; }
      if (e.type === 'room_enter' && (e.room === 8 || E.state().run.room === 8)) { const b = E.cmd('buildView'); stag.push({ level: E.state().run.act, skills: b.skills.length, filled: b.skills.reduce((a, s) => a + s.filled, 0), owned: b.skills.length * 8, bench: b.bench.length }); }
      if (e.type === 'skill_equip') maxSkills.push(E.state().skills.filter(Boolean).length);
    });
    E.cmd('startCampaign', { level: 1 });
    E.cmd('autopilot', true);
    let g = 0;
    while (g++ < 400) {
      E.sim.stepN(600, null);
      const st = E.state();
      if (!st.run || !st.run.active || st.run.phase === 'victory' || st.run.phase === 'defeat') break;
      if (g % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    off && off();
    const endPhase = E.state().run && E.state().run.phase;
    E.cmd('autopilot', false);
    E.sim.thaw();
    return { offers, maxSkills: Math.max(0, ...maxSkills), stag, supply, endPhase };
  });
  res.seed = seed;
  res.errors = errors.slice();
  out.runs.push(res);
  const bad = res.offers.filter((o) => o.owned >= 4 && o.reward === 'skill');
  console.log(`seed ${seed} ${res.endPhase} offers ${res.offers.length} skillOffersWith4Owned ${bad.length} substituted ${res.offers.filter((o) => o.substituted).length} maxSkills ${res.maxSkills} stag ${JSON.stringify(res.stag)} supply ${JSON.stringify(res.supply)} errors ${errors.length}`);
  await browser.close();
}
writeJson('gntfixM4a4-c-offers.json', out);
