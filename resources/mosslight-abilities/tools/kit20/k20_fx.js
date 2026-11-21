  // ---- REVIEW-ONLY: kit 2.0 looks (rows L1 to L29): heals Bright Heal and blossom pink, her damage the
  // darker greens, acorns wood, pollen yellow. Dim and small: the old parts stay the main show.
  const k20Fly = new Map(); // flyer id -> { core, glow, tail[], hist[], kind }
  const k20Marks = new Map(); // `${target}|${kind}` -> { ring, left, t, id, y }
  const k20Lanes = new Map();
  const K20C = { blossom: BLOSSOM, mote: PALETTE.brightHeal, spirit: LEAF_LIGHT, blade: LEAF_LIGHT };
  bus.on('review_k20_fly', (ev) => {
    const heal = !ev.foe;
    const core = sprite(K20C[ev.kind] || PALETTE.brightHeal);
    const glow = sprite(heal ? PALETTE.brightHeal : DMG_DEEP);
    const tail = [0, 1].map(() => sprite(heal ? PALETTE.brightHeal : DMG));
    for (const x of [core, glow, ...tail]) root.add(x);
    k20Fly.set(ev.id, { core, glow, tail, hist: [], kind: ev.kind, t: 0, heal });
  });
  bus.on('review_k20_fly_end', (ev) => {
    const o = k20Fly.get(ev.id);
    if (!o) return;
    if (ev.landed) {
      const e = byId(ev.target);
      if (e) burst(e.x, 0.6, e.z, o.heal ? PALETTE.brightHeal : DMG, o.heal ? 5 : 6, 0.09);
      if (e && o.kind === 'blossom') burst(e.x, 0.7, e.z, BLOSSOM, 3, 0.08);
    }
    for (const x of [o.core, o.glow, ...o.tail]) { root.remove(x); x.material.dispose(); }
    k20Fly.delete(ev.id);
  });
  bus.on('review_k20_shot', (ev) => {
    const acorn = ev.kind === 'acorn';
    const s = acorn ? sprite(WOOD, false) : sprite(DMG);
    s.scale.setScalar(acorn ? 0.22 : 0.16);
    root.add(s);
    parts.push({ s, target: ev.target, from: new Vector3(ev.x, ev.h ?? 0.5, ev.z), t: 0, life: acorn ? 0.32 : 0.22, kind: 'pour', arc: acorn ? 0.5 : 0.08 });
    if (acorn) {
      const tx = ev.tx, tz = ev.tz, r = ev.r || 1;
      setTimeout(() => { burst(tx, 0.25, tz, WOOD, 5, 0.09); burst(tx, 0.3, tz, DMG, 4, 0.08); ringPart(tx, tz, r, DMG, 0.35, 0.15, 0.6); }, 300);
    }
  });
  const K20HIT = {
    petal: [BLOSSOM, 12, 0.11], slam: [WHITE_GOLD, 7, 0.12], razor: [LEAF_LIGHT, 4, 0.08], pierce: [LEAF_LIGHT, 4, 0.08],
    pollen: [POLLEN, 9, 0.1], wispfire: [PALETTE.brightHeal, 6, 0.1], thornmoss: [THORN_PALE, 5, 0.08], dream: [SPORE, 4, 0.08], dash: [DMG, 6, 0.09],
  };
  bus.on('review_k20_hit', (ev) => {
    const [c, n, sz] = K20HIT[ev.kind] || [DMG, 5, 0.09];
    burst(ev.x, 0.45, ev.z, c, n, sz);
    if (ev.kind === 'petal' || ev.kind === 'pollen') ringPart(ev.x, ev.z, ev.r, c, 0.5, 0.1, 0.6);
    else if (ev.kind === 'slam' || ev.kind === 'dash' || ev.kind === 'wispfire') ringPart(ev.x, ev.z, ev.r || 0.6, ev.kind === 'slam' ? WHITE_GOLD : DMG, 0.3, 0.6, 0.7);
    if (ev.kind === 'wispfire' || ev.kind === 'dash' || ev.kind === 'thornmoss') burst(ev.x, 0.4, ev.z, DMG_DEEP, 3, 0.07);
  });
  bus.on('review_k20_heal', (ev) => {
    const e = byId(ev.target);
    if (!e) return;
    const c = ev.kind === 'fruit' ? BLOSSOM : ev.kind === 'wet' || ev.kind === 'cling' ? WATER : PALETTE.brightHeal;
    burst(e.x, 0.6, e.z, c, ev.kind === 'fruit' ? 7 : 3, ev.kind === 'fruit' ? 0.11 : 0.07);
    if (ev.kind === 'fruit') burst(e.x, 0.9, e.z, PALETTE.brightHeal, 4, 0.09);
  });
  const K20MARK = { thorns: [THORN_PALE, 0.3], choke: [DMG_DEEP, 0.34], tangle: [LEAF, 0.38], slow: [WATER, 0.42], haste: [PALETTE.brightHeal, 0.46], keep: [LEAF_LIGHT, 0.5] };
  bus.on('review_k20_status', (ev) => {
    const [c, r] = K20MARK[ev.kind] || [DMG, 0.4];
    const key = `${ev.target}|${ev.kind}`;
    let m = k20Marks.get(key);
    if (!m) {
      const ring = flat(new RingGeometry(r - 0.035, r, ev.kind === 'thorns' || ev.kind === 'choke' ? 6 : 32), c, 0);
      root.add(ring);
      m = { ring, id: ev.target, t: 0, y: 0.06 + 0.01 * Object.keys(K20MARK).indexOf(ev.kind) };
      k20Marks.set(key, m);
    }
    m.left = ev.secs;
  });
  bus.on('review_k20_choke', (ev) => {
    const a = byId(ev.from);
    for (let i = 0; i < 3; i++) {
      const s = sprite(DMG_DEEP);
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, target: ev.target, from: a ? new Vector3(a.x, 0.3, a.z) : null, t: -i * 0.06, life: 0.4, kind: 'pour', arc: 0.1 });
    }
  });
  bus.on('review_k20_lane', (ev) => {
    const g = new Group();
    const bed = flat(new PlaneGeometry(ev.width, ev.len), WATER, 0);
    bed.position.y = 0.03;
    g.add(bed);
    g.position.set(ev.x + ev.dx * ev.len / 2, 0, ev.z + ev.dz * ev.len / 2);
    g.rotation.y = Math.atan2(ev.dx, ev.dz);
    root.add(g);
    k20Lanes.set(ev.id, { g, bed, t: 0, life: ev.secs, glint: 0, ev });
  });
  bus.on('review_k20_lane_end', (ev) => { const o = k20Lanes.get(ev.id); if (o) o.end = 0; });
  bus.on('review_k20_fallheal', (ev) => {
    const head = sprite(PALETTE.brightHeal);
    head.scale.setScalar(0.32);
    root.add(head);
    const tail = [0, 1, 2].map(() => { const t = sprite(PALETTE.brightHeal); t.scale.setScalar(0.18); root.add(t); return t; });
    parts.push({ s: head, kind: 'dive', t: 0, life: ev.secs, x: ev.x, z: ev.z, tail });
  });
  function k20Update(dt) {
    const live = new Map(((globalThis.__reviewK20 && globalThis.__reviewK20.flyers) || []).map((f) => [f.id, f]));
    for (const [id, o] of k20Fly) {
      o.t += dt;
      const f = live.get(id);
      if (f) o.core.position.set(f.x, o.kind === 'blade' ? 0.5 : 0.7 + 0.05 * Math.sin(o.t * 9), f.z);
      o.glow.position.copy(o.core.position);
      o.hist.unshift(o.core.position.clone());
      o.hist.length = Math.min(o.hist.length, 8);
      const grow = Math.min(1, o.t * 6);
      o.core.scale.setScalar((o.kind === 'mote' ? 0.11 : 0.15) * grow);
      o.core.material.opacity = 0.95;
      o.glow.scale.setScalar((o.kind === 'mote' ? 0.24 : 0.3) * grow);
      o.glow.material.opacity = 0.4;
      o.tail.forEach((s, i) => {
        const h = o.hist[Math.min(o.hist.length - 1, (i + 1) * 3)];
        if (h) s.position.copy(h);
        s.scale.setScalar((0.09 - i * 0.03) * grow);
        s.material.opacity = 0.45 - i * 0.18;
      });
    }
    for (const [key, m] of k20Marks) {
      m.left -= dt;
      m.t += dt;
      const e = byId(m.id);
      if (!e || m.left <= 0 || !(e.hp > 0)) {
        root.remove(m.ring);
        m.ring.material.dispose();
        m.ring.geometry.dispose();
        k20Marks.delete(key);
        continue;
      }
      m.ring.position.set(e.x, m.y, e.z);
      m.ring.rotation.z += dt * 0.8;
      m.ring.material.opacity = 0.7 * Math.min(1, m.t * 5) * Math.min(1, m.left * 2);
    }
    for (const [id, o] of k20Lanes) {
      o.t += dt;
      if (o.end != null) o.end += dt;
      const out = o.end != null ? Math.max(0, 1 - o.end / 0.4) : 1;
      o.bed.material.opacity = 0.2 * Math.min(1, o.t * 4) * out * (0.85 + 0.15 * Math.sin(o.t * 5));
      o.glint += dt;
      if (o.glint > 0.35 && out > 0.5) {
        o.glint = 0;
        const d = Math.random() * o.ev.len, w = (Math.random() - 0.5) * o.ev.width;
        burst(o.ev.x + o.ev.dx * d - o.ev.dz * w, 0.08, o.ev.z + o.ev.dz * d + o.ev.dx * w, WATER, 2, 0.06);
      }
      if (o.end != null && o.end > 0.4) {
        root.remove(o.g);
        o.bed.material.dispose();
        o.bed.geometry.dispose();
        k20Lanes.delete(id);
      }
    }
  }
