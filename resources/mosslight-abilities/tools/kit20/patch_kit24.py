# Kit 2.3b (Kesh 18 Nov 06:28 UTC; design thread S10 and S73): Swiftleaf re-designed (three leaves, three curves,
# one meeting, then one leaf per style) and Petal Twister (in Pollen Mark's place). Also: the shared Creeping Moss
# hit is rounded to whole numbers. REVIEW-ONLY: never committed.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)

patch('src/sim/skills.js', [
    ("  set('swift_mend', { name: 'Swiftleaf', abbrev: 'SL' }); // S10: +50% on an ally with Moss (world.js)",
     "  set('swift_mend', { name: 'Swiftleaf', abbrev: 'SL', shape: 'review', range: 5 }); // S10 (2.3 re-design: three leaves; world.js)"),
    ("  add('lure_lily', 'Lure Lily', 'LL',",
     "  add('petal_twister', 'Petal Twister', 'PT', { archetype: 'damage', power: 4, cd: 12, range: 5, area: 2.2 }); // S73 (2.3, in Pollen Mark's place)\n  add('lure_lily', 'Lure Lily', 'LL',"),
])
patch('src/render/skillfx/content.js', [
    ("'snapjaw', 'rootweb', 'lure_lily'].includes(ev.skill)) return;", "'snapjaw', 'rootweb', 'lure_lily', 'petal_twister', 'swift_mend'].includes(ev.skill)) return;"),
])

