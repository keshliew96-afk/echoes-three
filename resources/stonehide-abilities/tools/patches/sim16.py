import sys
p='/home/user/echoes-three/src/sim/reviewStonehide.js'
s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    assert c==n,(c,a[:80])
    s=s.replace(a,b)
# constants
R("  quills: { r: 4, n: 8, dmg: 10, secs: 5, back: 6 },\n});",
"""  quills: { r: 4, n: 8, dmg: 10, secs: 5, back: 6 },
  // 1.6 combos (S58, S59, S60): C1 throw the stone, C2 slab pinball, C3 rubble is ammo, C4 cubs copy him,
  // C5 Spike, C7 slab charge, C8 thorn slam, C9 Grudge bursts the quills
  c6: { stoneNear: 2, stoneLand: 1.5, stoneDmg: 16, stoneTaunt: 3, stoneFly: 0.6, rubbleNear: 2, rubbleR: 1.2, rocks: 3, rockGap: 0.12,
    pinStones: 2, pinHop: 4, spike: 0.5, spikeR: 1.5, spikeDmg: 10, cubBurst: 8, cubBurstR: 1.5, cubRoarR: 2, cubRoar: 2,
    carry: 1.5, impale: 12, impaleHp: 0.03, burstN: 3, burstR: 3, burstDmg: 10 },
});""")
# Spike in hit()
R("""    if (st.giant && src !== 'shatter') amount *= 1 + K.colossus.dmg;
    busy = true;""","""    if (st.giant && src !== 'shatter') amount *= 1 + K.colossus.dmg;
    // Spike (S58): Heavy Slam, basic hit 3 or Savage Bite on a foe he threw up, before it lands
    const spiked = (src === 'slam' || src === 'basic3' || src === 'bite') && t.reviewLift && !isBig(t);
    if (spiked) amount *= 1 + K.c6.spike;
    busy = true;""")
R("""    busy = false;
    if (st.fracture && t.hp > 0 && src !== 'cub') crack(t, a.id, /^(basic|thorns|quill_back|briar_back|shot_back)$/.test(src));
    return r;""","""    busy = false;
    if (st.fracture && t.hp > 0 && src !== 'cub') crack(t, a.id, /^(basic|thorns|quill_back|briar_back|shot_back)$/.test(src));
    if (spiked) {
      t.reviewLift = null;
      t.reviewY = 0;
      emit('review_sh_spike', { id: t.id, x: r2(t.x), z: r2(t.z), r: K.c6.spikeR });
      for (const f of hostiles()) if (f !== t && d2(f, t) <= K.c6.spikeR ** 2) hit(f, K.c6.spikeDmg, { src: 'spike', dirFrom: t, kb: 0 });
    }
    return r;""")
# shove remembers whether it started inside the briar
R("    e.reviewPush = { dx: dx / l, dz: dz / l, until: getTick() + ticks + 1, done: false };\n  }",
"    e.reviewPush = { dx: dx / l, dz: dz / l, until: getTick() + ticks + 1, done: false, inBriar: !!(st.briar && d2(e, st.briar) <= K.briar.r ** 2) };\n  }")
R("""    const r = e.radius ?? 0.4;
    let wall = null;
    if (P.dx > 0.3""","""    const r = e.radius ?? 0.4;
    // Thorn slam (1.6, C8): pushed into his Iron Briar, it is impaled
    if (st.briar && !P.inBriar && d2(e, st.briar) <= K.briar.r ** 2) {
      P.done = true;
      impale(e);
      return;
    }
    let wall = null;
    if (P.dx > 0.3""")
