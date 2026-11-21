p='/home/user/echoes-three/src/sim/reviewStonehide.js'; s=open(p).read()
a="""      S.apply(foe, 'stun', 1, sec(B.lift + B.fly + 0.1), getTick(), a.id);"""
assert s.count(a)==1
s=s.replace(a,"""      // a stone of his own Stone Ring stops the throw like a wall (S51)
      const R = st.ringSt;
      if (R && d2(foe, R) < K.ring.r ** 2 && (tx - R.x) ** 2 + (tz - R.z) ** 2 > (K.ring.r - 0.45) ** 2) {
        const sx = a.x - R.x, sz = a.z - R.z, ux = dx / l, uz = dz / l;
        const bq = sx * ux + sz * uz, cq = sx * sx + sz * sz - (K.ring.r - 0.45) ** 2;
        const tt = -bq + Math.sqrt(Math.max(0, bq * bq - cq));
        tx = a.x + ux * tt; tz = a.z + uz * tt;
        wall = { x: R.x + ((tx - R.x) * K.ring.r) / (K.ring.r - 0.45), z: R.z + ((tz - R.z) * K.ring.r) / (K.ring.r - 0.45) };
      }
""" + a)
open(p,'w').write(s)
p='/home/user/echoes-three/src/render/critters/tripoTank.js'; s=open(p).read()
a="    if (slab.on && dashT < 0) wantYaw = SLAB_YAW;"
assert s.count(a)==1
s=s.replace(a,"    if (slab.on && dashT < 0 && slab.yaw != null) wantYaw = slab.yaw;")
a="""        m.decompose(st.weapon.position, st.weapon.quaternion, st.weapon.scale);
      }
    }
    // body bits"""
assert s.count(a)==1
s=s.replace(a,"""        m.decompose(st.weapon.position, st.weapon.quaternion, st.weapon.scale);
        // the held pose twists his chest: turn the body so the slab sits toward the aim
        if (slab.yaw == null && slab.w > 0.9) {
          st.model.updateMatrixWorld(true);
          const v = st.weapon.getWorldPosition(new Vector3());
          st.model.worldToLocal(v);
          slab.yaw = -Math.atan2(v.x, v.z);
        }
      }
    }
    // body bits""")
s=s.replace("""      if (ev.on) {
        slab.on = true;""","""      if (ev.on) {
        slab.on = true;
        slab.yaw = null;""",1)
open(p,'w').write(s)
print('ok')
p='/home/user/echoes-three/src/sim/reviewStonehide.js'; s=open(p).read()
a="    dash: (dx, dz) => st.queue.push(() => startDash({ x: dx, z: dz })),"
assert s.count(a)==1
s=s.replace(a,a+"""
    // a heavy blow from the nearest foe (the Stoneheart clip)
    blow: (amount, k = 0) => st.queue.push(() => {
      const t = tank();
      const hs = hostiles().sort((p, q) => d2(p, t) - d2(q, t));
      const f = hs[k % Math.max(1, hs.length)];
      if (!t || !f) return;
      emit('review_sh_blow', { big: amount >= 20, id: f.id, x: r2(f.x), z: r2(f.z), tx: r2(t.x), tz: r2(t.z) });
      const l = Math.hypot(t.x - f.x, t.z - f.z) || 1;
      combat.applyDamage(t, amount, { delivery: 'contact', shape: 'contact', dirX: (t.x - f.x) / l, dirZ: (t.z - f.z) / l, attacker: f.id });
    }),""")
open(p,'w').write(s)
p='/home/user/echoes-three/src/render/critters/reviewStonehideFx.js'; s=open(p).read()
a="  // ---- Counter Spin (S54): every 5th hit he spins"
assert s.count(a)==1
s=s.replace(a,"""  // a heavy blow from a foe (Foe Crimson, the foe's own colour)
  bus.on('review_sh_blow', (ev) => {
    const ang = Math.atan2(ev.tz - ev.z, ev.tx - ev.x);
    const arc = new Mesh(new RingGeometry(0.7, 1, 32, 1, -0.9, 1.8), basic('#B8141F', 0.85));
    arc.rotation.set(-Math.PI / 2, 0, -ang);
    arc.position.set((ev.x + ev.tx) / 2, 0.6, (ev.z + ev.tz) / 2);
    add(arc, 0.3, (u) => {
      arc.scale.setScalar(0.5 + 0.5 * u);
      arc.material.opacity = 0.85 * (1 - u);
    });
    if (ev.big) label('heavy blow', PARCH, ev.x, 1.4, ev.z, { life: 0.8, size: 0.2 });
  });
"""+a)
open(p,'w').write(s)
print('ok2')