SIM = r"""
  // ---- REVIEW-ONLY: kit 2.3b (Kesh 18 Nov 06:28; design thread S10, S73) ----
  // S10 Swiftleaf: three leaves on three curves meet on the neediest ally, whirl as a pinwheel, then part:
  // one flies on, one stays as a sprig, one cuts its way home. The sim moves the leaves; the render follows.
  const K24 = Object.freeze({
    leaf: { wind: 7, fly: 21, pin: 30, on: 18, home: 24, side: 1.5, high: 1.6, meet: 5, meetMoss: 7, cut: 3, pinCut: 5, pinR: 1.5, onHeal: 7, onMoss: 10, onReach: 5, homeCut: 6, hitR: 0.45, seedR: 0.6, seedMax: 2, seed: 11, wetR: 1.5, dust: 180 },
    tw: { ticks: 300, speed: 1.5 / 60, heal: 4, dmg: 4, dust: 360, seedR: 1.0, seedMax: 3, throwR: 2, blow: 4, blowTicks: 20, more: 120, spores: 0.2 },
  });
  const leaves = [];
  globalThis.__reviewLeaves = leaves;
  const twisters = [];
  globalThis.__reviewTwisters = twisters;
  const bez = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
  function leafCast(def) {
    const t = hurtNear(player.x, player.z, def.range, true) || player;
    let dx = t.x - player.x, dz = t.z - player.z, len = Math.hypot(dx, dz);
    if (len < 0.5) { dx = player.faceX ?? 0; dz = player.faceZ ?? 1; len = Math.hypot(dx, dz) || 1; }
    dx /= len; dz /= len;
    const L = { id: ++kitIds, t, sx: player.x, sz: player.z, dx, dz, px: -dz, pz: dx, at: currentTick, seeds: 0, wet: false, phase: 'wind', t2: null,
      leaf: [-1, 0, 1].map((k) => ({ k, x: player.x, y: 1.0, z: player.z, hit: new Set(), dusty: false, on: true })) };
    leaves.push(L);
    events.emit(currentTick, 'review_sl', { id: L.id, target: t.id, sx: r2(L.sx), sz: r2(L.sz), tx: r2(t.x), tz: r2(t.z), side: K24.leaf.side, wind: K24.leaf.wind / 60, fly: K24.leaf.fly / 60 });
  }
  function leafCut(L, f, x, z, amt, src) {
    for (const e of foesIn(x, z, K24.leaf.hitR)) {
      if (f.hit.has(e.id)) continue;
      f.hit.add(e.id);
      hit(e, amt, src);
      if (f.dusty && e.hp > 0) { if (!(e.reviewDustUntil > currentTick)) events.emit(currentTick, 'review_pollen_carry', { id: L.id, target: e.id, secs: K24.leaf.dust / 60 }); e.reviewDustUntil = Math.max(e.reviewDustUntil || 0, currentTick + K24.leaf.dust); } // F4
    }
  }
  function leafTick() {
    const P = K24.leaf;
    for (let i = leaves.length - 1; i >= 0; i--) {
      const L = leaves[i];
      const t = L.t;
      const age = currentTick - L.at;
      const launch = P.wind, meet = P.wind + P.fly, part = meet + P.pin;
      if (age < launch) { // 1. wind-up: the leaves peel off the gem and hang left, right and above her
        const u = age / launch;
        for (const f of L.leaf) {
          const hx = player.x + L.px * 0.6 * f.k, hz = player.z + L.pz * 0.6 * f.k, hy = f.k === 0 ? 1.5 : 0.95;
          f.x = player.x + (hx - player.x) * u; f.z = player.z + (hz - player.z) * u; f.y = 1.0 + (hy - 1.0) * u;
          f.ox = hx; f.oz = hz; f.oy = hy;
        }
        continue;
      }
      if (age < meet) { // 2. flight: left and right bulge 1.5 u out; the high one climbs, then dives
        if (L.phase !== 'fly') { L.phase = 'fly'; events.emit(currentTick, 'review_sl_launch', { id: L.id, sx: r2(L.leaf[1].ox), sz: r2(L.leaf[1].oz), tx: r2(t.x), tz: r2(t.z), px: r2(L.px), pz: r2(L.pz), side: P.side }); }
        const u = (age - launch) / P.fly;
        for (const f of L.leaf) {
          const mx = (f.ox + t.x) / 2 + L.px * P.side * f.k, mz = (f.oz + t.z) / 2 + L.pz * P.side * f.k;
          f.x = bez(f.ox, mx, t.x, u); f.z = bez(f.oz, mz, t.z, u);
          f.y = f.k === 0 ? f.oy + (0.6 - f.oy) * u + P.high * Math.sin(Math.PI * u) * (1 - 0.4 * u) : f.oy + (0.6 - f.oy) * u + 0.3 * Math.sin(Math.PI * u);
          leafCut(L, f, f.x, f.z, P.cut, 'swift_mend:cut');
          if (!f.dusty && twisters.some((w) => Math.hypot(f.x - w.x, f.z - w.z) <= w.r)) { f.dusty = true; events.emit(currentTick, 'review_sl_dusty', { id: L.id, k: f.k }); } // F4
          if (!L.wet && f.y < 1.4 && (dewIn(f.x, f.z) || k20.lanes.some((ln) => inRect({ x: f.x, z: f.z, radius: 0.1 }, ln.x, ln.z, ln.dx, ln.dz, ln.len, ln.width)) || k8.clouds.some((c) => Math.hypot(f.x - c.x, f.z - c.z) <= c.r))) { L.wet = true; events.emit(currentTick, 'review_sl_wet', { id: L.id, k: f.k, x: r2(f.x), z: r2(f.z) }); } // F3
          if (L.seeds < P.seedMax) for (const sd of nearSeeds(f.x, f.z, P.seedR, P.seedMax - L.seeds)) { useSeed(sd, 'leaf', t); L.seeds += 1; } // F1
        }
        continue;
      }
      if (age < part) { // 3. the meeting: a three-leaf pinwheel, two turns round the ally
        if (L.phase !== 'pin') {
          L.phase = 'pin';
          const moss = hasMoss(t);
          const per = moss ? P.meetMoss : P.meet;
          events.emit(currentTick, 'review_sl_meet', { id: L.id, target: t.id, x: r2(t.x), z: r2(t.z), seeds: L.seeds, wet: L.wet, moss });
          if (t.hp > 0) for (let k = 0; k < 3; k++) healLanded(t, per, { healer: player.id, source: 'swift_mend:meet', critBonus: -1 });
          if (L.seeds && t.hp > 0) healLanded(t, P.seed * L.seeds, { healer: player.id, source: 'swift_mend:seed', critBonus: -1 }); // F1
          for (const e of foesIn(t.x, t.z, P.pinR)) hit(e, P.pinCut, 'swift_mend:pinwheel');
          if (L.wet) waterWhere((q) => Math.hypot(q.x - t.x, q.z - t.z) <= P.wetR); // F3: the meeting waters
        }
        const u = (age - meet) / P.pin;
        L.leaf.forEach((f, j) => { const a = j * (Math.PI * 2 / 3) + u * Math.PI * 4; f.x = t.x + Math.cos(a) * 0.55; f.z = t.z + Math.sin(a) * 0.55; f.y = 0.6 + 0.1 * Math.sin(u * Math.PI * 4 + j); });
        continue;
      }
      // 4. parting
      const [on, stay, home] = L.leaf;
      if (L.phase !== 'part') {
        L.phase = 'part';
        L.t2 = hurtNear(t.x, t.z, P.onReach, false, new Set([t.id]));
        on.fx = on.x; on.fz = on.z; on.fy = on.y; home.fx = home.x; home.fz = home.z; home.fy = home.y;
        home.hit = new Set();
        if (t.hp > 0) sprig(t);
        events.emit(currentTick, 'review_sl_part', { id: L.id, target: t.id, on: L.t2 ? L.t2.id : null });
      }
      const pa = age - part;
      if (on.on) {
        if (L.t2 && L.t2.hp > 0) {
          const u = Math.min(1, pa / P.on);
          const mx = (on.fx + L.t2.x) / 2 + L.px * 0.6, mz = (on.fz + L.t2.z) / 2 + L.pz * 0.6;
          on.x = bez(on.fx, mx, L.t2.x, u); on.z = bez(on.fz, mz, L.t2.z, u); on.y = on.fy + (0.6 - on.fy) * u + 0.5 * Math.sin(Math.PI * u);
          if (u >= 1) { on.on = false; healLanded(L.t2, hasMoss(L.t2) ? P.onMoss : P.onHeal, { healer: player.id, source: 'swift_mend:on', critBonus: -1 }); events.emit(currentTick, 'review_sl_on', { id: L.id, target: L.t2.id, x: r2(L.t2.x), z: r2(L.t2.z) }); }
        } else { on.on = false; events.emit(currentTick, 'review_sl_on', { id: L.id, target: null, x: r2(on.x), z: r2(on.z) }); }
      }
      if (stay.on) { // the sprig leaf circles its ally while the sprig lasts
        const left = hots.has(`${t.id}|sprig`) && t.hp > 0;
        if (!left && pa > 2) stay.on = false;
        else { const a = pa * 0.09; stay.x = t.x + Math.cos(a) * 0.38; stay.z = t.z + Math.sin(a) * 0.38; stay.y = 0.45 + 0.05 * Math.sin(pa * 0.2); }
      }
      if (home.on) { // it cuts its way home on a low curve; she catches it on the staff
        const u = Math.min(1, pa / P.home);
        const mx = (home.fx + player.x) / 2 - L.px * 1.0, mz = (home.fz + player.z) / 2 - L.pz * 1.0;
        home.x = bez(home.fx, mx, player.x, u); home.z = bez(home.fz, mz, player.z, u); home.y = home.fy + (1.05 - home.fy) * u;
        leafCut(L, home, home.x, home.z, P.homeCut, 'swift_mend:home');
        if (u >= 1) { home.on = false; events.emit(currentTick, 'review_sl_home', { id: L.id }); }
      }
      if (!on.on && !stay.on && !home.on) { leaves.splice(i, 1); events.emit(currentTick, 'review_sl_end', { id: L.id }); }
    }
  }
  const dewIn = (x, z) => { for (const [, zn] of dewZones) if (Math.hypot(x - zn.x, z - zn.z) <= zn.r) return true; return false; };
  // S73 Petal Twister: a twister of petals that roams to the next foe not yet dusted; dusts, heals, cuts.
  function twisterCast(def, power) {
    const a = aimAt(def.range);
    for (const old of twisters.splice(0)) twisterEnd(old);
    const w = { id: ++kitIds, x: a.x, z: a.z, r: def.area, until: currentTick + K24.tw.ticks, next: currentTick + 60, power: power || K24.tw.dmg, lifted: [], blown: false, push: null, spores: false };
    twisters.push(w);
    events.emit(currentTick, 'review_twister', { id: w.id, x: r2(w.x), z: r2(w.z), r: w.r, fromX: r2(player.x), fromZ: r2(player.z), secs: K24.tw.ticks / 60 });
  }
  function twisterEnd(w) {
    const n = w.lifted.length;
    w.lifted.forEach((sd, k) => { // P1: it throws its seeds out 2 u, and each flowers at once
      const ang = (k / Math.max(1, n)) * Math.PI * 2 + 0.6;
      const x = inArenaX(w.x + Math.cos(ang) * K24.tw.throwR), z = inArenaZ(w.z + Math.sin(ang) * K24.tw.throwR);
      events.emit(currentTick, 'review_twister_throw', { id: w.id, fromX: r2(w.x), fromZ: r2(w.z), x: r2(x), z: r2(z) });
      sprout({ x, z });
    });
    events.emit(currentTick, 'review_twister_end', { id: w.id });
  }
  function twisterTick() {
    for (let i = twisters.length - 1; i >= 0; i--) {
      const w = twisters[i];
      if (currentTick >= w.until) { twisters.splice(i, 1); twisterEnd(w); continue; }
      if (w.push) { // P2: blown along the wind
        const step = K24.tw.blow / K24.tw.blowTicks;
        w.x = inArenaX(w.x + w.push.dx * step); w.z = inArenaZ(w.z + w.push.dz * step);
        if (--w.push.left <= 0) w.push = null;
      } else {
        const foes = registry.all().filter(foeOk);
        const fresh = foes.filter((e) => !(e.reviewDustUntil > currentTick));
        const pool = fresh.length ? fresh : foes;
        let best = null, bd = Infinity;
        for (const e of pool) { const d = Math.hypot(e.x - w.x, e.z - w.z); if (d < bd) { bd = d; best = e; } }
        if (best && bd > 0.15) { const s = Math.min(K24.tw.speed, bd); w.x += ((best.x - w.x) / bd) * s; w.z += ((best.z - w.z) / bd) * s; }
      }
      const inside = foesIn(w.x, w.z, w.r);
      for (const e of inside) {
        if (!(e.reviewDustUntil > currentTick)) events.emit(currentTick, 'review_pollen_carry', { id: w.id, target: e.id, secs: K24.tw.dust / 60 });
        e.reviewDustUntil = currentTick + K24.tw.dust; // the 6 s start again while it is inside
        if (w.spores) { combat.status.apply(e, 'exposed', K24.tw.spores, 12, currentTick, player.id); if ((e.reviewTwSporeSaid ?? 0) <= currentTick) { e.reviewTwSporeSaid = currentTick + 30; events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'exposed', secs: 0.6 }); } } // P3
      }
      if (w.lifted.length < K24.tw.seedMax) for (const sd of nearSeeds(w.x, w.z, K24.tw.seedR, K24.tw.seedMax - w.lifted.length)) { useSeed(sd, 'twister', w); w.lifted.push(sd); events.emit(currentTick, 'review_twister_lift', { id: w.id, n: w.lifted.length }); } // P1
      if (!w.spores && clouds.some((c) => Math.hypot(c.x - w.x, c.z - w.z) <= c.r + w.r * 0.5)) { w.spores = true; events.emit(currentTick, 'review_twister_spores', { id: w.id }); } // P3
      if (currentTick >= w.next) {
        w.next = currentTick + 60;
        for (const e of party()) if (Math.hypot(e.x - w.x, e.z - w.z) <= w.r + (e.radius || 0.3)) healLanded(e, K24.tw.heal, { healer: player.id, source: 'petal_twister', critBonus: -1 });
        for (const e of inside) if (e.hp > 0) hit(e, w.power, 'petal_twister');
      }
    }
  }
"""
W = 'src/sim/world.js'
patch(W, [
    ("\n  // ---- REVIEW-ONLY: kit 2.2 (Kesh 18 Nov 04:05 UTC; design thread S72) ----\n",
     SIM + "\n  // ---- REVIEW-ONLY: kit 2.2 (Kesh 18 Nov 04:05 UTC; design thread S72) ----\n"),
    ("snapTick(); webTick(); lilyTick(); }", "snapTick(); webTick(); lilyTick(); leafTick(); twisterTick(); }"),
    ("snapjaw: snapCast, lure_lily: lilyCast };", "snapjaw: snapCast, lure_lily: lilyCast, swift_mend: leafCast, petal_twister: twisterCast };"),
    # P2: a Pollen Gust that crosses the twister blows it 4 u along the wind, +2 s, once
    ("      if (!g.scent) for (const l of lilies)",
     "      for (const tw of twisters) if (!tw.blown && inRect({ x: tw.x, z: tw.z, radius: tw.r * 0.5 }, g.x, g.z, g.dx, g.dz, g.d, g.width)) { tw.blown = true; tw.push = { dx: g.dx, dz: g.dz, left: K24.tw.blowTicks }; tw.until += K24.tw.more; events.emit(currentTick, 'review_twister_blown', { id: tw.id, secs: K24.tw.more / 60 }); } // kit 2.3 P2\n"
     "      if (!g.scent) for (const l of lilies)"),
    # Wispfall: a walking step is about 0.07 u a tick, so 0.08 never broke the channel
    ("rampMax: 1, still: 0.08 }", "rampMax: 1, still: 0.02 }"),
    # Creeping Moss share: whole numbers on screen
    ("          const part = base / (mates.length + 1);", "          const part = Math.max(1, Math.round(base / (mates.length + 1)));"),
])