R("""  function slowOn(e, mag, secs) {""","""  function impale(e) {
    emit('review_sh_impale', { id: e.id, x: r2(e.x), z: r2(e.z) });
    hit(e, K.c6.impale + weight(K.c6.impaleHp), { src: 'impale', kb: 0 });
    if (e.hp > 0) {
      st.quilled.set(e.id, getTick() + sec(K.quills.secs));
      st.quillCast.set(e.id, { hit: new Set([e.id]) });
      emit('review_sh_quills', { ids: [e.id], x: r2(e.x), z: r2(e.z), r: 0.6 });
    }
  }
  // Rubble (S59): Fault Line's strip, or a round patch (Burrow, a giant's slam)
  function nearRubble(p, d) {
    for (const r of st.rubble) {
      if (r.round) { if (d2(p, r) <= (d + r.r) ** 2) return r; continue; }
      const dx = p.x - r.x, dz = p.z - r.z, along = Math.max(0, Math.min(r.len, dx * r.dx + dz * r.dz));
      if ((p.x - (r.x + r.dx * along)) ** 2 + (p.z - (r.z + r.dz * along)) ** 2 <= (d + r.w / 2) ** 2) return r;
    }
    return null;
  }
  function addRubble(x, z) {
    const id = getTick() * 7 + st.rubble.length;
    st.rubble.push({ id, round: true, x, z, r: K.c6.rubbleR, until: getTick() + sec(K.fault.rubble) });
    emit('review_sh_rubble', { id, x: r2(x), z: r2(z), r: K.c6.rubbleR, secs: K.fault.rubble });
  }
  function throwRock(a, dir, best, delay = 0) {
    const go = () => {
      const t = tank();
      const to = best ? { x: best.x, z: best.z } : { x: t.x + dir.x * K.rock.reach * 0.7, z: t.z + dir.z * K.rock.reach * 0.7 };
      emit('review_sh_rock', { x0: r2(t.x + dir.x * 0.3), z0: r2(t.z + dir.z * 0.3), x1: r2(to.x), z1: r2(to.z), id: best ? best.id : null, secs: K.rock.flight });
      if (best) later(K.rock.flight, () => {
        if (!(best.hp > 0)) return;
        hit(best, K.rock.dmg + weight(K.rock.hp), { src: 'rock', kb: -K.rock.stumble });
        taunt(best, K.rock.taunt);
        emit('review_sh_dust', { x: r2(best.x), z: r2(best.z), r: 0.6 });
      });
    };
    if (delay > 0) later(delay, go); else go();
  }
  function slowOn(e, mag, secs) {""")
# Rock Toss: throw the stone (C1), rubble is ammo (C3)
R("""      const to = best ? { x: best.x, z: best.z } : { x: a.x + dir.x * K.rock.reach * 0.7, z: a.z + dir.z * K.rock.reach * 0.7 };
      emit('review_sh_rock', { x0: r2(a.x + dir.x * 0.3), z0: r2(a.z + dir.z * 0.3), x1: r2(to.x), z1: r2(to.z), id: best ? best.id : null, secs: K.rock.flight });
      if (best) later(K.rock.flight, () => {
        if (!(best.hp > 0)) return;
        const t = tank();
        hit(best, K.rock.dmg + weight(K.rock.hp), { src: 'rock', kb: -K.rock.stumble });
        taunt(best, K.rock.taunt);
        emit('review_sh_dust', { x: r2(best.x), z: r2(best.z), r: 0.6 });
      });
    }),""","""      const g = st.growlstone, C6 = K.c6;
      if (g && best && !g.roll && !g.fly && d2(g, a) <= C6.stoneNear ** 2) {
        // C1: he throws the Growlstone; it lands beside the foe and roars at once
        const dx = a.x - best.x, dz = a.z - best.z, l = Math.hypot(dx, dz) || 1;
        g.fly = { t: 0, x0: g.x, z0: g.z, x1: best.x + (dx / l) * 0.9, z1: best.z + (dz / l) * 0.9 };
        emit('review_sh_stonefly', { id: g.id, start: true });
        return;
      }
      const rub = best ? nearRubble(a, C6.rubbleNear) : null;
      if (rub) {
        // C3: three rocks from the rubble, at his foe and the two nearest to it; the rubble is used up
        st.rubble = st.rubble.filter((r) => r !== rub);
        emit('review_sh_rubble_gone', { id: rub.id });
        const more = hostiles().filter((e) => e !== best && d2(e, a) <= K.rock.reach ** 2).sort((p, q) => d2(p, best) - d2(q, best)).slice(0, C6.rocks - 1);
        [best, ...more].forEach((e, i) => throwRock(a, dir, e, i * C6.rockGap));
        return;
      }
      throwRock(a, dir, best);
    }),""")
# Fault Line rubble gets an id
R("        st.rubble.push({ x: o.x, z: o.z, dx: dir.x, dz: dir.z, len: K.fault.len, w: K.fault.w, until: getTick() + sec(K.fault.rubble) });",
"        st.rubble.push({ id: fid, x: o.x, z: o.z, dx: dir.x, dz: dir.z, len: K.fault.len, w: K.fault.w, until: getTick() + sec(K.fault.rubble) });")
R("""        emit('review_sh_fault', { x: r2(o.x), z: r2(o.z), dx: r2(dir.x), dz: r2(dir.z), len: K.fault.len, w: K.fault.w, run: K.fault.run, rubble: K.fault.rubble });""",
"""        const fid = getTick() * 7 + 5;
        emit('review_sh_fault', { id: fid, x: r2(o.x), z: r2(o.z), dx: r2(dir.x), dz: r2(dir.z), len: K.fault.len, w: K.fault.w, run: K.fault.run, rubble: K.fault.rubble });""")
