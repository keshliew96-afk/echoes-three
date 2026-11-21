import sys
p = sys.argv[1] if len(sys.argv) > 1 else '/home/user/echoes-three/src/render/critters/reviewPathsFx.js'
t = open(p).read()
def rep(old, new, cnt=1):
    global t
    n = t.count(old)
    assert n == cnt, (n, old[:90])
    t = t.replace(old, new)

# Seeds a skill uses: fly to what used them (ally, leaf, sapling, hedge line), or pop where they lie.
rep("""  bus.on('review_seed_end', (ev) => {
    const o = kitObjs.get(ev.id);
    if (!o) return;
""", """  bus.on('review_seed_end', (ev) => {
    const o = kitObjs.get(ev.id);
    if (!o) return;
    if (ev.used) { // kit 1.7 (S56): the player sees the seed go and what it became
      const p = o.g.position;
      o.ring.visible = false;
      if (ev.toX != null) { o.thr = null; o.use = { from: p.clone(), to: new Vector3(ev.toX, ev.used === 'hedge' ? 0.2 : 0.5, ev.toZ), t: 0 }; return; }
      burst(p.x, 0.15, p.z, ev.used === 'flower' ? FLOWER : LEAF_LIGHT, 5, 0.09);
      o.fade = 0;
      return;
    }
""")
rep("""        if (o.thr && o.thr.t < 1) {
          o.thr.t = Math.min(1, o.thr.t + dt / o.thr.dur);""", """        if (o.use) { // kit 1.7: a used seed zips to what took it and pops there
          o.use.t = Math.min(1, o.use.t + dt / 0.28);
          o.g.position.lerpVectors(o.use.from, o.use.to, o.use.t);
          o.g.position.y += 0.3 * Math.sin(Math.PI * o.use.t);
          o.seed.rotation.x += dt * 12;
          if (o.use.t >= 1 && o.fade == null) { burst(o.use.to.x, o.use.to.y, o.use.to.z, LEAF_LIGHT, 5, 0.09); o.fade = 0; }
        } else if (o.thr && o.thr.t < 1) {
          o.thr.t = Math.min(1, o.thr.t + dt / o.thr.dur);""")
# A Puffcap grown from a seed springs up where the seed lay.
rep("""    g.position.set(ev.fromX, 0.7, ev.fromZ);
    root.add(g);
    k3.set(ev.id, { kind: 'puff', g, t: 0, from: new Vector3(ev.fromX, 0.7, ev.fromZ), to: new Vector3(ev.x, 0, ev.z) });""", """    const fy = ev.seed ? 0 : 0.7; // kit 1.7 U4 a: from a seed it springs up where the seed lay
    g.position.set(ev.fromX, fy, ev.fromZ);
    root.add(g);
    k3.set(ev.id, { kind: 'puff', g, t: 0, from: new Vector3(ev.fromX, fy, ev.fromZ), to: new Vector3(ev.x, 0, ev.z) });
    if (ev.seed) burst(ev.x, 0.15, ev.z, '#E9F2C8', 5, 0.09);""")
# New beats, before the R27 leaf block.
rep("""  // R27: after its heal the leaf flies home;""", """  // ---- Kit 1.7 (Kesh 11-16 22:56, U1 to U7): what a seed becomes.
  // U5 b: Heartbloom opens a seed as a flower that heals allies within 2 u.
  bus.on('review_seed_flower', (ev) => {
    flower(ev.x, 0.06, ev.z, 1.3, 4.2);
    ringPart(ev.x, ev.z, ev.r, PALETTE.brightHeal, 0.6, 0.12, 0.5);
    burst(ev.x, 0.35, ev.z, PALETTE.brightHeal, 6, 0.12);
    for (const id of ev.to || []) { const e = byId(id); if (e) burst(e.x, 0.7, e.z, PALETTE.brightHeal, 3, 0.1); }
  });
  // U6: Rootspear bursts a seed as a ring of roots (12 damage in 1.5 u and a slow), then it sprouts.
  const k7Spikes = [];
  const spikeGeo = new ConeGeometry(0.07, 0.5, 5);
  bus.on('review_seed_burst', (ev) => {
    ringPart(ev.x, ev.z, ev.r, '#8B6A45', 0.5, 0.08, 0.85);
    burst(ev.x, 0.2, ev.z, '#8B7A55', 6, 0.1);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, rr = ev.r * (i % 2 ? 0.75 : 0.5);
      const m = new Mesh(spikeGeo, mat(i % 2 ? WOOD : '#8B6A45'));
      m.position.set(ev.x + Math.cos(a) * rr, -0.3, ev.z + Math.sin(a) * rr);
      m.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      root.add(m);
      k7Spikes.push({ m, t: -0.02 * (i % 3) });
    }
  });
  // U3: the wind splits a seed in two.
  bus.on('review_seed_split', (ev) => { burst(ev.x, 0.3, ev.z, BLOSSOM, 5, 0.09); burst(ev.x, 0.2, ev.z, POLLEN, 3, 0.07); });
  function k7Update(dt) {
    for (let i = k7Spikes.length - 1; i >= 0; i--) {
      const s = k7Spikes[i];
      s.t += dt;
      const up = Math.min(1, Math.max(0, s.t) / 0.1), down = Math.max(0, (s.t - 0.45) / 0.25);
      s.m.position.y = -0.3 + 0.52 * up - 0.52 * Math.min(1, down);
      if (s.t > 0.75) { root.remove(s.m); s.m.material.dispose(); k7Spikes.splice(i, 1); }
    }
  }
  // R27: after its heal the leaf flies home;""")
rep("""    k5Update(dt);
""", """    k5Update(dt);
    k7Update(dt);
""")
open(p, 'w').write(t)
print('render17 ok')
