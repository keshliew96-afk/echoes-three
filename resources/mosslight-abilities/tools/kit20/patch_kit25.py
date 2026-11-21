# Kesh 18 Nov 08:12 UTC: Scatter Seeds' seeds take watering at double strength; the Snapjaw marks the foe it
# will bite and drags the bitten foe to its jaws. REVIEW-ONLY: never committed.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)

W = 'src/sim/world.js'
patch(W, [
    # Scatter Seeds: its seeds carry a flag; the Spitter they become keeps it; watering counts twice for them
    ("      dropSeed(a.x + Math.cos(ang) * K3.scatter.gap, a.z + Math.sin(ang) * K3.scatter.gap, player);\n    }\n  }",
     "      dropSeed(a.x + Math.cos(ang) * K3.scatter.gap, a.z + Math.sin(ang) * K3.scatter.gap, player);\n      seeds[seeds.length - 1].scatter = true; // Kesh 18 Nov 08:12: watered at double strength\n    }\n  }"),
    ("    const sp = { id: ++kitIds, x: sd.x, z: sd.z, until:",
     "    const sp = { id: ++kitIds, scatter: !!sd.scatter, x: sd.x, z: sd.z, until:"),
    ("      if (!test(q) || !wet(q, q.x, q.z)) continue;\n      q.until += K4.water.more * wm;\n      q.fastUntil = currentTick + K4.water.fast * wm;\n      if (wm > 1) events.emit(currentTick, 'review_water2', { x: r2(q.x), z: r2(q.z) });",
     "      if (!test(q) || !wet(q, q.x, q.z)) continue;\n      const qm = wm * (q.scatter ? 2 : 1); // Kesh 18 Nov 08:12: a Scatter Seeds seed takes it twice over\n      q.until += K4.water.more * qm;\n      q.fastUntil = currentTick + K4.water.fast * qm;\n      if (qm > 1) events.emit(currentTick, 'review_water2', { x: r2(q.x), z: r2(q.z) });"),
    # Snapjaw: drag numbers
    ("sleepMul: 1.5 },", "sleepMul: 1.5, drag: 0.75, dragTicks: 14 }, // Kesh 18 Nov 08:12: it drags the bitten foe to 0.75 u from its stem in 0.23 s (my numbers)"),
    # held: lerp toward the jaws first
    ("        else { e.x = s.held.x; e.z = s.held.z; e.kbVx = 0; e.kbVz = 0; } // held in its jaws",
     "        else {\n          if (s.held.pull > 0) { const k = 1 / s.held.pull; s.held.x += (s.held.tx - s.held.x) * k; s.held.z += (s.held.tz - s.held.z) * k; s.held.pull -= 1; } // dragged to its jaws\n          e.x = s.held.x; e.z = s.held.z; e.kbVx = 0; e.kbVz = 0;\n        } // held in its jaws"),
    # the aim mark: the foe it will bite next
    ("      if (currentTick < s.grown || currentTick < s.next) continue;\n      const foes = foesIn(s.x, s.z, s.reach);\n      if (!foes.length) continue;",
     "      if (currentTick >= s.grown) { // Kesh 18 Nov 08:12: a bite mark on the foe it will bite\n        let want = s.held && s.held.e.hp > 0 ? s.held.e : null;\n        if (!want) { const fs = foesIn(s.x, s.z, s.reach); const sl = fs.filter((e) => e.reviewSleepUntil > currentTick); want = (sl.length ? sl : fs).sort((p, q) => Math.hypot(p.x - s.x, p.z - s.z) - Math.hypot(q.x - s.x, q.z - s.z))[0] || null; }\n        const wid = want ? want.id : null;\n        if (wid !== s.aimId) { s.aimId = wid; events.emit(currentTick, 'review_snap_aim', { id: s.id, target: wid }); }\n      }\n      if (currentTick < s.grown || currentTick < s.next) continue;\n      const foes = foesIn(s.x, s.z, s.reach);\n      if (!foes.length) continue;"),
    ("      else { combat.status.apply(f, 'stun', 1, K21.snap.hold, currentTick, player.id); s.held = { e: f, x: f.x, z: f.z, until: currentTick + K21.snap.hold }; }",
     "      else {\n        combat.status.apply(f, 'stun', 1, K21.snap.hold, currentTick, player.id);\n        const dx = f.x - s.x, dz = f.z - s.z, d = Math.hypot(dx, dz) || 1, to = Math.min(d, K21.snap.drag);\n        s.held = { e: f, x: f.x, z: f.z, tx: s.x + (dx / d) * to, tz: s.z + (dz / d) * to, pull: d > K21.snap.drag ? K21.snap.dragTicks : 0, until: currentTick + K21.snap.hold };\n        if (s.held.pull) events.emit(currentTick, 'review_snap_drag', { id: s.id, target: f.id, x: r2(f.x), z: r2(f.z), tx: r2(s.held.tx), tz: r2(s.held.tz) });\n      }"),
    ("    for (const old of snaps.splice(0)) events.emit(currentTick, 'review_snap_end', { id: old.id });",
     "    for (const old of snaps.splice(0)) { if (old.held) old.held = null; events.emit(currentTick, 'review_snap_end', { id: old.id }); }"),
])