R("""    if (tick % 10 === 0) for (const r of st.rubble) for (const e of hostiles()) if (inStrip(r, { x: r.dx, z: r.dz }, r.len, r.w, e)) slowOn(e, K.fault.slow, 0.3);""",
"""    if (tick % 10 === 0) for (const r of st.rubble) for (const e of hostiles()) if (r.round ? d2(e, r) <= r.r ** 2 : inStrip(r, { x: r.dx, z: r.dz }, r.len, r.w, e)) slowOn(e, K.fault.slow, 0.3);""")
# Bellow: the cubs roar with him (C4)
R("""        hit(e, K.bellow.dmg, { src: 'bellow' });
        taunt(e, K.bellow.taunt);
      }
    }),""","""        hit(e, K.bellow.dmg, { src: 'bellow' });
        taunt(e, K.bellow.taunt);
      }
      const roared = [];
      for (const cb of st.cubs) {
        if (cb.state === 'dig') continue;
        roared.push(cb.id);
        emit('review_sh_ring', { x: r2(cb.x), z: r2(cb.z), r: K.c6.cubRoarR, kind: 'roar' });
        for (const e of hostiles()) if (d2(e, cb) <= K.c6.cubRoarR ** 2) taunt(e, K.c6.cubRoar, { from: { x: cb.x, z: cb.z } });
      }
      if (roared.length) emit('review_sh_cubs', { roar: roared });
    }),""")
# Burrow: rubble where he comes up; the cubs dig along and burst out with him (C4)
R("""      emit('review_sh_dig', { phase: 'down', x: r2(a.x), z: r2(a.z) });
      play('digDown', 0);
    },""","""      emit('review_sh_dig', { phase: 'down', x: r2(a.x), z: r2(a.z) });
      play('digDown', 0);
      if (st.cubs.length) {
        for (const cb of st.cubs) { cb.state = 'dig'; cb.target = null; }
        emit('review_sh_cubs', { dig: st.cubs.map((c) => c.id) });
      }
    },""")
R("""          shakeStone(a.x, a.z, B.r);
        }
      }
      if (A.up && A.t >= B.down + B.tunnel + 0.6) st.act = null;""","""          shakeStone(a.x, a.z, B.r);
          addRubble(a.x, a.z);
          const ups = [];
          st.cubs.forEach((cb, i) => {
            if (cb.state !== 'dig') return;
            const side = i % 2 ? -1 : 1;
            cb.x = a.x - A.dir.z * 1.1 * side - A.dir.x * 0.3;
            cb.z = a.z + A.dir.x * 1.1 * side - A.dir.z * 0.3;
            cb.state = 'climb';
            cb.born = tick;
            ups.push({ id: cb.id, x: r2(cb.x), z: r2(cb.z) });
            for (const e of hostiles()) if (d2(e, cb) <= K.c6.cubBurstR ** 2) hit(e, K.c6.cubBurst, { src: 'cub', dirFrom: cb, kb: 0.3 });
          });
          if (ups.length) emit('review_sh_cubs', { up: ups });
        }
      }
      if (A.up && A.t >= B.down + B.tunnel + 0.6) st.act = null;""")
R("""        if (cb.state === 'climb') {""","""        if (cb.state === 'dig') continue;
        if (cb.state === 'climb') {""")
# Slab charge (C7)
R("""    st.act = { kind: 'dash', t: 0, dir: { x: dir.x / l, z: dir.z / l }, x0: a.x, z0: a.z, knocked: new Set() };""",
"""    st.act = { kind: 'dash', t: 0, dir: { x: dir.x / l, z: dir.z / l }, x0: a.x, z0: a.z, knocked: new Set(), charge: !!st.slab, carried: new Map() };
    if (st.slab) st.slab.until = Infinity; // C7: the slab stays in front for the charge""")
R("""      if (A.t >= D.t0 && A.t <= D.t1 + 0.02) {
        a.x = A.x0 + A.dir.x * D.dist * e2;
        a.z = A.z0 + A.dir.z * D.dist * e2;
        a.iframeUntilTick = tick + 2;
        for (const e of hostiles()) {""","""      if (A.charge && A.t >= D.t0 && A.t <= D.t1 + 0.02) {
        // Slab charge (1.6, C7): foes within 1.5 u in front go with him; a wall stops the charge
        if (!A.blocked) {
          a.x = A.x0 + A.dir.x * D.dist * e2;
          a.z = A.z0 + A.dir.z * D.dist * e2;
        }
        a.iframeUntilTick = tick + 2;
        for (const e of hostiles()) {
          if (A.carried.has(e.id) || isBig(e)) continue;
          const dx = e.x - a.x, dz = e.z - a.z, along = dx * A.dir.x + dz * A.dir.z, lat = -dx * A.dir.z + dz * A.dir.x;
          if (along > 0 && Math.hypot(dx, dz) <= K.c6.carry + (e.radius ?? 0.4) * 0.5) {
            A.carried.set(e.id, { along: Math.max(0.95, along), lat });
            S.apply(e, 'stun', 1, sec(D.t1 - A.t + 0.3), tick, a.id);
            taunt(e, D.taunt);
          }
        }
        for (const [id, c] of A.carried) {
          const e = registry.byId(id);
          if (!e || !(e.hp > 0) || c.slammed) continue;
          if (e.reviewPush && e.reviewPush.done) { c.slammed = true; A.blocked = true; continue; }
          e.x = a.x + A.dir.x * c.along - A.dir.z * c.lat;
          e.z = a.z + A.dir.z * c.along + A.dir.x * c.lat;
          e.reviewPush = { dx: A.dir.x, dz: A.dir.z, until: tick + 3, done: false, inBriar: true };
        }
      } else if (A.t >= D.t0 && A.t <= D.t1 + 0.02) {
        a.x = A.x0 + A.dir.x * D.dist * e2;
        a.z = A.z0 + A.dir.z * D.dist * e2;
        a.iframeUntilTick = tick + 2;
        for (const e of hostiles()) {""")
