// Save critic r6 — hand-crafted save files that PASS the integrity hash (rehashed with the game's own pure hash module)
// but carry hostile / impossible content. Each is imported into a fresh profile (only Level 1 open) and loaded;
// the game must refuse with a clear error or load a sane state — never a page error, a frozen loop or NaN in the sim.
import { rehash, selfCheck, parse } from './gntfixM26-rehash.mjs';
const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';

export default async function (h) {
  const errsNow = () => h.errors.length + h.allErrors.length + (h.timedErrorsLen ? 0 : 0);
  // base files
  await h.open(BASE + '?menu=0&seed=21&fresh=1');
  await h.ready(120);
  await h.sleep(600);
  const baseL1 = await h.ev(async () => {
    const E = window.__echoes;
    E.cmd('startCampaign', { level: 1 });
    const t = performance.now();
    while (performance.now() - t < 20000 && !(E.state().run.phase === 'combat' && E.state().enemies.length > 0)) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 700));
    const r = await E.save.save('manual-1', { name: 'base L1' });
    return { ok: r.ok, text: E.save.exportText('manual-1') };
  });
  await h.open(BASE + '?level=3&seed=4');
  await h.waitFor(() => window.__echoes.state().run.act === 3 && window.__echoes.state().run.phase === 'combat', 40000);
  await h.sleep(900);
  const baseL3 = await h.ev(async () => { const E = window.__echoes; const r = await E.save.save('manual-2', { name: 'base L3' }); return { ok: r.ok, text: E.save.exportText('manual-2') }; });
  h.log('bases', { l1: baseL1.text.length, l3: baseL3.text.length, l1self: selfCheck(baseL1.text), l3self: selfCheck(baseL3.text) });
  const L1 = baseL1.text, L3 = baseL3.text;
  const flipHarness = (val) => (o) => { const walk = (v) => { if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (k === 'harness' && typeof v[k] === 'boolean') v[k] = val; else walk(v[k]); } }; walk(o.state); o.slot.name = 'crafted'; return o; };
  const player = (o) => o.state.registry.entities.find((e) => e && e.kind === 'player');
  const cases = [
    ['identity_L1 (control)', L1, (o) => o],
    ['L3_harness_false (player-like L3 save)', L3, flipHarness(false)],
    ['L3_as_made (harness true)', L3, (o) => o],
    ['L1_harness_true', L1, flipHarness(true)],
    ['meta_level1_state_L3_harness_false', L3, (o) => { flipHarness(false)(o); o.meta.level = 1; o.meta.act = 1; o.meta.levelName = 'The Hollow Wood'; if (o.meta.campaign) { o.meta.campaign.level = 1; o.meta.campaign.startLevel = 1; } return o; }],
    ['player_x_string', L1, (o) => { player(o).x = 'NaN-string'; return o; }],
    ['player_x_null', L1, (o) => { player(o).x = null; return o; }],
    ['player_hp_negative', L1, (o) => { player(o).hp = -50; return o; }],
    ['player_hp_over_max', L1, (o) => { player(o).hp = 1e9; return o; }],
    ['unknown_system', L1, (o) => { o.state.systems.__alien = { a: 1 }; return o; }],
    ['registry_not_array', L1, (o) => { o.state.registry.entities = 'oops'; return o; }],
    ['no_run_system', L1, (o) => { delete o.state.systems.run; return o; }],
    ['no_party_system', L1, (o) => { delete o.state.systems.party; return o; }],
    ['no_rng', L1, (o) => { delete o.state.rng; return o; }],
    ['rng_state_string', L1, (o) => { o.state.rng.s = 'abc'; return o; }],
    ['seat1_six_skills', L1, (o) => { const s = o.state.systems.party.seats[1]; s.slots = s.slots.concat(['taunting_roar', 'iron_stance']); return o; }],
    ['seat1_unknown_skill', L1, (o) => { o.state.systems.party.seats[1].slots[0] = 'no_such_skill'; return o; }],
    ['healer_unknown_skill', L1, (o) => { const sk = o.state.systems.skills; const s = JSON.stringify(sk).replace('"mending_bolt"', '"no_such_skill"'); o.state.systems.skills = JSON.parse(s); return o; }],
    ['wallet_negative', L1, (o) => { const walk = (v) => { if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (k === 'wallet' && typeof v[k] === 'number') v[k] = -500; else walk(v[k]); } }; walk(o.state.systems.run); return o; }],
    ['level_99', L1, (o) => { const c = o.state.systems.run.campaign; if (c) { c.level = 99; } o.state.systems.run.act = 99; return o; }],
    ['room_42', L1, (o) => { o.state.systems.run.room = 42; return o; }],
    ['duplicate_entity_ids', L1, (o) => { const e = o.state.registry.entities; const d = JSON.parse(JSON.stringify(e[e.length - 1])); e.push(d); return o; }],
    ['entities_x3000', L1, (o) => { const e = o.state.registry.entities; const src = e.find((x) => x && x.kind !== 'player' && x.kind !== 'ally') || e[e.length - 1]; let id = o.state.registry.nextOrdinal || 100000; for (let i = 0; i < 3000; i++) { const d = JSON.parse(JSON.stringify(src)); d.id = id++; e.push(d); } o.state.registry.nextOrdinal = id; return o; }],
    ['tick_negative', L1, (o) => { o.state.clock.tick = -100; return o; }],
    ['v_99_tree', L1, (o) => { o.state.v = 99; return o; }],
  ];
  const results = [];
  for (const [name, base, mut] of cases) {
    let text;
    try { text = rehash(base, (o) => { const r = mut(o) || o; r.slot.name = name.slice(0, 30); return r; }); } catch (e) { results.push({ name, craftErr: String(e) }); continue; }
    const selfOk = selfCheck(text);
    await h.open(BASE + '?menu=0&seed=21&fresh=1');
    await h.ready(60);
    await h.sleep(400);
    const e0 = h.errors.length + h.allErrors.length;
    const r = await h.ev(async (text) => {
      const E = window.__echoes;
      const out = { unlocked: E.campaign.unlocked() };
      try { await E.save.save('manual-8', { name: 'Bystander' }); } catch (e) { out.byErr = String(e); }
      let imp; try { imp = await E.save.importText(text); } catch (e) { imp = { threw: String(e) }; }
      out.imp = { ok: imp.ok, error: imp.error, detail: imp.detail && String(imp.detail).slice(0, 160), slotId: imp.slotId };
      if (imp.ok) {
        const t0 = E.tick;
        let ld; try { ld = await E.save.load(imp.slotId); } catch (e) { ld = { threw: String(e) }; }
        out.load = { ok: ld.ok, error: ld.error, message: ld.message && String(ld.message).slice(0, 200), threw: ld.threw };
        out.list = (E.save.list().find((s) => s.id === imp.slotId) || {}).status;
      }
      return out;
    }, text);
    // let the game run 2 s real time (unfrozen) and inspect
    await h.sleep(2000);
    const after = await h.ev(async () => {
      const E = window.__echoes;
      const t1 = E.tick; await new Promise((r) => setTimeout(r, 700)); const t2 = E.tick;
      let nan = 0, cap = null;
      try { cap = E.save.capture(); const s = JSON.stringify(cap, (k, v) => (typeof v === 'number' && Number.isNaN(v) ? (nan++, v) : v)); } catch (e) { cap = 'capture threw ' + e.message; }
      const st = (() => { try { const s = E.state(); const p = E.content.world().player; return { phase: s.run.phase, act: s.run.act, room: s.run.room, active: s.run.active, wallet: s.wallet, px: p && p.x, pz: p && p.z, php: p && p.hp, seat1: s.party ? undefined : undefined }; } catch (e) { return 'state threw ' + e.message; } })();
      let seats = null; try { const c = E.save.capture(); seats = c.systems.party && c.systems.party.seats.map((s) => s && s.slots && s.slots.length); } catch (e) {}
      let by = null; try { const l = await E.save.load('manual-8'); by = l.ok; } catch (e) { by = 'threw ' + e; }
      return { ticking: t2 > t1, dt: t2 - t1, nanCount: nan, st, seats, campaign: (() => { const c = E.campaign.state(); return { active: c.active, level: c.level, harness: c.harness }; })(), bystanderLoad: by, appState: E.app.state, entities: E.entityCount };
    });
    const e1 = h.errors.length + h.allErrors.length;
    const row = { name, selfOk, ...r, after, pageErrorsDuring: e1 - e0, newErrors: h.errors.concat(h.allErrors).slice(e0).map((s) => String(s).slice(0, 160)) };
    results.push(row);
    h.log('case', row);
  }
  h.log('summary', results.map((r) => `${r.name}: import ${r.imp && (r.imp.ok ? 'ok' : r.imp.error)}${r.load ? ' / load ' + (r.load.ok ? 'ok' : r.load.error + ' ' + (r.load.message || '')) : ''} | ticking ${r.after && r.after.ticking} nan ${r.after && r.after.nanCount} pageErr ${r.pageErrorsDuring} | ${r.after && JSON.stringify(r.after.st)} seats ${r.after && JSON.stringify(r.after.seats)} camp ${r.after && JSON.stringify(r.after.campaign)}`));
}
