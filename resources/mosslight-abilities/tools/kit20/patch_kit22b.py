# Kit 2.2b (18 Nov 04:20 UTC): Kesh's Tripo models for the Snapjaw and the Lure Lily replace the stand-ins.
# Files from /mnt/project-files/tripo-summons/{snapjaw,lurelily}/ copied to public/review/. REVIEW-ONLY.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)

patch('src/render/critters/reviewPlants.js', [
    ("for (const n of ['elderoak', 'oakling', 'sapling', 'spitter', 'puffcap', 'seed'])",
     "for (const n of ['elderoak', 'oakling', 'sapling', 'spitter', 'puffcap', 'seed', 'snapjaw', 'lurelily'])"),
    ("// Oakling: 0.6 u tall, with its five bones.",
     """// Snapjaw (S71, Kesh's model 18 Nov): about 0.9 u, mouth toward +z, jaw modelled half open.
export function makeSnapjaw() {
  const m = got.snapjaw;
  if (!m) return null;
  const mesh = m.clone();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.setScalar(0.9);
  return mesh;
}

// Lure Lily (S72, Kesh's model 18 Nov): about 0.8 u, open flower.
export function makeLily() {
  const m = got.lurelily;
  if (!m) return null;
  const mesh = m.clone();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.setScalar(0.8);
  return mesh;
}

// Oakling: 0.6 u tall, with its five bones."""),
])
F = 'src/render/critters/reviewPathsFx.js'
patch(F, [
    ("import { makeOak, makeOakling, makePuffcap, makeSapling, makeSeed, makeSpitter } from './reviewPlants.js';",
     "import { makeLily, makeOak, makeOakling, makePuffcap, makeSapling, makeSeed, makeSnapjaw, makeSpitter } from './reviewPlants.js';"),
    # Snapjaw: the model in a turn group (faces its bite) and a lunge group (tilts and squashes on the bite)
    ("""    g.add(base, stem, ribbon, head);
    const ring = flat(new RingGeometry(ev.reach - 0.04, ev.reach, 48), DMG_DEEP, 0);
    ring.position.y = 0.03;
    g.add(ring);
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    const big = 1 + 0.15 * (ev.ate || 0);
    snapObjs.set(ev.id, { g, head, top, bot, ring, t: 0, grow: ev.grow || 0.4, big, bite: null, end: null, aim: 0 });""",
     """    g.add(base, stem, ribbon, head);
    const big = 1 + 0.15 * (ev.ate || 0);
    const ring = flat(new RingGeometry((ev.reach - 0.04) / big, ev.reach / big, 48), DMG_DEEP, 0); // the group is scaled by big
    ring.position.y = 0.03;
    g.add(ring);
    const sm = makeSnapjaw(); // Kesh's model (18 Nov); the stand-in if it has not loaded
    let turn = null, lunge = null;
    if (sm) {
      for (const m of [base, stem, ribbon, head]) m.visible = false;
      turn = new Group();
      lunge = new Group();
      lunge.add(sm);
      turn.add(lunge);
      g.add(turn);
    }
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    snapObjs.set(ev.id, { g, head, top, bot, ring, turn, lunge, t: 0, grow: ev.grow || 0.4, big, bite: null, end: null, aim: 0 });"""),
    ("""      o.top.rotation.x = -open;
      o.bot.rotation.x = open * 0.5;
      o.ring.material.opacity = 0.16 * Math.min(1, o.t * 3);""",
     """      o.top.rotation.x = -open;
      o.bot.rotation.x = open * 0.5;
      if (o.turn) { // the model: it turns to its foe, lunges from the base and squashes shut (its jaw has no hinge)
        o.turn.rotation.y = o.aim;
        o.lunge.rotation.x = 0.45 * lean;
        const shut = Math.max(0, Math.min(1, (0.6 - open) / 0.5));
        const wide = Math.max(0, (open - 0.6) / 0.3);
        o.lunge.scale.set(1 + 0.1 * shut - 0.04 * wide, 1 - 0.14 * shut + 0.08 * wide, 1 + 0.1 * shut - 0.04 * wide);
      }
      o.ring.material.opacity = 0.16 * Math.min(1, o.t * 3);"""),
    # Lure Lily: the model in a bloom group (narrow bud -> open -> snaps shut)
    ("""    g.add(lureRing, burstRing);
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    lilyObjs.set(ev.id, { g, head, petals, bud, lureRing, burstRing,""",
     """    g.add(lureRing, burstRing);
    const lm = makeLily(); // Kesh's model (18 Nov); the stand-in if it has not loaded
    let bloom = null;
    if (lm) {
      for (const m of [base, stem, ribbon, head]) m.visible = false;
      bloom = new Group();
      bloom.add(lm);
      bloom.rotation.y = Math.atan2(ev.fromX - ev.x, ev.fromZ - ev.z); // it opens toward her
      g.add(bloom);
    }
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    lilyObjs.set(ev.id, { g, head, petals, bud, bloom, lureRing, burstRing,"""),
    ("""      for (const a of o.petals) a.rotation.x = -(1.35 - 1.05 * open) + sway;""",
     """      for (const a of o.petals) a.rotation.x = -(1.35 - 1.05 * open) + sway;
      if (o.bloom) { // the model: a narrow bud opens wide; at the end it snaps shut
        const sq = o.snap != null ? Math.min(1, o.snap / 0.08) : 0;
        const xz = (0.5 + 0.5 * open) * (1 - 0.35 * sq);
        o.bloom.scale.set(xz, (0.9 + 0.1 * open) * (1 - 0.2 * sq), xz);
        o.bloom.rotation.z = sway;
      }"""),
])
print('patched')