FX = r"""
  // ---- REVIEW-ONLY: Kesh 18 Nov 08:12: the Snapjaw's bite mark and drag ----
  const BITE_TOOTH = new ConeGeometry(0.06, 0.2, 3);
  const biteMarks = new Map();
  function biteMark() {
    const g = new Group();
    const teeth = new Group();
    for (let k = 0; k < 10; k++) { // two rows of teeth closing on the foe, like the jaws seen from above
      const top = k < 5;
      const a = (top ? 0.25 : Math.PI + 0.25) + ((k % 5) / 4) * (Math.PI - 0.5);
      const t = new Mesh(BITE_TOOTH, new MeshBasicMaterial({ color: DMG, transparent: true, opacity: 0.9, depthWrite: false }));
      t.position.set(0.5, 0.04, 0);
      t.rotation.z = Math.PI / 2; // the tip points in, toward the foe
      const pv = new Group();
      pv.rotation.y = -a;
      pv.add(t);
      teeth.add(pv);
    }
    const ring = flat(new RingGeometry(0.5, 0.56, 40), DMG, 0.6);
    ring.position.y = 0.03;
    const pin = new Mesh(new ConeGeometry(0.09, 0.2, 4), new MeshBasicMaterial({ color: DMG, transparent: true, opacity: 0.9, depthWrite: false })); // a marker over its head
    pin.rotation.x = Math.PI;
    pin.position.y = 1.55;
    g.add(ring, teeth, pin);
    root.add(g);
    return { g, teeth, ring, pin, t: 0, bite: null };
  }
  bus.on('review_snap_aim', (ev) => {
    const old = biteMarks.get(ev.id);
    if (old) { root.remove(old.g); biteMarks.delete(ev.id); }
    if (ev.target == null) return;
    const m = biteMark();
    m.target = ev.target;
    biteMarks.set(ev.id, m);
  });
  bus.on('review_snap_bite', (ev) => { const m = biteMarks.get(ev.id); if (m) m.bite = 0; });
  bus.on('review_snap_drag', (ev) => { // a green tug line from the jaws to the foe while it is dragged
    const o = snapObjs.get(ev.id);
    for (let k = 0; k < 6; k++) {
      const u = k / 5;
      const s = sprite('#8CC46E');
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, kind: 'fly', from: new Vector3(ev.x + (ev.tx - ev.x) * u, 0.35, ev.z + (ev.tz - ev.z) * u), vel: new Vector3((ev.tx - ev.x) * 2, 0.2, (ev.tz - ev.z) * 2), t: 0, life: 0.3 });
    }
    burst(ev.x, 0.3, ev.z, '#9A7444', 5, 0.08);
  });
  bus.on('review_snap_end', (ev) => { const m = biteMarks.get(ev.id); if (m) { root.remove(m.g); biteMarks.delete(ev.id); } });
  function biteUpdate(dt) {
    for (const [id, m] of biteMarks) {
      const e = byId(m.target);
      if (!e || !(e.hp > 0)) { root.remove(m.g); biteMarks.delete(id); continue; }
      m.t += dt;
      m.g.position.set(e.x, 0, e.z);
      let close = 0.15 + 0.1 * Math.sin(m.t * 6); // the teeth twitch while it waits
      if (m.bite != null) { m.bite += dt; close = m.bite < 0.15 ? 0.15 + (m.bite / 0.15) * 0.85 : Math.max(0.15, 1 - (m.bite - 0.15) * 1.5); if (m.bite > 0.8) m.bite = null; }
      m.teeth.scale.setScalar(1 - 0.45 * close);
      m.teeth.rotation.y = 0;
      m.ring.material.opacity = 0.5 + 0.4 * close;
      m.pin.position.y = 1.55 + 0.08 * Math.sin(m.t * 5);
    }
  }
"""
F = 'src/render/critters/reviewPathsFx.js'
patch(F, [
    ("  // ---- REVIEW-ONLY: kit 2.3b (Kesh 18 Nov): S10 Swiftleaf (three leaves) and S73 Petal Twister ----\n",
     FX + "  // ---- REVIEW-ONLY: kit 2.3b (Kesh 18 Nov): S10 Swiftleaf (three leaves) and S73 Petal Twister ----\n"),
    ("    slUpdate(dt); // kit 2.3b\n", "    slUpdate(dt); // kit 2.3b\n    biteUpdate(dt); // Snapjaw bite mark\n"),
])
print('patched')
