p='/home/user/echoes-three/src/sim/reviewStonehide.js'
s=open(p).read()
old_start=s.index("    if (st.thrown) {\n      const T = st.thrown, K2 = K.throw, step = K2.speed / TICK;")
old_end=s.index("      if (st.thrown) emit('review_sh_slabpos'")
new="""    if (st.thrown) {
      const T = st.thrown, K2 = K.throw, step = K2.speed / TICK, C6 = K.c6;
      T.count = T.count || new Map();
      T.stones = T.stones || 0;
      // C2 Slab pinball: a fresh foe within 4 u first; else a stone (the Growlstone or a ring stone,
      // at most 2 a throw); after a stone it may hit a foe it already hit, once more.
      const fresh = (from) => hostiles().filter((e) => !T.hit.has(e.id) && d2(e, from) <= K2.hop ** 2).sort((p, q) => d2(p, from) - d2(q, from))[0] || null;
      const again = (from, not) => hostiles().filter((e) => e.id !== not && (T.count.get(e.id) || 0) < 2 && d2(e, from) <= C6.pinHop ** 2).sort((p, q) => d2(p, from) - d2(q, from))[0] || null;
      const stone = (from) => {
        if (T.stones >= C6.pinStones) return null;
        const c = [];
        const g = st.growlstone;
        if (g && !g.fly && d2(g, from) <= C6.pinHop ** 2 && T.lastStone !== 'g') c.push({ x: g.x, z: g.z, g: true, key: 'g' });
        const R = st.ringSt;
        if (R && d2(from, R) < K.ring.r ** 2) {
          const dx = from.x - R.x, dz = from.z - R.z, l = Math.hypot(dx, dz) || 1, rr = K.ring.r - 0.3;
          const pnt = { x: R.x + (dx / l) * rr, z: R.z + (dz / l) * rr, key: 'r' + Math.round(Math.atan2(dz, dx) * 8) };
          if (pnt.key !== T.lastStone) c.push(pnt);
        }
        return c.sort((p, q) => d2(p, from) - d2(q, from))[0] || null;
      };
      const tgt = T.back ? a : T.stone ? T.stone : registry.byId(T.target);
      if (!T.back && !T.stone && (!tgt || !(tgt.hp > 0))) T.back = true;
      else {
        const dx = tgt.x - T.x, dz = tgt.z - T.z, l = Math.hypot(dx, dz);
        if (l <= step + (T.stone ? 0.05 : 0.3)) {
          if (T.back) {
            st.thrown = null;
            emit('review_sh_slabthrow', { on: false, caught: true, x: r2(a.x), z: r2(a.z) });
          } else if (T.stone) {
            const sn = T.stone;
            T.x = sn.x; T.z = sn.z;
            T.stones += 1;
            T.touched = true;
            T.lastStone = sn.key;
            T.stone = null;
            emit('review_sh_slabbounce', { x: r2(sn.x), z: r2(sn.z), g: !!sn.g });
            if (sn.g && st.growlstone) { st.growlstone.next = tick + 1; }
            const nx = T.n <= K2.bounces ? (fresh(T) || again(T, T.lastFoe)) : null;
            if (nx) T.target = nx.id;
            else if (T.rip) { st.thrown = null; emit('review_sh_slabthrow', { on: false, broke: true, x: r2(T.x), z: r2(T.z) }); }
            else T.back = true;
          } else {
            T.x = tgt.x; T.z = tgt.z;
            T.hit.add(tgt.id);
            T.count.set(tgt.id, (T.count.get(tgt.id) || 0) + 1);
            T.lastFoe = tgt.id;
            T.n += 1;
            hit(tgt, K2.dmg + weight(K2.hp), { src: 'slabthrow', dirFrom: { x: T.x - dx, z: T.z - dz }, kb: 0.15 });
            taunt(tgt, K2.taunt);
            emit('review_sh_slabhit', { id: tgt.id, x: r2(T.x), z: r2(T.z), n: T.n });
            const nx = T.n <= K2.bounces ? fresh(T) : null;
            const sn = !nx && T.n <= K2.bounces ? stone(T) : null;
            if (nx) T.target = nx.id;
            else if (sn) T.stone = sn;
            else if (T.rip) {
              st.thrown = null;
              emit('review_sh_slabthrow', { on: false, broke: true, x: r2(T.x), z: r2(T.z) });
            } else T.back = true;
          }
        } else {
          T.x += (dx / l) * step;
          T.z += (dz / l) * step;
        }
      }
"""
s=s[:old_start]+new+s[old_end:]
open(p,'w').write(s)
print('ok')
