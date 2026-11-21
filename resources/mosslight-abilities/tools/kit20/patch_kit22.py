# Kit 2.2 (Kesh 18 Nov 04:05 UTC: "no Rootweb, re-design one to replace it").
# Design thread spec S72 Lure Lily (MOSSLIGHT_SKILL_KIT.md; K20 of the 2.0 changes). Snapjaw stays.
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
    ("  add('rootweb', 'Rootweb', 'RW', { archetype: 'passive', shape: 'aura', power: 0, area: 6, cadenceSec: 1.0 }); // S70 (kit 2.1)\n",
     "  add('lure_lily', 'Lure Lily', 'LL', { archetype: 'damage', power: 20, cd: 16, range: 5, area: 4 }); // S72 (kit 2.2, in the Rootweb's place)\n"),
])
patch('src/render/skillfx/content.js', [
    ("'snapjaw', 'rootweb'].includes(ev.skill)) return;", "'snapjaw', 'rootweb', 'lure_lily'].includes(ev.skill)) return;"),
])
# A lure is a taunt whose source is the lily's own body (faction 'lure', not hittable, so no foe can hurt it
# and no other foe picks it as its nearest target).
patch('src/sim/enemies.js', [
    ("if (src && src.hp > 0 && src.faction === 'party') return src;",
     "if (src && src.hp > 0 && (src.faction === 'party' || src.reviewLure)) return src; // REVIEW-ONLY kit 2.2: the Lure Lily"),
])

