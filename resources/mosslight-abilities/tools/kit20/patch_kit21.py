# Kit 2.1 (Kesh 18 Nov 03:30 UTC: Forest Spirit and Sapping Vine removed, "re-design one" each).
# Design thread specs S70 Rootweb and S71 Snapjaw (MOSSLIGHT_SKILL_KIT.md; K17 to K19 of the 2.0 changes).
# REVIEW-ONLY: built on the patched copy, never committed.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)

patch('src/sim/skills.js', [
    ("  add('drowsy_spores', 'Drowsy Spores', 'DS',",
     "  add('snapjaw', 'Snapjaw', 'SJ', { archetype: 'damage', power: 14, cd: 12, range: 5, area: 2 }); // S71 (kit 2.1)\n  add('rootweb', 'Rootweb', 'RW', { archetype: 'passive', shape: 'aura', power: 0, area: 6, cadenceSec: 1.0 }); // S70 (kit 2.1)\n  add('drowsy_spores', 'Drowsy Spores', 'DS',"),
    ("    if (skillId === 'forest_spirit') return [];", "    if (skillId === 'forest_spirit' || skillId === 'rootweb') return [];"),
])
patch('src/render/skillfx/content.js', [
    ("'drowsy_spores', 'forest_spirit'].includes(ev.skill)) return;", "'drowsy_spores', 'forest_spirit', 'snapjaw', 'rootweb'].includes(ev.skill)) return;"),
])

