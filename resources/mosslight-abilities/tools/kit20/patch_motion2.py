# Kesh 18 Nov 08:47 UTC, the motion pass, part 2: every standing plant is born with a springy overshoot, breathes and
# sways while it lives, squashes when it acts or is watered, and wilts over as it ends; her staff and paws kick dust
# off the floor on the frame they land. REVIEW-ONLY: never committed.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)

FX = r"""
  // ---- REVIEW-ONLY: the motion pass, part 2 (Kesh 18 Nov 08:47): the plants are alive ----
  // Each plant's solid parts go under one pivot at its foot. The plant's own code still grows and fades it; the pivot adds
  // the spring at birth, the breath and sway, a squash when it acts, and the wilt at the end.
  const JUICE = {
    seed: { pop: 0.5, breathe: 0.03, sway: 0.06, wilt: 0.3, lean: 0.4 },
    sapling: { pop: 0.3, breathe: 0.02, sway: 0.035, wilt: 0.5, lean: 0.5 },
    spit: { pop: 0.35, breathe: 0.03, sway: 0.05, wilt: 0.5, lean: 0.6 },
    oak: { pop: 0.14, breathe: 0.01, sway: 0.012, wilt: 0.25, lean: 0.12 },
    ling: { pop: 0.3, breathe: 0.03, sway: 0, wilt: 0.5, lean: 0.5 },
    puff: { pop: 0.4, breathe: 0.04, sway: 0.04, wilt: 0, lean: 0 },
    snap: { pop: 0.3, breathe: 0.03, sway: 0.035, wilt: 0.5, lean: 0.5 },
    lily: { pop: 0.35, breathe: 0.025, sway: 0.05, wilt: 0.5, lean: 0.6 },
    hedge: { pop: 0.2, breathe: 0.015, sway: 0, wilt: 0.4, lean: 0 },
    cloud: { pop: 0.25, breathe: 0.03, sway: 0, wilt: 0, lean: 0, float: 0.05 },
  };
  const JFLAT = new Set(['RingGeometry', 'CircleGeometry', 'PlaneGeometry', 'ShapeGeometry']);
  const juiced = [];
  function juice(o, kind) {
    const P = new Group();
    for (const c of [...o.g.children]) { if (c.isSprite || (c.isMesh && c.geometry && JFLAT.has(c.geometry.type))) continue; P.add(c); } // floor rings stay flat
    o.g.add(P);
    const r = { o, P, t: 0, ph: (Math.abs(o.g.position.x * 12.9898 + o.g.position.z * 78.233) % 6.283), kick: 0, kv: 0, k: JUICE[kind] };
    juiced.push(r);
    return r;
  }
  const jkick = (o, amt) => { if (o && o.juice) o.juice.kv += amt * 15; };
  const JK3 = { spit: 'spit', oak: 'oak', ling: 'ling', puff: 'puff' };
  function lifeUpdate(dt) {
    for (const o of kitObjs.values()) if (!o.juice && (o.kind === 'seed' || o.kind === 'sapling') && o.g) o.juice = juice(o, o.kind);
    for (const o of k3.values()) if (!o.juice && JK3[o.kind] && o.g) o.juice = juice(o, JK3[o.kind]);
    for (const o of snapObjs.values()) if (!o.juice) o.juice = juice(o, 'snap');
    for (const o of lilyObjs.values()) if (!o.juice) o.juice = juice(o, 'lily');
    for (const o of hedges.values()) if (!o.juice) o.juice = juice(o, 'hedge');
    for (const o of k8clouds.values()) if (!o.juice) o.juice = juice(o, 'cloud');
    for (let i = juiced.length - 1; i >= 0; i--) {
      const r = juiced[i], o = r.o, K = r.k;
      if (!o.g.parent) { juiced.splice(i, 1); continue; }
      const h = Math.min(dt, 0.05);
      r.t += h;
      r.kv += (-220 * r.kick - 14 * r.kv) * h; // a damped spring: a squash that bounces back
      r.kick += r.kv * h;
      const t = r.t;
      const born = K.pop * Math.exp(-5 * t) * Math.sin(15 * t); // the overshoot as it comes up
      const br = K.breathe * Math.sin(2.1 * t + r.ph);
      const end = o.fade ?? o.end;
      const w = end != null && end > 0 ? Math.min(1, end / 0.35) : 0;
      const sy = (1 + born + br - r.kick) * (1 - K.wilt * w * w);
      const sxz = 1 - 0.5 * born - 0.5 * br + 0.6 * r.kick;
      r.P.scale.set(sxz, Math.max(0.05, sy), sxz);
      r.P.rotation.z = K.sway * Math.sin(1.3 * t + r.ph) + K.lean * w * w + 0.5 * born * (K.sway ? 1 : 0) * 0.3;
      r.P.rotation.x = K.sway * 0.7 * Math.sin(1.7 * t + 2 * r.ph);
      if (K.float) r.P.position.y = K.float * Math.sin(1.6 * t + r.ph);
    }
  }
  bus.on('review_sapling_mote', (ev) => jkick(kitObjs.get(ev.id), 0.1));
  bus.on('review_sapling_grow', (ev) => jkick(kitObjs.get(ev.id), -0.3));
  bus.on('review_sapling_shed', (ev) => jkick(kitObjs.get(ev.id), 0.25));
  bus.on('review_seed_flower', (ev) => jkick(kitObjs.get(ev.id), -0.25));
  bus.on('review_spit_shot', (ev) => jkick(k3.get(ev.id), 0.12));
  bus.on('review_oak_tick', (ev) => jkick(k3.get('oak' + ev.id), 0.04));
  bus.on('review_oak_root', (ev) => jkick(k3.get('oak' + ev.id), 0.08));
  bus.on('review_ling_slam', (ev) => jkick(k3.get('ling' + ev.id), 0.3));
  bus.on('review_snap_bite', (ev) => jkick(snapObjs.get(ev.id), 0.22));
  bus.on('review_lily_open', (ev) => jkick(lilyObjs.get(ev.id), -0.3));
  bus.on('review_lily_scent', (ev) => jkick(lilyObjs.get(ev.id), 0.12));
  bus.on('review_hedge_hit', (ev) => jkick(hedges.get(ev.id), 0.15));
  for (const n of ['review_water', 'review_water2']) bus.on(n, (ev) => { // a drink: everything near it stretches up
    if (ev.x == null) return;
    for (const r of juiced) if (Math.hypot(r.o.g.position.x - ev.x, r.o.g.position.z - ev.z) <= (ev.r || 1.6)) r.kv -= 0.2 * 15;
  });
  // Her staff and paws meet the floor on the frame her move lands: dust, and a ring that says where.
  const LAND = { // skill -> [seconds after the cast, what touches down, ring size, colour, motes]
    guardian_bond: [[0.1, 'butt', 0.5, WOOD, 8]],
    wild_thicket: [[0.1, 'butt', 0.55, WOOD, 8]],
    pale_lance: [[0.1, 'butt', 0.3, WOOD, 5]],
    restorative_wave: [[0.1, 'butt', 0.22, LEAF_LIGHT, 3], [0.28, 'butt', 0.3, LEAF_LIGHT, 4]],
    rootsnare: [[0.1, 'paw', 0.4, WOOD, 6]],
    sanctuary: [[0.1, 'paw', 0.25, LEAF_LIGHT, 4]],
    lure_lily: [[0.1, 'paw', 0.2, FLOWER, 3]],
    creeping_moss: [[0.1, 'paw', 0.2, LEAF, 3]],
    swift_mend: [[0.47, 'feet', 0.4, '#C9C2AE', 6]],
    dawn_brand: [[0.36, 'feet', 0.3, '#C9C2AE', 4]],
    nectar_burst: [[0.1, 'gem', 0, POLLEN, 5]],
    rain_cloud: [[0.1, 'gem', 0, WATER, 5]],
    dewfall: [[0.1, 'gem', 0, WATER, 4]],
  };
  const landV = new Vector3();
  bus.on('skill_cast', (ev) => {
    const L = !ev.classId && LAND[ev.skill];
    if (!L) return;
    for (const [at, what, r, color, n] of L) {
      let done = false;
      anim(at + 0.02, (u) => {
        if (u < 1 || done) return;
        done = true;
        const p = world.player, st = typeof window !== 'undefined' ? window.__tripo : null;
        if (!p) return;
        landV.set(p.x, 0, p.z);
        if (st && st.model) {
          if (what === 'butt' && st.staff) landV.set(0, 0.02, 0).applyMatrix4(st.staff.matrixWorld);
          else if (what === 'gem' && st.staff) landV.set(0, 0.8, 0).applyMatrix4(st.staff.matrixWorld);
          else if (what === 'paw') { const h = st.model.getObjectByName('handL'); if (h) h.getWorldPosition(landV); }
        }
        if (what === 'gem') { burst(landV.x, landV.y, landV.z, color, n, 0.1); return; }
        ringPart(landV.x, landV.z, r * 0.5, color, 0.35, 1.2, 0.7);
        burst(landV.x, 0.08, landV.z, color, n, 0.09);
      });
    }
  });
"""
F = 'src/render/critters/reviewPathsFx.js'
patch(F, [
    ("  // ---- REVIEW-ONLY: the motion pass (Kesh 18 Nov 08:47): her body answers her own skills ----\n",
     FX + "  // ---- REVIEW-ONLY: the motion pass (Kesh 18 Nov 08:47): her body answers her own skills ----\n"),
    ("    k20Update(dt); // kit 2.0\n", "    k20Update(dt); // kit 2.0\n    lifeUpdate(dt); // the motion pass: the plants are alive\n"),
])
print('patched')