SIM = r"""
  // ---- REVIEW-ONLY: kit 2.2 (Kesh 18 Nov 04:05 UTC; design thread S72) ----
  // S72 Lure Lily: foes within 4 u walk to it and attack only it (bosses are slowed); allies near it heal;
  // when its time ends it snaps shut and bursts. Y1 it drinks seeds; Y2 a Pollen Gust carries its scent.
  const K22 = Object.freeze({
    lily: { open: 24, ticks: 360, lureR: 4, lure: 180, bossSlow: 0.3, healR: 4, heal: 4, burstR: 2.5, seedR: 3, seedMax: 3, seedLure: 60, seedBurst: 6, scent: 120 },
  });
  const lilies = [];
  globalThis.__reviewLilies = lilies;
  function lilyLure(l, e, ticks) {
    if (bossy(e)) {
      combat.status.apply(e, 'slow', K22.lily.bossSlow, ticks, currentTick, player.id);
      events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'slow', secs: ticks / 60 });
      return;
    }
    combat.status.apply(e, 'taunt', 1, ticks, currentTick, l.body);
    events.emit(currentTick, 'review_lily_lure', { id: l.id, target: e.id, secs: ticks / 60 });
  }
  function lilyEnd(l, burst) {
    if (burst) {
      const foes = foesIn(l.x, l.z, K22.lily.burstR);
      events.emit(currentTick, 'review_lily_burst', { id: l.id, x: r2(l.x), z: r2(l.z), r: K22.lily.burstR, dmg: l.burst, foes: foes.map((e) => e.id) });
      for (const e of foes) hit(e, l.burst, 'lure_lily');
    }
    registry.despawn(l.body);
    events.emit(currentTick, 'review_lily_end', { id: l.id, burst: !!burst });
  }
  function lilyCast(def, power) {
    const a = aimAt(def.range);
    for (const old of lilies.splice(0)) lilyEnd(old, false);
    const l = { id: ++kitIds, kind: 'lily', x: a.x, z: a.z, opens: currentTick + K22.lily.open, until: currentTick + K22.lily.open + K22.lily.ticks, open: false, burst: power || 20, lure: K22.lily.lure, ate: 0, healNext: 0, body: 0 };
    l.body = registry.spawn({ kind: 'review_lily', faction: 'lure', reviewLure: true, hittable: false, knockbackable: false, x: l.x, z: l.z, px: l.x, pz: l.z, radius: 0.35, hp: 1, maxHp: 1, kbVx: 0, kbVz: 0, kbTicks: 0, iframeUntilTick: 1e9 }).id;
    lilies.push(l);
    events.emit(currentTick, 'review_lily', { id: l.id, x: r2(l.x), z: r2(l.z), fromX: r2(player.x), fromZ: r2(player.z), open: K22.lily.open / 60, secs: K22.lily.ticks / 60, lureR: K22.lily.lureR, burstR: K22.lily.burstR });
  }
  function lilyTick() {
    for (let i = lilies.length - 1; i >= 0; i--) {
      const l = lilies[i];
      const b = registry.byId(l.body);
      if (b) { b.hp = 1; b.x = l.x; b.z = l.z; b.kbVx = 0; b.kbVz = 0; } // foes cannot hurt or move it
      if (currentTick >= l.until) { lilies.splice(i, 1); lilyEnd(l, true); continue; }
      if (!l.open && currentTick >= l.opens) {
        l.open = true;
        for (const sd of nearSeeds(l.x, l.z, K22.lily.seedR, K22.lily.seedMax)) { // Y1: it drinks seeds
          useSeed(sd, 'lily', l);
          l.ate += 1;
          l.lure += K22.lily.seedLure;
          l.burst += K22.lily.seedBurst;
        }
        const foes = foesIn(l.x, l.z, K22.lily.lureR);
        events.emit(currentTick, 'review_lily_open', { id: l.id, ate: l.ate, lure: l.lure / 60, burst: l.burst, foes: foes.length });
        for (const e of foes) lilyLure(l, e, l.lure);
      }
      if (l.open && currentTick >= l.healNext) {
        l.healNext = currentTick + 60;
        for (const e of party()) if (Math.hypot(e.x - l.x, e.z - l.z) <= K22.lily.healR) healLanded(e, K22.lily.heal, { healer: player.id, source: 'lure_lily' });
        events.emit(currentTick, 'review_lily_scent', { id: l.id });
      }
    }
  }
"""
patch('src/sim/world.js', [
    ("\n  // S50 Elder Oak: a great oak; allies under its crown heal, foes are slowed, plants do not wither.\n",
     SIM + "  // S50 Elder Oak: a great oak; allies under its crown heal, foes are slowed, plants do not wither.\n"),
    ("snapTick(); webTick(); } // kit 2.1: Snapjaw, Rootweb", "snapTick(); webTick(); lilyTick(); } // kit 2.1: Snapjaw, Rootweb; kit 2.2: Lure Lily"),
    ("drowsy_spores: sleepCast, snapjaw: snapCast }; // kit 2.1 S71 Snapjaw;", "drowsy_spores: sleepCast, snapjaw: snapCast, lure_lily: lilyCast }; // kit 2.2 S72 Lure Lily; kit 2.1 S71 Snapjaw;"),
    ("'quiet_hearth', 'snapjaw']); // kit 2.1", "'quiet_hearth', 'snapjaw', 'lure_lily']); // kit 2.2 Lure Lily; kit 2.1"),
    # It is a plant: water, the Elder Oak, Wild Thicket
    ("    for (const q of [...spitters, ...saplings, ...oaklings, ...snaps]) { // kit 2.1: the Snapjaw is a plant\n",
     "    for (const q of [...spitters, ...saplings, ...oaklings, ...snaps, ...lilies]) { // kit 2.1: the Snapjaw is a plant; kit 2.2 the Lure Lily\n"),
    ("      for (const q of [...spitters, ...saplings, ...oaklings, ...hedges, ...snaps]) if (under(q)) q.until += 1;",
     "      for (const q of [...spitters, ...saplings, ...oaklings, ...hedges, ...snaps, ...lilies]) if (under(q)) q.until += 1;"),
    ("      const plants = [...spitters, ...saplings, ...oaklings, ...puffs, ...snaps];",
     "      const plants = [...spitters, ...saplings, ...oaklings, ...puffs, ...snaps, ...lilies];"),
    # Y2: a Pollen Gust that crosses the lily carries its scent
    ("      for (const e of registry.all()) {\n        if (g.hit.has(e.id) || !(e.hp > 0)) continue;\n        const ally = e.partyIndex !== undefined;",
     "      if (!g.scent) for (const l of lilies) if (inRect({ x: l.x, z: l.z, radius: 0.3 }, g.x, g.z, g.dx, g.dz, g.d, g.width)) { g.scent = l.id; events.emit(currentTick, 'review_gust_scent', { id: g.id, lily: l.id, x: r2(l.x), z: r2(l.z) }); break; } // kit 2.2 Y2\n      for (const e of registry.all()) {\n        if (g.hit.has(e.id) || !(e.hp > 0)) continue;\n        const ally = e.partyIndex !== undefined;"),
    ("          events.emit(currentTick, 'review_gust_push', { target: e.id });\n",
     "          events.emit(currentTick, 'review_gust_push', { target: e.id });\n          if (g.scent) { const l = lilies.find((q) => q.id === g.scent); if (l) lilyLure(l, e, K22.lily.scent); } // kit 2.2 Y2: lured to the lily 2 s\n"),
])