SIM = r"""
  // ---- REVIEW-ONLY: kit 2.1 (Kesh 18 Nov 03:30 UTC; design thread S70, S71) ----
  // S71 Snapjaw: a flytrap that bites one foe at a time and holds it; fruit to the most hurt ally.
  // S70 Rootweb: a passive; each plant links to the nearest other plant within 6 u by a root line.
  const K21 = Object.freeze({
    snap: { grow: 24, ticks: 600, every: 150, reach: 2.0, hold: 72, bossExposed: 0.2, bossTicks: 120, fruit: 6, fruitReach: 6, seedReach: 3, seedMax: 3, seedBite: 4, seedReachAdd: 0.3, sleepMul: 1.5 },
    web: { reach: 6, width: 0.6, heal: 3, slow: 0.3, slowTicks: 120, dmg: 6, more: 120 },
  });
  const snaps = [];
  globalThis.__reviewSnaps = snaps;
  function snapCast(def, power) {
    const a = aimAt(def.range);
    for (const old of snaps.splice(0)) events.emit(currentTick, 'review_snap_end', { id: old.id });
    const s = { id: ++kitIds, kind: 'snap', x: a.x, z: a.z, grown: currentTick + K21.snap.grow, until: currentTick + K21.snap.grow + K21.snap.ticks, next: 0, bite: power || 14, reach: K21.snap.reach, held: null, ate: 0 };
    for (const sd of nearSeeds(s.x, s.z, K21.snap.seedReach, K21.snap.seedMax)) { // J1: it eats seeds and grows
      useSeed(sd, 'snap', s);
      s.ate += 1;
      s.bite += K21.snap.seedBite;
      s.reach = r2(s.reach + K21.snap.seedReachAdd);
    }
    snaps.push(s);
    events.emit(currentTick, 'review_snap', { id: s.id, x: r2(s.x), z: r2(s.z), fromX: r2(player.x), fromZ: r2(player.z), reach: s.reach, ate: s.ate, grow: K21.snap.grow / 60, secs: K21.snap.ticks / 60 });
  }
  function snapSwallow(s, x, z) { // J2: a foe that falls in its jaws bursts out as a seed
    events.emit(currentTick, 'review_snap_swallow', { id: s.id, x: r2(x), z: r2(z) });
    dropSeed(s.x, s.z, { x: s.x, z: s.z });
  }
  function snapTick() {
    for (let i = snaps.length - 1; i >= 0; i--) {
      const s = snaps[i];
      if (s.held) {
        const e = s.held.e;
        if (!(e.hp > 0)) { snapSwallow(s, s.held.x, s.held.z); s.held = null; }
        else if (currentTick >= s.held.until) s.held = null;
        else { e.x = s.held.x; e.z = s.held.z; e.kbVx = 0; e.kbVz = 0; } // held in its jaws
      }
      if (currentTick >= s.until) { snaps.splice(i, 1); events.emit(currentTick, 'review_snap_end', { id: s.id }); continue; }
      if (currentTick < s.grown || currentTick < s.next) continue;
      const foes = foesIn(s.x, s.z, s.reach);
      if (!foes.length) continue;
      const sleepers = foes.filter((e) => e.reviewSleepUntil > currentTick); // J3: sleepers first
      const pool = sleepers.length ? sleepers : foes;
      const f = pool.sort((p, q) => Math.hypot(p.x - s.x, p.z - s.z) - Math.hypot(q.x - s.x, q.z - s.z))[0];
      const asleep = f.reviewSleepUntil > currentTick;
      const dmg = Math.round(s.bite * (asleep ? K21.snap.sleepMul : 1));
      s.next = currentTick + (s.fastUntil > currentTick ? Math.round(K21.snap.every / 1.5) : K21.snap.every);
      events.emit(currentTick, 'review_snap_bite', { id: s.id, target: f.id, x: r2(f.x), z: r2(f.z), dmg, asleep });
      hit(f, dmg, 'snapjaw');
      if (!(f.hp > 0)) snapSwallow(s, f.x, f.z);
      else if (bossy(f)) { combat.status.apply(f, 'exposed', K21.snap.bossExposed, K21.snap.bossTicks, currentTick, player.id); events.emit(currentTick, 'review_k20_status', { target: f.id, kind: 'exposed', secs: K21.snap.bossTicks / 60 }); }
      else { combat.status.apply(f, 'stun', 1, K21.snap.hold, currentTick, player.id); s.held = { e: f, x: f.x, z: f.z, until: currentTick + K21.snap.hold }; }
      const m = hurtNear(s.x, s.z, K21.snap.fruitReach, true);
      if (m) fly('fruit', s.x, s.z, m, false, K21.snap.fruit, 'snapjaw:fruit', 8 / 60);
    }
  }
  const web = { links: [], tripNext: new Map(), healNext: new Map() };
  globalThis.__reviewWeb = web;
  function webPlants() {
    const ps = [];
    const gm = cb.gem;
    if (gm && gm.planted && gm.phase !== 'home') ps.push({ q: gm, x: gm.x, z: gm.z, staff: true });
    for (const q of [...spitters, ...saplings, ...puffs, ...oaklings, ...snaps]) ps.push({ q, x: q.x, z: q.z });
    for (const o of oaks) if (currentTick >= o.grown) ps.push({ q: o, x: o.x, z: o.z, oak: o.r });
    return ps;
  }
  function webTick() {
    const on = !!(player.skills && player.skills.includes('rootweb') && player.hp > 0);
    if (!on) { web.links = []; return; }
    const ps = webPlants();
    ps.forEach((p, i) => { p.i = i; });
    const pairs = new Map();
    const add = (a, b) => { const k = a.i < b.i ? `${a.i}|${b.i}` : `${b.i}|${a.i}`; if (!pairs.has(k)) pairs.set(k, [a, b]); };
    for (const p of ps) {
      let best = null;
      let bd = K21.web.reach;
      for (const o of ps) { if (o === p) continue; const d = Math.hypot(o.x - p.x, o.z - p.z); if (d <= bd) { bd = d; best = o; } }
      if (best) add(p, best);
      if (p.oak) for (const o of ps) if (o !== p && Math.hypot(o.x - p.x, o.z - p.z) <= p.oak) add(p, o); // W2: the oak links every plant under its crown
    }
    web.links = [...pairs.values()].map(([a, b]) => ({ ax: a.x, az: a.z, bx: b.x, bz: b.z, a: a.q, b: b.q }));
    for (const [a, b] of pairs.values()) for (const p of [a, b]) { // a linked plant lives 2 s longer, once (the planted staff keeps its 5 s: my reading)
      if (p.staff || p.q.webbed || p.q.until == null) continue;
      p.q.webbed = true;
      p.q.until += K21.web.more;
      events.emit(currentTick, 'review_web_link', { x: r2(p.x), z: r2(p.z) });
    }
    if (!web.links.length) return;
    const half = K21.web.width / 2;
    const onLine = (e) => web.links.some((l) => segDist(e.x, e.z, l.ax, l.az, l.bx, l.bz) <= half);
    for (const e of party()) {
      if (!onLine(e) || currentTick < (web.healNext.get(e.id) ?? 0)) continue;
      web.healNext.set(e.id, currentTick + 60);
      healLanded(e, K21.web.heal, { healer: player.id, source: 'rootweb', critBonus: -1 });
    }
    for (const e of registry.all()) {
      if (!foeOk(e) || !onLine(e)) continue;
      if (!bossy(e)) combat.status.apply(e, 'slow', K21.web.slow, K21.web.slowTicks, currentTick, player.id);
      if (currentTick < (web.tripNext.get(e.id) ?? 0)) continue;
      web.tripNext.set(e.id, currentTick + 60);
      events.emit(currentTick, 'review_web_trip', { target: e.id, x: r2(e.x), z: r2(e.z) });
      events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'slow', secs: K21.web.slowTicks / 60 });
      hit(e, K21.web.dmg, 'rootweb');
    }
  }
  // S50 Elder Oak: a great oak; allies under its crown heal, foes are slowed, plants do not wither.
"""
patch('src/sim/world.js', [
    ("\n  // S50 Elder Oak: a great oak; allies under its crown heal, foes are slowed, plants do not wither.\n", SIM),
    ("  function kit3Tick() { spitTick(); heartTick(); gustTick(); swarmTick(); spearTick(); fallTick(); snareTick(); puffTick(); kit4Tick(); }",
     "  function kit3Tick() { spitTick(); heartTick(); gustTick(); swarmTick(); spearTick(); fallTick(); snareTick(); puffTick(); kit4Tick(); snapTick(); webTick(); } // kit 2.1: Snapjaw, Rootweb"),
    ("drowsy_spores: sleepCast }; // kit 1.9", "drowsy_spores: sleepCast, snapjaw: snapCast }; // kit 2.1 S71 Snapjaw; kit 1.9"),
    ("  const HELPER_SRC = new Set(['lantern_flurry', 'restorative_wave', 'lantern_ward', 'dawn_brand', 'quiet_hearth']);",
     "  const HELPER_SRC = new Set(['lantern_flurry', 'restorative_wave', 'lantern_ward', 'dawn_brand', 'quiet_hearth', 'snapjaw']); // kit 2.1: the Snapjaw is a helper (A5)"),
    # S49: it is a plant: water, the Elder Oak, Wild Thicket
    ("    for (const q of [...spitters, ...saplings, ...oaklings]) {\n      if (!test(q) || !wet(q, q.x, q.z)) continue;",
     "    for (const q of [...spitters, ...saplings, ...oaklings, ...snaps]) { // kit 2.1: the Snapjaw is a plant\n      if (!test(q) || !wet(q, q.x, q.z)) continue;"),
    ("      for (const q of [...spitters, ...saplings, ...oaklings, ...hedges]) if (under(q)) q.until += 1; // nothing withers under the crown",
     "      for (const q of [...spitters, ...saplings, ...oaklings, ...hedges, ...snaps]) if (under(q)) q.until += 1; // nothing withers under the crown"),
    ("      const plants = [...spitters, ...saplings, ...oaklings, ...puffs];\n      if (gm && gm.planted && gm.phase !== 'home') plants.push(gm);",
     "      const plants = [...spitters, ...saplings, ...oaklings, ...puffs, ...snaps];\n      if (gm && gm.planted && gm.phase !== 'home') plants.push(gm);"),
    # W1: water runs through the web
    ("      events.emit(currentTick, 'review_hot', { target: h.t.id, skill: h.skill, secs: h.left });\n    }\n  }\n",
     """      events.emit(currentTick, 'review_hot', { target: h.t.id, skill: h.skill, secs: h.left });
    }
    if (!waterWhere.chain && web.links.length) { // kit 2.1 W1: watering one plant waters every plant linked to it, in a chain
      waterWhere.chain = true;
      try {
        for (let n = 0; n < 12; n++) {
          const next = new Set();
          for (const l of web.links) {
            if (l.a.watered && !l.b.watered && !oaks.includes(l.b)) next.add(l.b);
            if (l.b.watered && !l.a.watered && !oaks.includes(l.a)) next.add(l.a);
          }
          if (!next.size) break;
          for (const q of next) { events.emit(currentTick, 'review_web_water', { x: r2(q.x), z: r2(q.z) }); waterWhere((t) => t === q); q.watered = true; }
        }
      } finally { waterWhere.chain = false; }
    }
  }
"""),
])