FX = r"""
  // ---- REVIEW-ONLY: kit 2.3b (Kesh 18 Nov): S10 Swiftleaf (three leaves) and S73 Petal Twister ----
  const SL_LEAF = new SphereGeometry(0.17, 8, 5);
  SL_LEAF.scale(0.5, 0.09, 1.25);
  const slObjs = new Map();
  function slLeaf() {
    const g = new Group();
    const m = new Mesh(SL_LEAF, mat(LEAF_LIGHT, 1, { emissive: PALETTE.brightHeal, emissiveIntensity: 0.18 }));
    const rib = new Mesh(new PlaneGeometry(0.02, 0.36), new MeshBasicMaterial({ color: '#F4FFE0', transparent: true, opacity: 0.7, depthWrite: false, side: DoubleSide }));
    rib.rotation.x = -Math.PI / 2;
    rib.position.y = 0.02;
    m.add(rib);
    g.add(m);
    const glow = sprite(PALETTE.brightHeal);
    glow.scale.setScalar(0.3);
    g.add(glow);
    root.add(g);
    g.scale.setScalar(0.01);
    return { g, m, glow, trail: 0, last: null };
  }
  bus.on('review_sl', (ev) => {
    const o = { leaves: [slLeaf(), slLeaf(), slLeaf()], t: 0, shadow: flat(new RingGeometry(0.01, 0.16, 16), '#1A2416', 0), floor: null, flash: 0 };
    o.shadow.position.y = 0.02;
    root.add(o.shadow);
    slObjs.set(ev.id, o);
    const a = byId(ev.target);
    burst(ev.sx, 1.0, ev.sz, PALETTE.brightHeal, 5, 0.08); // the leaves peel off the gem
  });
  bus.on('review_sl_launch', (ev) => { // the three ribbons draw one big leaf on the floor: two edges and the midrib
    const o = slObjs.get(ev.id);
    if (!o) return;
    const N = 18, pts = [];
    const ctl = (k) => ({ x: (ev.sx + ev.tx) / 2 + ev.px * ev.side * k, z: (ev.sz + ev.tz) / 2 + ev.pz * ev.side * k });
    const cur = (k, u) => { const c = ctl(k); return [bez2(ev.sx, c.x, ev.tx, u), bez2(ev.sz, c.z, ev.tz, u)]; };
    for (let i = 0; i <= N; i++) pts.push(cur(-1, i / N));
    for (let i = N; i >= 0; i--) pts.push(cur(1, i / N));
    const sh = new Shape();
    sh.moveTo(pts[0][0], -pts[0][1]);
    for (const p of pts.slice(1)) sh.lineTo(p[0], -p[1]);
    const fill = new Mesh(new ShapeGeometry(sh), new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.025;
    const dx = ev.tx - ev.sx, dz = ev.tz - ev.sz, len = Math.hypot(dx, dz) || 0.01;
    const rib = flat(new PlaneGeometry(1, 1), '#F4FFE0', 0);
    rib.position.set((ev.sx + ev.tx) / 2, 0.03, (ev.sz + ev.tz) / 2);
    rib.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI / 2);
    rib.scale.set(len, 0.05, 1);
    root.add(fill, rib);
    o.floor = { fill, rib, t: 0 };
  });
  const bez2 = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
  bus.on('review_sl_meet', (ev) => {
    const o = slObjs.get(ev.id);
    if (o) o.flash = 0.01;
    ringPart(ev.x, ev.z, 0.7, PALETTE.brightHeal, 0.4, 0.6, 0.8);
    burst(ev.x, 0.7, ev.z, PALETTE.brightHeal, 8, 0.1);
    if (ev.seeds) burst(ev.x, 0.8, ev.z, BLOSSOM, 6 + 3 * ev.seeds, 0.11); // the seeds burst into blossom
    if (ev.wet) { burst(ev.x, 0.5, ev.z, WATER, 10, 0.1); ringPart(ev.x, ev.z, 1.5, WATER, 0.5, 0.15, 0.7); }
    ringPart(ev.x, ev.z, 1.5, DMG, 0.35, 0.1, 0.5); // the pinwheel cuts within 1.5 u
  });
  bus.on('review_sl_wet', (ev) => burst(ev.x, 0.6, ev.z, WATER, 5, 0.08));
  bus.on('review_sl_dusty', (ev) => { const o = slObjs.get(ev.id); if (o) { const l = o.leaves[ev.k + 1]; l.dusty = true; l.m.material.emissive.set(POLLEN); } });
  bus.on('review_sl_part', (ev) => { const o = slObjs.get(ev.id); if (o) o.parted = 0; });
  bus.on('review_sl_on', (ev) => { if (ev.target != null) { burst(ev.x, 0.7, ev.z, PALETTE.brightHeal, 7, 0.09); ringPart(ev.x, ev.z, 0.5, PALETTE.brightHeal, 0.35, 0.8, 0.7); } });
  bus.on('review_sl_home', (ev) => { // she catches it on the staff; the gem blinks
    const L = (globalThis.__reviewLeaves || []).find((q) => q.id === ev.id);
    const o = slObjs.get(ev.id);
    const l = o && o.leaves[2];
    if (l) { const p = l.g.position; burst(p.x, p.y + 0.1, p.z, '#F4FFE0', 6, 0.08); ringPart(p.x, p.z, 0.4, PALETTE.brightHeal, 0.3, 1.0, 0.7); }
  });
  bus.on('review_sl_end', (ev) => { const o = slObjs.get(ev.id); if (o) o.done = 0; });
  function slUpdate(dt) {
    const live = globalThis.__reviewLeaves || [];
    for (const [id, o] of slObjs) {
      o.t += dt;
      const L = live.find((q) => q.id === id);
      if (o.floor) { o.floor.t += dt; const k = Math.max(0, 1 - Math.abs(o.floor.t - 0.25) / 0.3); o.floor.fill.material.opacity = 0.14 * k; o.floor.rib.material.opacity = 0.4 * k; if (o.floor.t > 0.6) { root.remove(o.floor.fill, o.floor.rib); o.floor = null; } }
      if (!L || o.done != null) {
        o.done = (o.done || 0) + dt;
        for (const l of o.leaves) l.g.scale.setScalar(Math.max(0.01, (l.s || 1) * (1 - o.done / 0.2)));
        if (o.done > 0.2) { for (const l of o.leaves) root.remove(l.g); root.remove(o.shadow); slObjs.delete(id); }
        continue;
      }
      L.leaf.forEach((f, j) => {
        const l = o.leaves[j];
        if (!f.on && L.phase === 'part') { l.s = Math.max(0, (l.s ?? 1) - dt * 5); l.g.scale.setScalar(Math.max(0.01, l.s)); return; }
        l.g.position.set(f.x, f.y, f.z);
        const flying = L.phase === 'fly' || (L.phase === 'part' && j !== 1);
        let s = L.phase === 'wind' ? Math.min(1, o.t / 0.1) : 1;
        if (f.k === 0 && L.phase === 'fly') s = 1 + 0.5 * Math.min(1, Math.max(0, (f.y - 1.0) / 1.2)); // the high leaf grows as it climbs
        if (L.phase === 'part' && j === 1) s = 0.6; // the sprig leaf
        l.s = s;
        l.g.scale.setScalar(s);
        l.m.rotation.y += dt * (flying ? 22 : L.phase === 'pin' ? 14 : 4); // spins like a thrown blade
        l.m.rotation.z = flying ? 0.5 : 0.2;
        l.glow.material.opacity = L.phase === 'pin' ? 0.55 : 0.25; // bright only at the meeting
        if (flying || L.phase === 'pin') { // a ribbon of small leaves behind each
          l.trail += dt;
          if (l.trail > 0.03) {
            l.trail = 0;
            const sp = sprite(l.dusty ? POLLEN : LEAF_LIGHT);
            sp.scale.setScalar(0.09);
            root.add(sp);
            parts.push({ s: sp, kind: 'fly', from: new Vector3(f.x, f.y, f.z), vel: new Vector3((Math.random() - 0.5) * 0.3, -0.25, (Math.random() - 0.5) * 0.3), t: 0, life: 0.35 });
          }
        }
        if (f.k === 0) { o.shadow.position.set(f.x, 0.02, f.z); o.shadow.material.opacity = L.phase === 'fly' ? 0.35 : 0; }
      });
    }
  }
  // S73 Petal Twister: petals and pollen spin up a cone; wind lines; lifted seeds spin inside.
  const twObjs = new Map();
  bus.on('review_twister', (ev) => {
    const g = new Group();
    const ring = flat(new RingGeometry(ev.r - 0.05, ev.r, 64), POLLEN, 0);
    ring.position.y = 0.03;
    const disc = flat(new RingGeometry(0.01, ev.r, 48), BLOSSOM, 0);
    disc.position.y = 0.025;
    g.add(ring, disc);
    const petals = [];
    for (let i = 0; i < 30; i++) {
      const sp = sprite(i % 3 === 0 ? POLLEN : BLOSSOM, false);
      sp.scale.setScalar(0.1 + 0.05 * (i % 2));
      g.add(sp);
      petals.push({ sp, h: (i / 30) * 1.8, a: Math.random() * 6.28, v: 4 + Math.random() * 2 });
    }
    const winds = [];
    for (let i = 0; i < 3; i++) {
      const w = flat(new RingGeometry(0.4 + i * 0.35, 0.44 + i * 0.35, 32, 1, 0, Math.PI * 1.2), '#F4F1E4', 0);
      w.position.y = 0.4 + i * 0.5;
      g.add(w);
      winds.push(w);
    }
    g.position.set(ev.x, 0, ev.z);
    root.add(g);
    twObjs.set(ev.id, { g, ring, disc, petals, winds, seeds: [], t: 0, end: null, spores: false, r: ev.r });
    burst(ev.x, 0.4, ev.z, BLOSSOM, 10, 0.12);
  });
  bus.on('review_twister_lift', (ev) => {
    const o = twObjs.get(ev.id);
    if (!o) return;
    const sm = makeSeed();
    const s = sm || new Mesh(new IcosahedronGeometry(0.07, 0), mat('#8FD08A'));
    o.g.add(s);
    o.seeds.push(s);
  });
  bus.on('review_twister_throw', (ev) => {
    const o = twObjs.get(ev.id);
    if (o && o.seeds.length) o.g.remove(o.seeds.pop());
    const s = sprite(LEAF_LIGHT);
    s.scale.setScalar(0.16);
    root.add(s);
    parts.push({ s, kind: 'fly', from: new Vector3(ev.fromX, 1.0, ev.fromZ), vel: new Vector3((ev.x - ev.fromX) / 0.35, 1.2, (ev.z - ev.fromZ) / 0.35), t: 0, life: 0.35 });
    burst(ev.x, 0.3, ev.z, FLOWER, 6, 0.1);
  });
  bus.on('review_twister_blown', (ev) => { const o = twObjs.get(ev.id); if (o) { const p = o.g.position; burst(p.x, 0.8, p.z, '#F4F1E4', 10, 0.12); } });
  bus.on('review_twister_spores', (ev) => { const o = twObjs.get(ev.id); if (o) { o.spores = true; for (const pt of o.petals) if (Math.random() < 0.4) pt.sp.material.color.set(SPORE); } });
  bus.on('review_twister_end', (ev) => { const o = twObjs.get(ev.id); if (o) o.end = 0; });
  function twUpdate(dt) {
    const live = globalThis.__reviewTwisters || [];
    for (const [id, o] of twObjs) {
      o.t += dt;
      const w = live.find((q) => q.id === id);
      if (w) o.g.position.set(w.x, 0, w.z);
      let k = Math.min(1, o.t / 0.3);
      if (o.end != null) { o.end += dt; k *= Math.max(0, 1 - o.end / 0.4); if (o.end > 0.4) { root.remove(o.g); twObjs.delete(id); continue; } }
      o.ring.material.opacity = 0.5 * k;
      o.disc.material.opacity = 0.08 * k;
      for (const pt of o.petals) {
        pt.a += dt * pt.v;
        pt.h = (pt.h + dt * 0.9) % 1.8;
        const rad = (0.25 + 0.55 * (pt.h / 1.8)) * (o.r / 2.2) * 1.6;
        pt.sp.position.set(Math.cos(pt.a) * rad, 0.1 + pt.h, Math.sin(pt.a) * rad);
        pt.sp.material.opacity = 0.55 * k * Math.min(1, (1.8 - pt.h) * 2);
      }
      o.winds.forEach((wl, i) => { wl.rotation.z += dt * (5 - i); wl.material.opacity = 0.3 * k; });
      o.seeds.forEach((s, i) => { const a = o.t * 5 + i * 2.1; s.position.set(Math.cos(a) * 0.45, 0.7 + 0.15 * Math.sin(o.t * 3 + i), Math.sin(a) * 0.45); s.rotation.y += dt * 8; });
    }
  }
"""
F = 'src/render/critters/reviewPathsFx.js'
patch(F, [
    ("import { AdditiveBlending, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, PlaneGeometry, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';",
     "import { AdditiveBlending, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';"),
    ("  // ---- REVIEW-ONLY: kit 2.3 (Kesh 18 Nov 06:28) ----\n", FX + "  // ---- REVIEW-ONLY: kit 2.3 (Kesh 18 Nov 06:28) ----\n"),
    ("    lilyUpdate(dt); // kit 2.2\n", "    lilyUpdate(dt); // kit 2.2\n    slUpdate(dt); // kit 2.3b\n    twUpdate(dt);\n"),
])
print('patched')