FX = r"""
  // ---- REVIEW-ONLY: kit 2.2 (Kesh 18 Nov): S72 Lure Lily (a stand-in lily until its Tripo model) ----
  const lilyObjs = new Map();
  const lilyLures = new Map(); // foe id -> { lily, line, left }
  const LILY_PETAL = '#EFC9D3'; // a soft pink, so it does not bloom white
  bus.on('review_lily', (ev) => {
    const g = new Group();
    const base = new Mesh(new CylinderGeometry(0.17, 0.23, 0.12, 9), mat('#C9A46A')); // honey wood, like her other plants
    base.position.y = 0.06;
    const stem = new Mesh(new CylinderGeometry(0.045, 0.06, 0.5, 7), mat('#6E9A4E'));
    stem.position.y = 0.34;
    const ribbon = new Mesh(new CylinderGeometry(0.07, 0.07, 0.05, 8), mat('#C8643C')); // her terracotta ribbon
    ribbon.position.y = 0.42;
    const head = new Group();
    head.position.y = 0.6;
    const petals = [];
    for (let i = 0; i < 6; i++) {
      const pv = new Group();
      pv.rotation.y = (i / 6) * Math.PI * 2;
      const p = new Mesh(new SphereGeometry(0.2, 8, 6), mat(LILY_PETAL, 1, { emissive: BLOSSOM, emissiveIntensity: 0.05 }));
      p.scale.set(0.45, 0.12, 1);
      p.position.z = 0.2;
      const arm = new Group();
      arm.add(p);
      pv.add(arm);
      head.add(pv);
      petals.push(arm);
    }
    const bud = new Mesh(new IcosahedronGeometry(0.08, 0), mat('#BFE8B0', 1, { emissive: '#7FC48A', emissiveIntensity: 0.5 })); // her pale green crystal bud
    bud.position.y = 0.04;
    head.add(bud);
    g.add(base, stem, ribbon, head);
    const lureRing = flat(new RingGeometry(ev.lureR - 0.05, ev.lureR, 64), BLOSSOM, 0);
    lureRing.position.y = 0.03;
    const burstRing = flat(new RingGeometry(ev.burstR - 0.04, ev.burstR, 48), DMG_DEEP, 0);
    burstRing.position.y = 0.035;
    g.add(lureRing, burstRing);
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    lilyObjs.set(ev.id, { g, head, petals, bud, lureRing, burstRing, t: 0, open: ev.open || 0.4, secs: ev.secs, opened: null, end: null, snap: null, scent: 0 });
    burst(ev.x, 0.15, ev.z, LEAF_LIGHT, 6, 0.1);
  });
  bus.on('review_lily_open', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (!o) return;
    o.opened = 0;
    const p = o.g.position;
    ringPart(p.x, p.z, 1, BLOSSOM, 0.7, 3, 0.7); // the scent rolls out to 4 u
    burst(p.x, 0.9, p.z, BLOSSOM, 10, 0.12);
    if (ev.ate) burst(p.x, 0.7, p.z, PALETTE.brightHeal, 4 + 2 * ev.ate, 0.1);
  });
  bus.on('review_lily_scent', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (!o) return;
    const p = o.g.position;
    for (let i = 0; i < 3; i++) {
      const s = sprite(BLOSSOM);
      s.scale.setScalar(0.1);
      root.add(s);
      const a = Math.random() * Math.PI * 2;
      parts.push({ s, kind: 'fly', from: new Vector3(p.x, 0.7, p.z), vel: new Vector3(Math.cos(a) * 0.6, 0.5, Math.sin(a) * 0.6), t: -i * 0.1, life: 0.9 });
    }
  });
  bus.on('review_lily_lure', (ev) => {
    let m = lilyLures.get(ev.target);
    if (!m) {
      const line = flat(new PlaneGeometry(1, 1), BLOSSOM, 0);
      root.add(line);
      m = { line, t: 0 };
      lilyLures.set(ev.target, m);
    }
    m.lily = ev.id;
    m.left = ev.secs;
    const e = byId(ev.target);
    if (e) burst(e.x, 0.9, e.z, BLOSSOM, 5, 0.09);
  });
  bus.on('review_gust_scent', (ev) => { burst(ev.x, 0.8, ev.z, BLOSSOM, 8, 0.11); ringPart(ev.x, ev.z, 1.2, BLOSSOM, 0.4, 0.8, 0.6); });
  bus.on('review_lily_burst', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (o) o.snap = 0;
    ringPart(ev.x, ev.z, ev.r, DMG, 0.45, 0.3, 0.9);
    burst(ev.x, 0.5, ev.z, DMG, 10, 0.13);
    burst(ev.x, 0.8, ev.z, BLOSSOM, 8, 0.1);
  });
  bus.on('review_lily_end', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (o && o.end == null) o.end = ev.burst ? -0.3 : 0;
    for (const [k, m] of lilyLures) if (m.lily === ev.id) m.left = 0;
  });
  function lilyUpdate(dt) {
    for (const [id, o] of lilyObjs) {
      o.t += dt;
      let k = Math.min(1, o.t / 0.25);
      if (o.end != null) { o.end += dt; if (o.end > 0) k *= Math.max(0, 1 - o.end / 0.35); if (o.end > 0.35) { root.remove(o.g); lilyObjs.delete(id); continue; } }
      o.g.scale.setScalar(Math.max(0.01, k));
      // closed bud (petals up) -> open (petals out) -> snaps shut at the end
      let open = o.opened == null ? 0.1 : Math.min(1, o.opened / 0.25);
      if (o.opened != null) o.opened += dt;
      if (o.snap != null) { o.snap += dt; open = Math.max(0, 1 - o.snap / 0.08); }
      const sway = o.opened != null && o.snap == null ? 0.05 * Math.sin(o.t * 2.4) : 0;
      for (const a of o.petals) a.rotation.x = -(1.35 - 1.05 * open) + sway;
      o.head.rotation.y += dt * 0.4;
      o.bud.material.emissiveIntensity = 0.15 + 0.1 * Math.sin(o.t * 4); // dim (colour rule: glows ~40% under)
      const live = o.opened != null && o.snap == null && o.end == null;
      o.lureRing.material.opacity = live ? 0.22 + 0.06 * Math.sin(o.t * 2) : Math.max(0, o.lureRing.material.opacity - dt * 2);
      const left = o.opened != null ? o.secs - o.opened : o.secs;
      o.burstRing.material.opacity = live && left < 1.2 ? 0.5 * (0.5 + 0.5 * Math.sin(o.t * 14)) : 0; // a warning before it snaps
    }
    for (const [fid, m] of lilyLures) {
      m.left -= dt;
      m.t += dt;
      const e = byId(fid);
      const o = lilyObjs.get(m.lily);
      if (m.left <= 0 || !e || !o || o.end != null) { root.remove(m.line); lilyLures.delete(fid); continue; }
      const p = o.g.position;
      const dx = p.x - e.x, dz = p.z - e.z, len = Math.hypot(dx, dz) || 0.01;
      m.line.position.set((p.x + e.x) / 2, 0.045, (p.z + e.z) / 2);
      m.line.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI / 2);
      m.line.scale.set(len, 0.06, 1);
      m.line.material.opacity = 0.35 + 0.15 * Math.sin(m.t * 6);
    }
  }
"""
patch('src/render/critters/reviewPathsFx.js', [
    ("  // Kesh 18 Nov: Elder Oak roots a foe that stays under its crown (five root spikes close round it).\n", FX + "  // Kesh 18 Nov: Elder Oak roots a foe that stays under its crown (five root spikes close round it).\n"),
    ("    snapUpdate(dt); // kit 2.1\n", "    snapUpdate(dt); // kit 2.1\n    lilyUpdate(dt); // kit 2.2\n"),
])
print('patched')
