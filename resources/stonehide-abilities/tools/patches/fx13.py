p='/home/user/echoes-three/src/render/critters/reviewStonehideFx.js'; s=open(p).read()
anchor="  // ---- Bodyguard (1.2): the hop, and dust where he lands"
assert s.count(anchor)==1
new=r"""  // ---- Stone Ring (S47): plain standing stones rise round him
  let ringIt = null;
  const tallGeo = new CylinderGeometry(0.13, 0.2, 0.95, 6);
  tallGeo.translate(0, 0.475, 0);
  bus.on('review_sh_stonering', (ev) => {
    if (!ev.on) {
      if (ringIt) ringIt.end = ringIt.t;
      ringIt = null;
      return;
    }
    if (ringIt) kill(ringIt);
    const g = new Group();
    const stones = [];
    for (let i = 0; i < ev.n; i++) {
      const a = (i / ev.n) * Math.PI * 2;
      const m = new Mesh(tallGeo, stoneMat);
      m.position.set(Math.cos(a) * ev.r, 0, Math.sin(a) * ev.r);
      m.rotation.y = Math.random() * 3;
      m.scale.set(1, 0.85 + 0.35 * ((i * 7) % 5) / 5, 1);
      g.add(m);
      stones.push({ m, h: m.scale.y, d: (i % 4) * 0.03 });
      setTimeout(() => chunks(ev.x + Math.cos(a) * ev.r, ev.z + Math.sin(a) * ev.r, { n: 2, r: 0.4, up: 1.6, life: 0.5 }), 0);
    }
    const fl = new Mesh(new RingGeometry(ev.r - 0.05, ev.r + 0.05, 72), basic(STONE, 0.35));
    fl.rotation.x = -Math.PI / 2;
    fl.position.y = 0.03;
    g.add(fl);
    g.position.set(ev.x, 0, ev.z);
    puff(ev.x, ev.z, { n: 12, r: ev.r, color: OCHRE, life: 0.7 });
    const it = add(g, 99, (u, t) => {
      const sink = it.end != null ? sm(0, 0.35, t - it.end) : 0;
      for (const st of stones) st.m.position.y = -0.95 * st.h * (1 - sm(st.d, ev.rise + st.d, t)) - 0.95 * st.h * sink;
      if (sink >= 1) it.t = it.life;
    });
    ringIt = it;
  });

  // ---- Slab Throw (S48): the slab flies, bounces through foes and comes back
  let thrownIt = null;
  function slabMesh(rip) {
    const src = window.__tripoTankSts && window.__tripoTankSts[0] && window.__tripoTankSts[0].weapon;
    if (src && !rip) {
      const g = new Group();
      const c = src.clone();
      c.position.set(0, 0, 0);
      c.quaternion.identity();
      const ws = new Vector3();
      src.getWorldScale(ws);
      c.scale.copy(ws);
      c.visible = true;
      // lay it flat-ish: the slab spins face up as it flies
      const holder = new Group();
      holder.rotation.x = -Math.PI / 2;
      holder.add(c);
      g.add(holder);
      return g;
    }
    const m = new Mesh(new BoxGeometry(0.55, 0.08, 0.7), rip ? stoneMat : ironMat);
    const g = new Group();
    g.add(m);
    return g;
  }
  bus.on('review_sh_slabthrow', (ev) => {
    if (ev.on) {
      cue('slabaway', { on: true, rip: ev.rip });
      if (thrownIt) kill(thrownIt);
      const g = slabMesh(ev.rip);
      g.position.set(ev.x, 0.8, ev.z);
      thrownIt = add(g, 99, (u, t, dt) => {
        g.rotation.y += dt * 14;
      });
      if (ev.rip) {
        chunks(ev.x, ev.z, { n: 12, r: 0.8, up: 2.4, mat: stoneMat, life: 0.8 });
        puff(ev.x, ev.z, { n: 8, r: 0.5, color: OCHRE });
      }
      return;
    }
    if (thrownIt) kill(thrownIt);
    thrownIt = null;
    cue('slabaway', { on: false });
    if (ev.broke) {
      chunks(ev.x, ev.z, { n: 16, r: 1.4, up: 2.4, mat: stoneMat, life: 0.9, size: 1.2 });
      puff(ev.x, ev.z, { n: 8, r: 0.6, color: STONE });
    } else if (ev.caught) puff(ev.x, ev.z, { n: 4, r: 0.3, color: STEEL, h: 1.2, life: 0.4, size: 0.2 });
  });
  bus.on('review_sh_slabpos', (ev) => {
    if (thrownIt) thrownIt.obj.position.set(ev.x, 0.8, ev.z);
  });
  bus.on('review_sh_slabhit', (ev) => {
    ring(ev.x, ev.z, 0.7, STEEL, { life: 0.3, op: 0.7 });
    chunks(ev.x, ev.z, { n: 5, r: 0.7, up: 1.6, mat: ironMat, life: 0.5, size: 0.6 });
  });

  // ---- Grindstone (S49): grinding dust whirls round him
  let grindIt = null;
  bus.on('review_sh_grind', (ev) => {
    if (!ev.on) {
      if (grindIt) grindIt.end = grindIt.t;
      grindIt = null;
      return;
    }
    const g = new Group();
    const motes = [];
    for (let i = 0; i < 46; i++) {
      const s2 = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: i % 3 ? STONE : DEBRIS, transparent: true, depthWrite: false, opacity: 0 }));
      const rr = 0.6 + Math.random() * (ev.r - 0.6);
      motes.push({ s: s2, rr, a: Math.random() * 6.28, h: 0.15 + Math.random() * 0.9, sp: 2.2 + Math.random() * 1.5, sz: 0.18 + Math.random() * 0.22 });
      g.add(s2);
    }
    const bits = [];
    for (let i = 0; i < 14; i++) {
      const m = new Mesh(rockGeo, i % 2 ? stoneMat : debMat);
      bits.push({ m, rr: 0.8 + Math.random() * (ev.r - 0.9), a: Math.random() * 6.28, h: 0.1 + Math.random() * 0.6, sp: 2.6 + Math.random() });
      g.add(m);
    }
    const fl = new Mesh(new RingGeometry(ev.r - 0.06, ev.r, 72), basic(STONE, 0.4));
    fl.rotation.x = -Math.PI / 2;
    fl.position.y = 0.04;
    g.add(fl);
    const it = add(g, 99, (u, t, dt) => {
      const T = tank();
      if (T) g.position.set(T.x, 0, T.z);
      const fade = (1 - (it.end != null ? sm(0, 0.4, t - it.end) : 0)) * sm(0, 0.3, t);
      for (const m of motes) {
        m.a += m.sp * dt;
        m.s.position.set(Math.cos(m.a) * m.rr, m.h, Math.sin(m.a) * m.rr);
        m.s.scale.setScalar(m.sz);
        m.s.material.opacity = 0.45 * fade;
      }
      for (const b of bits) {
        b.a += b.sp * dt;
        b.m.position.set(Math.cos(b.a) * b.rr, b.h, Math.sin(b.a) * b.rr);
        b.m.rotation.x += dt * 8;
        b.m.scale.setScalar(Math.max(0.001, fade));
      }
      fl.material.opacity = 0.4 * fade;
      if (it.end != null && fade <= 0) it.t = it.life;
    });
    grindIt = it;
  });

  // ---- Stone Cubs (S50): stand-in cubs (a stone badger, knee-high) until Kesh's Tripo model
  const cubs = new Map();
  const paleMat = new MeshStandardMaterial({ color: '#CFC9BC', roughness: 1, flatShading: true });
  const darkMat = new MeshStandardMaterial({ color: '#2C2A27', roughness: 1, flatShading: true });
  function makeCub() {
    const g = new Group();
    const body = new Mesh(new DodecahedronGeometry(0.2, 0), stoneMat);
    body.scale.set(0.9, 0.75, 1.25);
    body.position.y = 0.2;
    g.add(body);
    const head = new Mesh(new DodecahedronGeometry(0.13, 0), stoneMat);
    head.position.set(0, 0.3, 0.25);
    g.add(head);
    const stripe = new Mesh(new BoxGeometry(0.05, 0.03, 0.2), paleMat);
    stripe.position.set(0, 0.42, 0.25);
    g.add(stripe);
    for (const sx of [-1, 1]) {
      const band = new Mesh(new BoxGeometry(0.035, 0.04, 0.12), darkMat);
      band.position.set(0.06 * sx, 0.36, 0.31);
      g.add(band);
      const ear = new Mesh(new DodecahedronGeometry(0.04, 0), stoneMat);
      ear.position.set(0.09 * sx, 0.42, 0.18);
      g.add(ear);
    }
    const snout = new Mesh(new BoxGeometry(0.07, 0.06, 0.08), darkMat);
    snout.position.set(0, 0.27, 0.37);
    g.add(snout);
    const legs = [];
    for (const [lx, lz] of [[-0.11, 0.13], [0.11, 0.13], [-0.11, -0.15], [0.11, -0.15]]) {
      const l = new Mesh(new BoxGeometry(0.07, 0.13, 0.07), stoneMat);
      l.position.set(lx, 0.06, lz);
      g.add(l);
      legs.push(l);
    }
    g.userData = { head, legs, body };
    return g;
  }
  bus.on('review_sh_cubs', (ev) => {
    for (const b of ev.born || []) {
      const g = makeCub();
      g.position.set(b.x, -0.5, b.z);
      chunks(b.x, b.z, { n: 8, r: 0.6, up: 2, life: 0.7 });
      puff(b.x, b.z, { n: 6, r: 0.4, color: OCHRE });
      const c = { g, x: b.x, z: b.z, yaw: 0, s: 'climb', bite: 0, t: 0 };
      c.it = add(g, 1e9, (u, t, dt) => {
        c.t += dt;
        const k = Math.min(1, dt * 14);
        g.position.x += (c.x - g.position.x) * k;
        g.position.z += (c.z - g.position.z) * k;
        g.position.y = c.s === 'climb' ? -0.5 + 0.5 * sm(0, 0.45, c.t) : 0;
        const dy = Math.atan2(Math.sin(c.yaw - g.rotation.y), Math.cos(c.yaw - g.rotation.y));
        g.rotation.y += dy * Math.min(1, dt * 12);
        const run = c.s === 'run' ? 1 : 0;
        const ud = g.userData;
        ud.legs.forEach((l, i) => (l.rotation.x = run * 0.7 * Math.sin(c.t * 18 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0))));
        ud.body.position.y = 0.2 + run * 0.03 * Math.abs(Math.sin(c.t * 18));
        c.bite = Math.max(0, c.bite - dt / 0.22);
        const lunge = Math.sin(Math.PI * (1 - c.bite)) * (c.bite > 0 ? 1 : 0);
        ud.head.position.z = 0.25 + 0.1 * lunge;
        ud.head.rotation.x = -0.4 * lunge;
      });
      cubs.set(b.id, c);
    }
    for (const a of ev.at || []) {
      const c = cubs.get(a.id);
      if (!c) continue;
      c.x = a.x;
      c.z = a.z;
      c.s = a.s;
      c.yaw = Math.atan2(a.fx, a.fz);
    }
    for (const id of ev.bit || []) {
      const c = cubs.get(id);
      if (!c) continue;
      c.bite = 1;
      puff(c.x + Math.sin(c.yaw) * 0.35, c.z + Math.cos(c.yaw) * 0.35, { n: 3, r: 0.2, color: STONE, h: 0.5, life: 0.4, size: 0.18 });
    }
    for (const id of ev.gone || []) {
      const c = cubs.get(id);
      if (!c) continue;
      chunks(c.x, c.z, { n: 10, r: 0.6, up: 1.4, mat: stoneMat, life: 0.8 });
      puff(c.x, c.z, { n: 6, r: 0.4, color: STONE });
      kill(c.it);
      cubs.delete(id);
    }
  });

  // ---- Kick the stone: the Growlstone rolls
  bus.on('review_sh_roll', (ev) => {
    if (!growl) return;
    if (ev.start) {
      growl.roll = { dx: ev.dx, dz: ev.dz };
      label('rolls', STEEL, growl.obj.position.x, 1.2, growl.obj.position.z, { life: 0.8, size: 0.22 });
      return;
    }
    const g = growl.obj;
    const dx = ev.x - g.position.x, dz = ev.z - g.position.z, d = Math.hypot(dx, dz);
    g.position.x = ev.x;
    g.position.z = ev.z;
    if (growl.roll && d > 0.001) {
      g.children[0].rotateOnWorldAxis(new Vector3(growl.roll.dz, 0, -growl.roll.dx), d / 0.4);
      if (Math.random() < 0.5) puff(ev.x, ev.z, { n: 2, r: 0.3, color: OCHRE, life: 0.5 });
    }
    if (ev.done) growl.roll = null;
  });
  bus.on('review_sh_slamweight', (ev) => {
    label(`+${ev.extra} from Stone`, STEEL, ev.x, 1.9, ev.z, { life: 1.2, size: 0.24 });
  });
  bus.on('review_sh_shotback', (ev) => {
    const s2 = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: STEEL, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    s2.scale.setScalar(0.32);
    add(s2, ev.secs, (u) => {
      const e = byId(ev.id);
      const x1 = e ? e.x : ev.x, z1 = e ? e.z : ev.z;
      s2.position.set(ev.x + (x1 - ev.x) * u, 0.7, ev.z + (z1 - ev.z) * u);
      s2.material.opacity = 0.9;
    });
    line(() => ({ x: ev.x, z: ev.z }), pos(ev.id), STEEL, { life: ev.secs + 0.1, op: 0.35, w: 0.04, y: 0.7 });
  });
  bus.on('review_sh_wallslam', (ev) => {
    chunks(ev.x, ev.z, { n: 14, r: 1.2, up: 2.2, mat: stoneMat, life: 0.9 });
    puff(ev.x, ev.z, { n: 12, r: 0.8, color: OCHRE, life: 0.8, size: 0.45 });
    label('wall slam', PARCH, ev.ex, 1.7, ev.ez, { life: 1.0, size: 0.26 });
    // a crack mark on the wall face
    const m = new Sprite(new SpriteMaterial({ map: crackTex, color: '#3A332B', transparent: true, depthWrite: false }));
    m.position.set(ev.x - ev.dx * 0.05, 0.6, ev.z - ev.dz * 0.05);
    m.scale.setScalar(1.1);
    add(m, 2.5, (u) => (m.material.opacity = 0.9 * (1 - sm(0.7, 1, u))));
  });

  // ---- Stoneheart (S53): a stone-grey heart on his chest; a capped hit throws a ring of chips
  const heartTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = STONE;
    g.strokeStyle = STEEL;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(32, 54);
    g.bezierCurveTo(4, 34, 8, 8, 32, 20);
    g.bezierCurveTo(56, 8, 60, 34, 32, 54);
    g.fill();
    g.stroke();
    return new CanvasTexture(c);
  })();
  bus.on('review_sh_heart', (ev) => {
    const g = new Group();
    const h = new Sprite(new SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, depthTest: false }));
    h.renderOrder = 997;
    h.scale.setScalar(0.32);
    const glow = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: STEEL, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.4 }));
    glow.scale.setScalar(0.7);
    g.add(glow, h);
    add(g, ev.secs, (u, t) => {
      const T = tank();
      if (T) g.position.set(T.x, 1.0 * (window.__tripoTankSts?.[0]?.dbg?.grow.k || 1), T.z + 0.25);
      const f = sm(0, 0.15, t) * (1 - sm(0.94, 1, u));
      h.material.opacity = f;
      glow.material.opacity = 0.35 * f * (0.8 + 0.2 * Math.sin(t * 6));
    });
  });
  bus.on('review_sh_capped', (ev) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const m = new Mesh(rockGeo, stoneMat);
      m.position.set(ev.x, 0.9, ev.z);
      add(m, 0.5, (u) => {
        m.position.set(ev.x + Math.cos(a) * 1.1 * u, 0.9 - 0.5 * u, ev.z + Math.sin(a) * 1.1 * u);
        m.scale.setScalar(1 - u * 0.5);
      });
    }
    label(`${ev.thrown} → ${ev.took}`, STEEL, ev.x, 2.3, ev.z, { life: 1.3, size: 0.26 });
  });

  // ---- Counter Spin (S54): every 5th hit he spins
  bus.on('review_sh_spincount', (ev) => {
    const t = tank();
    if (t) label(`${ev.n}/5`, PARCH, t.x + 0.5, 2.0, t.z, { life: 0.6, rise: 0.3, size: 0.2 });
  });
  bus.on('review_sh_spin', (ev) => {
    const arc = new Mesh(new RingGeometry(0.75, 1, 64), basic(STEEL, 0.75));
    arc.rotation.x = -Math.PI / 2;
    add(arc, 0.4, (u) => {
      const T = tank();
      if (T) arc.position.set(T.x, 0.4, T.z);
      arc.scale.setScalar(ev.r * (0.5 + 0.5 * u));
      arc.material.opacity = 0.75 * (1 - u);
    });
    puff(ev.x, ev.z, { n: 10, r: ev.r, color: OCHRE, life: 0.6 });
  });

  // ---- Badger Toss (S55): grab, heave, land
  bus.on('review_sh_btoss', (ev) => {
    if (ev.phase === 'land') {
      ring(ev.x, ev.z, ev.r, OCHRE, { life: 0.45, op: 0.8 });
      chunks(ev.x, ev.z, { n: 14, r: 1.4, up: 2.4, life: 0.9 });
      puff(ev.x, ev.z, { n: 12, r: 1.2, color: OCHRE, life: 0.8, size: 0.45 });
    }
  });

"""
s=s.replace(anchor,new+anchor)
s=s.replace("    cue('slab', { on: false });\n","    cue('slab', { on: false });\n    cue('slabaway', { on: false });\n    if (ringIt) kill(ringIt);\n    ringIt = null;\n    if (grindIt) kill(grindIt);\n    grindIt = null;\n    if (thrownIt) kill(thrownIt);\n    thrownIt = null;\n    for (const c of cubs.values()) kill(c.it);\n    cubs.clear();\n",1)
# quills spread: smaller ring
s=s.replace("    ring(ev.x, ev.z, 4, STEEL, { life: 0.3, op: 0.35 });","    ring(ev.x, ev.z, ev.r || 4, STEEL, { life: 0.3, op: 0.35 });",1)
open(p,'w').write(s)
print('ok')
