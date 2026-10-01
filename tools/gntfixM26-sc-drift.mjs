// Save critic r6 — CONTENT-ID DRIFT: integrity-valid save files (rehashed with the game's own pure hash module) that
// reference content ids the build does not know (what a save from a build with a renamed / removed skill, node, class,
// enemy or hazard looks like), plus over-cap loadouts. Loaded through the PLAYER path (title -> Load Game -> slot -> Enter).
import { rehash, selfCheck } from './gntfixM26-rehash.mjs';
const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';

export default async function (h) {
  const foc = async () => h.ev(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id }; });
  const navTo = async (id, keys = ['ArrowDown', 'ArrowUp']) => { for (const k of keys) for (let i = 0; i < 16; i++) { if ((await foc()).focus === id) return true; await h.key(k); await h.sleep(100); } return (await foc()).focus === id; };
  const toasts = async () => h.ev(() => [...document.querySelectorAll('[class*="toast"]')].filter((e) => e.offsetParent !== null && e.innerText.trim()).map((e) => e.innerText.trim()).join(' / ').slice(0, 300));
  await h.open(BASE + '?menu=0&seed=21&fresh=1');
  await h.ready(120);
  await h.sleep(600);
  const L1 = await h.ev(async () => {
    const E = window.__echoes;
    E.cmd('startCampaign', { level: 1 });
    const t = performance.now();
    while (performance.now() - t < 20000 && !(E.state().run.phase === 'combat' && E.state().enemies.length > 0)) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 700));
    await E.save.save('manual-1', { name: 'base L1' });
    return E.save.exportText('manual-1');
  });
  await h.open(BASE + '?level=3&seed=4');
  await h.waitFor(() => window.__echoes.state().run.act === 3 && window.__echoes.state().run.phase === 'combat', 40000);
  await h.sleep(900);
  const L3 = await h.ev(async () => { const E = window.__echoes; await E.save.save('manual-2', { name: 'base L3' }); return E.save.exportText('manual-2'); });
  const ent = (o, pred) => o.state.registry.entities.find(pred);
  const cases = [
    ['control_L1', L1, (o) => o],
    ['healer_unknown_skill', L1, (o) => { o.state.systems.skills.slots[0].id = 'no_such_skill'; return o; }],
    ['healer_removed_skill_2nd_slot', L1, (o) => { o.state.systems.skills.slots[1].id = 'retired_skill'; return o; }],
    ['healer_five_skills', L1, (o) => { const s = o.state.systems.skills.slots; while (s.length < 4) s.push(null); for (let i = 0; i < 4; i++) if (!s[i]) s[i] = { id: ['sanctuary', 'spirit_bolt', 'kindred_shield', 'sanctuary'][i], readyTick: 0 }; s.push({ id: 'spirit_bolt', readyTick: 0 }); return o; }],
    ['healer_duplicate_skill', L1, (o) => { o.state.systems.skills.slots[1] = { id: 'mending_bolt', readyTick: 0 }; return o; }],
    ['bench_unknown_node', L1, (o) => { o.state.systems.build.bench.push({ node: 'no_such_node', provenance: 'spoils' }); return o; }],
    ['socket_unknown_node_L3', L3, (o) => { const a = o.state.systems.build.assignments; if (a && a.length) { const s = JSON.stringify(a); o.state.systems.build.assignments = JSON.parse(s.replace(/"node":"[a-z_]+"/, '"node":"no_such_node"')); } return o; }],
    ['seat1_unknown_class', L1, (o) => { o.state.systems.party.seats[1].classId = 'wizard'; return o; }],
    ['seat2_unknown_skill_L3', L3, (o) => { o.state.systems.party.seats[2].slots[0] = 'retired_skill'; return o; }],
    ['seat2_unknown_node_L3', L3, (o) => { const b = o.state.systems.party.seats[2].build; b.bench.push({ node: 'no_such_node', provenance: 'spoils' }); return o; }],
    ['hazard_unknown_type', L1, (o) => { const e = ent(o, (x) => x.kind === 'hazard'); if (e) e.htype = 'no_such_hazard'; return o; }],
    ['enemy_unknown_etype', L1, (o) => { const e = ent(o, (x) => x.etype); if (e) e.etype = 'no_such_enemy'; return o; }],
    ['entity_unknown_kind', L1, (o) => { const e = ent(o, (x) => x.kind === 'keg' || x.kind === 'barricade'); if (e) e.kind = 'no_such_kind'; return o; }],
  ];
  const rows = [];
  for (const [name, base, mut] of cases) {
    const text = rehash(base, (o) => { const r = mut(o) || o; r.slot.name = name.slice(0, 30); r.savedAt = '2026-01-01T00:00:00.000Z'; return r; });
    const row = { name, selfOk: selfCheck(text) };
    await h.open(BASE + '?menu=0&seed=21&fresh=1');
    await h.ready(60);
    await h.sleep(300);
    row.imp = await h.ev(async (text) => { const E = window.__echoes; E.campaign.unlock([1, 2, 3]); await E.save.save('manual-8', { name: 'Bystander' }); const r = await E.save.importText(text); return { ok: r.ok, error: r.error, detail: r.detail && String(r.detail).slice(0, 160), slotId: r.slotId }; }, text);
    if (!row.imp.ok) { rows.push(row); h.log('case', row); continue; }
    // player path: title -> Load Game -> slot -> Enter
    await h.open(BASE);
    await h.sleep(1200);
    await h.gesture();
    await h.sleep(800);
    const e0 = h.errors.length;
    await navTo('ap-title-load'); await h.key('Enter'); await h.sleep(800);
    row.rowText = await h.ev((id) => { const e = document.getElementById('sv-slot-' + id); return e ? e.innerText.replace(/\n+/g, ' | ').slice(0, 200) : null; }, row.imp.slotId);
    await navTo('sv-slot-' + row.imp.slotId);
    await h.key('Enter');
    await h.sleep(3000);
    row.after = await h.ev(async () => {
      const E = window.__echoes;
      const t1 = E.tick; await new Promise((r) => setTimeout(r, 1000)); const t2 = E.tick;
      let st; try { const s = E.state(); st = { phase: s.run.phase, act: s.run.act, room: s.run.room, skills: (E.save.capture().systems.skills.slots || []).map((x) => x && x.id), seats: E.save.capture().systems.party.seats.map((s) => s && s.slots) }; } catch (e) { st = 'state threw ' + e.message; }
      return { app: E.app.state, ticks1s: t2 - t1, st, lastLoad: (() => { try { const l = E.save.lastLoad(); return l && l.slot; } catch (e) { return null; } })() };
    });
    row.toast = await toasts();
    row.pageErrors = h.errors.slice(e0).map((s) => String(s).slice(0, 140));
    // is the player able to leave? Esc -> pause?
    await h.key('Escape'); await h.sleep(700);
    row.escape = await foc();
    await h.shot('drift-' + name);
    rows.push(row);
    h.log('case', row);
  }
  h.log('summary', rows.map((r) => `${r.name}: self ${r.selfOk} import ${r.imp.ok ? 'ok' : r.imp.error + ' ' + r.imp.detail} ${r.after ? `| app ${r.after.app} ticks/1s ${r.after.ticks1s} lastLoad ${r.after.lastLoad} st ${JSON.stringify(r.after.st).slice(0, 220)} | pageErrors ${r.pageErrors.length} ${r.pageErrors[0] || ''} | toast ${r.toast} | Esc -> ${r.escape.stack}` : ''}`));
}
