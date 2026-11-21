p='/home/user/echoes-three/src/render/critters/reviewStonehideFx.js'
s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    assert c==n,(c,a[:80])
    s=s.replace(a,b)
# growlstone flight height
R("""      if (tt > ev.life) g.position.y = -0.7 * sm(ev.life, ev.life + 0.4, tt);
    });""","""      if (tt > ev.life) g.position.y = -0.7 * sm(ev.life, ev.life + 0.4, tt);
      if (it.flyY != null) {
        g.position.y = it.flyY;
        g.rotation.x += 0.12;
      } else g.rotation.x *= 0.8;
    });""")
# cubs: dig, up, roar
R("""        g.position.y = c.s === 'climb' ? -0.5 + 0.5 * sm(0, 0.45, c.t) : 0;""",
"""        g.position.y = c.s === 'climb' ? -0.5 + 0.5 * sm(0, 0.45, c.t) : c.s === 'dig' ? -0.6 * sm(0, 0.25, c.t - (c.digT || 0)) : 0;
        c.roar = Math.max(0, (c.roar || 0) - dt / 0.5);""")
R("""        ud.head.rotation.x = -0.4 * lunge;""","""        ud.head.rotation.x = -0.4 * lunge - 0.6 * Math.sin(Math.PI * Math.min(1, (1 - c.roar) * 1.2)) * (c.roar > 0 ? 1 : 0);""")
R("""    for (const a of ev.at || []) {
      const c = cubs.get(a.id);
      if (!c) continue;""","""    for (const id of ev.dig || []) {
      const c = cubs.get(id);
      if (!c) continue;
      c.s = 'dig';
      c.digT = c.t;
      chunks(c.x, c.z, { n: 6, r: 0.4, up: 1.6, life: 0.6 });
      puff(c.x, c.z, { n: 5, r: 0.35, color: OCHRE });
    }
    for (const u of ev.up || []) {
      const c = cubs.get(u.id);
      if (!c) continue;
      c.x = u.x; c.z = u.z; c.s = 'climb'; c.t = 0;
      c.g.position.set(u.x, -0.5, u.z);
      chunks(u.x, u.z, { n: 8, r: 0.6, up: 2, life: 0.7 });
      puff(u.x, u.z, { n: 6, r: 0.4, color: OCHRE });
    }
    for (const id of ev.roar || []) {
      const c = cubs.get(id);
      if (c) c.roar = 1;
    }
    for (const a of ev.at || []) {
      const c = cubs.get(a.id);
      if (!c) continue;
      if (c.s === 'dig' && a.s === 'dig') continue;""")
# fault rubble registered for Rubble is ammo
R("""    const life = ev.rubble + 0.5;
    add(g, life, (u, t) => {""","""    const life = ev.rubble + 0.5;
    const fr = { gone: null };
    if (ev.id != null) rubbleFx.set(ev.id, fr);
    add(g, life, (u, t) => {
      if (fr.gone == null && fr.kill) fr.gone = t;
      const used = fr.gone == null ? 1 : 1 - sm(fr.gone, fr.gone + 0.25, t);""")
