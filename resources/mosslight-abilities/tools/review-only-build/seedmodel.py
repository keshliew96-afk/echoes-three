import sys
root = sys.argv[1] if len(sys.argv) > 1 else '/home/user/echoes-three'
# reviewPlants.js: load the seed and give one shared mesh and material per seed.
p = root + '/src/render/critters/reviewPlants.js'; t = open(p).read()
old = "for (const n of ['elderoak', 'oakling', 'sapling', 'spitter', 'puffcap'])"
assert old in t; t = t.replace(old, "for (const n of ['elderoak', 'oakling', 'sapling', 'spitter', 'puffcap', 'seed'])")
old = "// Oakling: 0.6 u tall, with its five bones."
assert old in t
t = t.replace(old, """// Seed (S43, Kesh's model 16 Nov): about 0.3 u; every seed shares the one geometry and material.
export function makeSeed() {
  const m = got.seed;
  if (!m) return null;
  const mesh = m.clone();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.setScalar(0.3);
  return mesh;
}

// Oakling: 0.6 u tall, with its five bones.""")
open(p, 'w').write(t)
# reviewPathsFx.js: the seed draws as his model when it has loaded.
p = root + '/src/render/critters/reviewPathsFx.js'; t = open(p).read()
old = "import { makeOak, makeOakling, makePuffcap, makeSapling, makeSpitter } from './reviewPlants.js';"
assert old in t; t = t.replace(old, "import { makeOak, makeOakling, makePuffcap, makeSapling, makeSeed, makeSpitter } from './reviewPlants.js';")
old = """    const seed = new Mesh(new IcosahedronGeometry(0.07, 0), new MeshStandardMaterial({ color: '#8FD08A', emissive: '#3E9A4E', emissiveIntensity: 0.6, roughness: 0.6 }));
    seed.position.y = 0.08;
    g.add(seed);"""
assert old in t
t = t.replace(old, """    const sm = makeSeed(); // Kesh's seed model (16 Nov), 0.3 u; the stand-in pod if it has not loaded
    let seed;
    if (sm) { seed = new Group(); seed.add(sm); seed.userData.model = true; seed.rotation.y = ((ev.id * 2.39) % 6.28); }
    else { seed = new Mesh(new IcosahedronGeometry(0.07, 0), new MeshStandardMaterial({ color: '#8FD08A', emissive: '#3E9A4E', emissiveIntensity: 0.6, roughness: 0.6 })); seed.position.y = 0.08; }
    g.add(seed);""")
old = """        o.glow.material.opacity = (0.45 + 0.25 * Math.sin(o.t * 6)) * out;
        o.seed.rotation.y += dt * 2;"""
assert old in t
t = t.replace(old, """        o.glow.material.opacity = (0.45 + 0.25 * Math.sin(o.t * 6)) * out;
        if (o.seed.userData.model) { // the model rocks a little while it waits and squashes as it lands
          o.seed.rotation.z = 0.1 * Math.sin(o.t * 2.3 + o.seed.rotation.y);
          if (!(o.thr && o.thr.t < 1) && !o.use) { o.land = (o.land ?? 0) + dt; const q = Math.max(0, 1 - o.land / 0.18); o.seed.scale.set(1 + 0.25 * q, 1 - 0.3 * q, 1 + 0.25 * q); }
          if (o.sprouting != null) { o.sprouting += dt; o.seed.scale.set(1 + 0.6 * o.sprouting / 0.35, 1 + 0.9 * o.sprouting / 0.35, 1 + 0.6 * o.sprouting / 0.35); }
        } else o.seed.rotation.y += dt * 2;""")
old = """    if (ev.target != null) burst(o.g.position.x, 0.3, o.g.position.z, PALETTE.brightHeal, 7, 0.13);
    o.fade = 0;"""
assert old in t
t = t.replace(old, """    if (ev.target != null) burst(o.g.position.x, 0.3, o.g.position.z, PALETTE.brightHeal, 7, 0.13);
    if (ev.sprout) o.sprouting = 0; // it opens up as it sprouts
    o.fade = 0;""")
open(p, 'w').write(t)
print('seedmodel ok')