R("""      if (A.t >= D.len) st.act = null;
    } else if (A.kind === 'burrow') {""","""      if (A.charge && A.t >= D.t1 + 0.1 && st.slab) {
        // the charge ends Slabguard with no shove
        st.slab = null;
        emit('review_sh_slab', { on: false, x: r2(a.x), z: r2(a.z) });
      }
      if (A.t >= D.len) st.act = null;
    } else if (A.kind === 'burrow') {""")
# Grudge bursts the quills (C9)
R("""        for (const e of hostiles()) if (d2(e, t) <= K.grudge.r ** 2) hit(e, dmg, { src: 'grudge' });
        st.grudge = null;""","""        for (const e of hostiles()) if (d2(e, t) <= K.grudge.r ** 2) hit(e, dmg, { src: 'grudge' });
        st.grudge = null;
        // C9: every quilled foe in its reach bursts; each foe takes the bursts of one slam once
        const got = new Set(), C6 = K.c6, now = getTick();
        for (const e of hostiles()) {
          if (d2(e, t) > K.grudge.r ** 2 || !((st.quilled.get(e.id) ?? -1) > now)) continue;
          const list = hostiles().filter((f) => f !== e && !got.has(f.id) && d2(f, e) <= C6.burstR ** 2).sort((p, q) => d2(p, e) - d2(q, e)).slice(0, C6.burstN);
          if (!list.length) continue;
          for (const f of list) got.add(f.id);
          emit('review_sh_quills', { ids: list.map((f) => f.id), x: r2(e.x), z: r2(e.z), r: C6.burstR, spread: true, burst: true });
          later(0.22, () => {
            for (const f of list) {
              st.quilled.set(f.id, getTick() + sec(K.quills.secs));
              if (!st.quillCast.has(f.id)) st.quillCast.set(f.id, { hit: new Set([f.id]) });
              hit(f, C6.burstDmg, { src: 'quills', kb: 0 });
            }
          });
        }""")
# Badger Toss into the briar (C8)
R("""          if (T.wall && e.hp > 0) {
            emit('review_sh_wallslam'""","""          if (!T.wall && st.briar && e.hp > 0 && d2(e, st.briar) <= K.briar.r ** 2) impale(e);
          if (T.wall && e.hp > 0) {
            emit('review_sh_wallslam'""")
# Growlstone: no roar while it flies; the flight
R("""      } else if (tick >= g.next) {
        const r = K.growlstone.r""","""      } else if (g.fly) {
        // C1: thrown, it lands beside the foe: 16 and a taunt within 1.5 u, and it roars at once
        const F = g.fly, C6 = K.c6;
        F.t += 1 / TICK;
        const u = Math.min(1, F.t / C6.stoneFly);
        g.x = F.x0 + (F.x1 - F.x0) * u;
        g.z = F.z0 + (F.z1 - F.z0) * u;
        emit('review_sh_stonefly', { id: g.id, x: r2(g.x), z: r2(g.z), y: r2(1.4 + 4 * 1.2 * u * (1 - u) - 1.4 * u * u), done: u >= 1 });
        if (u >= 1) {
          g.fly = null;
          emit('review_sh_ring', { x: r2(g.x), z: r2(g.z), r: C6.stoneLand, kind: 'burst' });
          for (const e of hostiles()) if (d2(e, g) <= (C6.stoneLand + (e.radius ?? 0.4) * 0.5) ** 2) {
            hit(e, C6.stoneDmg, { src: 'stonethrow', dirFrom: g, kb: 0.3 });
            taunt(e, C6.stoneTaunt, { from: g });
          }
          g.next = tick + sec(0.15);
        }
      } else if (tick >= g.next) {
        const r = K.growlstone.r""")
open(p,'w').write(s)
print('sim ok')