R("""      for (const r of rubble) r.m.scale.setScalar(Math.max(0.001, r.s * sm(r.at, r.at + 0.1, k) * (1 - sm(0.88, 1, u))));""",
"""      for (const r of rubble) r.m.scale.setScalar(Math.max(0.001, r.s * sm(r.at, r.at + 0.1, k) * (1 - sm(0.88, 1, u)) * used));""")
R("""  // ---- Burrow: a mound of earth moves under the floor""","""  // ---- 1.6 combos (S58, S59, S60)
  const rubbleFx = new Map();
  bus.on('review_sh_rubble', (ev) => {
    const g = new Group();
    const rocks = [];
    for (let i = 0; i < 12; i++) {
      const m = new Mesh(rockGeo, i % 2 ? debMat : rockMat);
      const a = Math.random() * Math.PI * 2, rr = ev.r * Math.sqrt(Math.random());
      m.position.set(Math.cos(a) * rr, 0.05, Math.sin(a) * rr);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      g.add(m);
      rocks.push({ m, s: 0.6 + Math.random() * 0.9 });
    }
    g.position.set(ev.x, 0, ev.z);
    const fr = { gone: null };
    rubbleFx.set(ev.id, fr);
    add(g, ev.secs + 0.4, (u, t) => {
      if (fr.gone == null && fr.kill) fr.gone = t;
      const used = fr.gone == null ? 1 : 1 - sm(fr.gone, fr.gone + 0.25, t);
      for (const r of rocks) r.m.scale.setScalar(Math.max(0.001, r.s * sm(0, 0.15, t) * (1 - sm(0.9, 1, u)) * used));
    });
  });
  bus.on('review_sh_rubble_gone', (ev) => {
    const fr = rubbleFx.get(ev.id);
    if (fr) fr.kill = true;
    const t = tank();
    if (t) {
      chunks(t.x, t.z, { n: 6, r: 0.5, up: 1.8, life: 0.5, mat: rockMat });
      label('rubble: 3 rocks', PARCH, t.x, 2.0, t.z, { life: 1.0, size: 0.24 });
    }
  });
  bus.on('review_sh_spike', (ev) => {
    ring(ev.x, ev.z, ev.r, OCHRE, { life: 0.45, op: 0.8 });
    puff(ev.x, ev.z, { n: 14, r: 0.9, color: OCHRE, life: 0.8, size: 0.45 });
    chunks(ev.x, ev.z, { n: 12, r: 0.9, up: 2.4, life: 0.8, mat: rockMat });
    label('spike', PARCH, ev.x, 1.7, ev.z, { life: 1.0, size: 0.28 });
  });
  bus.on('review_sh_stonefly', (ev) => {
    if (!growl) return;
    if (ev.start) {
      const p = growl.obj.position;
      label('thrown', STEEL, p.x, 1.4, p.z, { life: 0.8, size: 0.22 });
      chunks(p.x, p.z, { n: 6, r: 0.4, up: 1.6, life: 0.6, mat: stoneMat });
      return;
    }
    growl.obj.position.x = ev.x;
    growl.obj.position.z = ev.z;
    growl.flyY = ev.done ? null : Math.max(0, ev.y);
    if (ev.done) {
      chunks(ev.x, ev.z, { n: 12, r: 0.9, up: 2.2, life: 0.8 });
      puff(ev.x, ev.z, { n: 10, r: 0.8, color: OCHRE, life: 0.8, size: 0.45 });
    }
  });
  bus.on('review_sh_slabbounce', (ev) => {
    chunks(ev.x, ev.z, { n: 8, r: 0.4, up: 1.8, life: 0.6, mat: stoneMat, size: 0.7 });
    ring(ev.x, ev.z, 0.5, STEEL, { life: 0.3, op: 0.6 });
  });
  bus.on('review_sh_impale', (ev) => {
    const g = new Group();
    const sp = [];
    for (let i = 0; i < 7; i++) {
      const m = new Mesh(new ConeGeometry(0.05, 0.75, 5), ironMat);
      m.geometry.translate(0, 0.375, 0);
      const a = (i / 7) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22);
      m.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      g.add(m);
      sp.push(m);
    }
    g.position.set(ev.x, 0, ev.z);
    add(g, 0.9, (u, t) => {
      for (const m of sp) m.scale.setScalar(Math.max(0.001, sm(0, 0.08, t) * (1 - sm(0.6, 1, u))));
    });
    chunks(ev.x, ev.z, { n: 6, r: 0.4, up: 1.6, life: 0.5, mat: ironMat, size: 0.6 });
    label('impaled', STEEL, ev.x, 1.7, ev.z, { life: 1.0, size: 0.26 });
  });

  // ---- Burrow: a mound of earth moves under the floor""")
R("""    growl = null;
    guard = null;
    mound = null;
  });""","""    growl = null;
    guard = null;
    mound = null;
    rubbleFx.clear();
  });""")
open(p,'w').write(s)
print('fx ok')
