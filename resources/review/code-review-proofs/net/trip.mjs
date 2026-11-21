import { pathToFileURL } from 'node:url';
const here = '/home/claude/echoes-three/';
const u = (p) => pathToFileURL(here + p).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { BOSS_KINDS } = await import(u('src/sim/boss.js'));
const { LEVELS } = await import(u('src/data/levels.js'));

function build(seed) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = { stream: 'gameplay', get seed() { return impl.seed; }, get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(), range: (a, b) => impl.range(a, b), int: (n) => impl.int(n), chance: (p) => impl.chance(p), pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; }, getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); } };
  const registry = createRegistry(); const bus = createEventBus(); const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot; const raw = world.step;
  world.step = (t, snap, ...r) => raw(t, ap && ap.active() ? ap.intents(t, snap) : snap, ...r);
  const io = createStateIO({ clock, rng, registry, world });
  const evs = []; bus.on('*', (e) => { if (e.type !== 'sound') evs.push(canonicalJSON(e)); });
  const step = (n) => { const until = clock.tick + n; let g = 0; while (clock.tick < until && g++ < n * 8) clock.stepOnce((t) => world.step(t, emptySnapshot())); };
  return { world, registry, clock, io, step, evs, run: world.runSystem() };
}
const levelOfBoss = {};
for (const [k, L] of Object.entries(LEVELS)) if (L && L.boss) levelOfBoss[L.boss] = Number(k);
const scen = [];
for (const kind of BOSS_KINDS) scen.push({ name: 'boss:' + kind, setup: (W) => { W.run.startCampaign({ level: levelOfBoss[kind] ?? 5, harness: true, boss: kind }); W.step(30); W.world.cmd('skipToRoom', 8); } , pre: 400 });
scen.push({ name: 'rush', setup: (W) => { W.run.startCampaign({ rush: true, harness: true }); }, pre: 900 });
scen.push({ name: 'kiln-l5', setup: (W) => { W.run.startCampaign({ level: 5, harness: true, road: 'kiln' }); }, pre: 900 });
for (const lv of [4, 5, 6]) scen.push({ name: 'level' + lv, setup: (W) => { W.run.startCampaign({ level: lv, harness: true }); }, pre: 1500 });
const only = process.argv[2];
for (const s of scen) {
  if (only && !s.name.includes(only)) continue;
  try {
    const A = build(9); A.world.cmd('autopilot', true); s.setup(A); A.step(s.pre);
    const tree = A.io.capture(); const h0 = hashState(tree);
    A.evs.length = 0; const hA = []; for (let i = 0; i < 10; i++) { A.step(60); hA.push(hashState(A.io.capture())); }
    const B = build(1234); const r = B.io.apply(tree);
    const hB0 = hashState(B.io.capture());
    B.evs.length = 0; const hB = []; for (let i = 0; i < 10; i++) { B.step(60); hB.push(hashState(B.io.capture())); }
    const div = hA.findIndex((h, i) => h !== hB[i]);
    let ev = null; for (let j = 0; j < Math.max(A.evs.length, B.evs.length); j++) if (A.evs[j] !== B.evs[j]) { ev = { j, a: (A.evs[j]||'').slice(0, 220), b: (B.evs[j]||'').slice(0, 220) }; break; }
    console.log(JSON.stringify({ name: s.name, phase: A.run.view().phase, apply: r.ok, applyErr: r.ok ? null : r.detail, equal0: h0 === hB0, firstDivergentSecond: div, ev }));
  } catch (e) { console.log(JSON.stringify({ name: s.name, error: String(e && e.stack).slice(0, 400) })); }
}