FX = r"""
  // ---- REVIEW-ONLY: kit 2.1 (Kesh 18 Nov): S71 Snapjaw (a stand-in flytrap) and S70 Rootweb (root lines) ----
  const snapObjs = new Map();
  const SNAP_GREEN = '#7FB069';
  const SNAP_INSIDE = '#E8A6AE';
  bus.on('review_snap', (ev) => {
    const g = new Group();
    const base = new Mesh(new CylinderGeometry(0.16, 0.22, 0.12, 9), mat('#C9A46A')); // honey wood, like her other plants
    base.position.y = 0.06;
    const stem = new Mesh(new CylinderGeometry(0.05, 0.07, 0.42, 7), mat('#6E9A4E'));
    stem.position.y = 0.3;
    const head = new Group();
    head.position.y = 0.55;
    const jaw = (up) => {
      const pv = new Group();
      const shell = new Mesh(new SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(SNAP_GREEN, 1, { emissive: '#2E6B34', emissiveIntensity: 0.25 }));
      const lip = new Mesh(new SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(SNAP_INSIDE, 1, { side: DoubleSide }));
      lip.scale.y = 0.6;
      if (!up) { shell.rotation.x = Math.PI; lip.rotation.x = Math.PI; }
      pv.add(shell, lip);
      return pv;
    };
    const top = jaw(true);
    const bot = jaw(false);
    head.add(top, bot);
    const ribbon = new Mesh(new CylinderGeometry(0.075, 0.075, 0.05, 8), mat('#C8643C')); // her terracotta ribbon
    ribbon.position.y = 0.45;
    g.add(base, stem, ribbon, head);
    const ring = flat(new RingGeometry(ev.reach - 0.04, ev.reach, 48), DMG_DEEP, 0);
    ring.position.y = 0.03;
    g.add(ring);
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    const big = 1 + 0.15 * (ev.ate || 0);
    snapObjs.set(ev.id, { g, head, top, bot, ring, t: 0, grow: ev.grow || 0.4, big, bite: null, end: null, aim: 0 });
    burst(ev.x, 0.15, ev.z, '#8CC46E', 6, 0.1);
  });
  bus.on('review_snap_bite', (ev) => {
    const o = snapObjs.get(ev.id);
    if (!o) return;
    o.bite = 0;
    o.aim = Math.atan2(ev.x - o.g.position.x, ev.z - o.g.position.z);
    o.tx = ev.x; o.tz = ev.z;
    burst(ev.x, 0.5, ev.z, DMG, ev.asleep ? 9 : 6, 0.1);
  });
  bus.on('review_snap_swallow', (ev) => {
    const o = snapObjs.get(ev.id);
    if (o) burst(o.g.position.x, 0.7, o.g.position.z, '#8CC46E', 8, 0.12);
  });
  bus.on('review_snap_end', (ev) => { const o = snapObjs.get(ev.id); if (o) o.end = 0; });
  function snapUpdate(dt) {
    for (const [id, o] of snapObjs) {
      o.t += dt;
      let k = Math.min(1, o.t / o.grow) * o.big;
      if (o.end != null) { o.end += dt; k *= Math.max(0, 1 - o.end / 0.35); if (o.end > 0.35) { root.remove(o.g); snapObjs.delete(id); continue; } }
      o.g.scale.setScalar(Math.max(0.01, k));
      let open = 0.55 + 0.08 * Math.sin(o.t * 3);
      let lean = 0;
      if (o.bite != null) {
        o.bite += dt;
        const b = o.bite;
        open = b < 0.12 ? 0.9 : b < 0.22 ? 0.9 * (1 - (b - 0.12) / 0.1) : b < 1.2 ? 0.02 : 0.02 + Math.min(0.55, (b - 1.2) * 2);
        lean = b < 0.22 ? b / 0.22 : b < 1.2 ? 1 : Math.max(0, 1 - (b - 1.2) * 3);
        if (b > 1.6) o.bite = null;
      }
      o.head.rotation.y = o.aim;
      o.head.rotation.x = 0.9 * lean;
      o.head.position.z = 0;
      o.top.rotation.x = -open;
      o.bot.rotation.x = open * 0.5;
      o.ring.material.opacity = 0.16 * Math.min(1, o.t * 3);
    }
  }
  const webLines = [];
  bus.on('review_web_trip', (ev) => { burst(ev.x, 0.15, ev.z, '#9A7444', 6, 0.08); burst(ev.x, 0.3, ev.z, DMG, 3, 0.07); });
  bus.on('review_web_link', (ev) => burst(ev.x, 0.2, ev.z, PALETTE.brightHeal, 4, 0.07));
  bus.on('review_web_water', (ev) => burst(ev.x, 0.3, ev.z, WATER, 6, 0.09));
  function webUpdate(dt) {
    const links = (globalThis.__reviewWeb && globalThis.__reviewWeb.links) || [];
    while (webLines.length < links.length) {
      const ridge = flat(new PlaneGeometry(1, 1), '#8A6A3A', 0.8);
      const vein = flat(new PlaneGeometry(1, 1), PALETTE.brightHeal, 0.35);
      const pulse = sprite(PALETTE.brightHeal);
      pulse.scale.setScalar(0.28);
      root.add(ridge, vein, pulse);
      webLines.push({ ridge, vein, pulse, t: Math.random() });
    }
    webLines.forEach((w, i) => {
      const l = links[i];
      const vis = !!l;
      w.ridge.visible = w.vein.visible = w.pulse.visible = vis;
      if (!vis) return;
      const dx = l.bx - l.ax, dz = l.bz - l.az, len = Math.hypot(dx, dz) || 0.01;
      for (const [m, wd, y] of [[w.ridge, 0.22, 0.035], [w.vein, 0.08, 0.04]]) {
        m.position.set((l.ax + l.bx) / 2, y, (l.az + l.bz) / 2);
        m.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI / 2);
        m.scale.set(len, wd, 1);
      }
      w.t = (w.t + dt * 0.6) % 1;
      w.pulse.position.set(l.ax + dx * w.t, 0.12, l.az + dz * w.t);
      w.vein.material.opacity = 0.25 + 0.2 * Math.sin((w.t + i * 0.3) * Math.PI * 2);
    });
  }
"""
patch('src/render/critters/reviewPathsFx.js', [
    ("  const K20C = { blossom: BLOSSOM, mote: PALETTE.brightHeal, spirit: LEAF_LIGHT, blade: LEAF_LIGHT };",
     "  const K20C = { blossom: BLOSSOM, mote: PALETTE.brightHeal, spirit: LEAF_LIGHT, blade: LEAF_LIGHT, fruit: '#E8A6AE' }; // kit 2.1: the Snapjaw's fruit"),
    ("  // Kesh 18 Nov: Elder Oak roots a foe that stays under its crown (five root spikes close round it).\n", FX + "  // Kesh 18 Nov: Elder Oak roots a foe that stays under its crown (five root spikes close round it).\n"),
    ("  function k20Update(dt) {\n", "  function k20Update(dt) {\n    snapUpdate(dt); // kit 2.1\n    webUpdate(dt);\n"),
])
print('patched')
