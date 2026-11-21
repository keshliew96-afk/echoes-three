# Overnight effects pass: the shared spark, ring and pour curves get a birth, a life and an end (review build only).
import sys
p = sys.argv[1] + '/src/render/critters/reviewPathsFx.js'
s = open(p).read()
if 'EFX3' in s: print('already'); sys.exit()
def rep(a, b):
    global s
    assert s.count(a) == 1, a
    s = s.replace(a, b)
# bursts: a little spread in speed, height and size, so a burst reads as a spray, not a perfect star
rep("""      const a = (i / n) * Math.PI * 2;
      parts.push({ s, kind: 'fly', from: new Vector3(x, y, z), vel: new Vector3(Math.cos(a) * 0.9, 0.9, Math.sin(a) * 0.9), t: 0, life: 0.4 });""",
"""      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.7, v = 0.75 + Math.random() * 0.5; // EFX3
      parts.push({ s, kind: 'fly', from: new Vector3(x, y, z), vel: new Vector3(Math.cos(a) * 0.9 * v, 0.7 + Math.random() * 0.5, Math.sin(a) * 0.9 * v), t: 0, life: 0.36 + Math.random() * 0.12, size });""")
# fly: drag (fast out, then floats), a pop at birth and a shrink at the end
rep("""        q.s.position.copy(q.from).addScaledVector(q.vel, q.t);
        q.s.position.y -= 1.2 * q.t * q.t;
        q.s.material.opacity = 0.85 * (1 - u);""",
"""        const k = 4.5, d = (1 - Math.exp(-k * q.t)) / k; // EFX3: drag
        q.s.position.copy(q.from).addScaledVector(q.vel, d * 1.6);
        q.s.position.y -= 0.9 * q.t * q.t;
        const sz = q.size ?? q.s.scale.x; if (q.size == null) q.size = sz;
        q.s.scale.setScalar(sz * (u < 0.12 ? 0.6 + 6 * u : 1.32 - 0.62 * Math.min(1, (u - 0.12) / 0.88)));
        q.s.material.opacity = 0.9 * Math.min(1, u * 10) * (1 - u * u);""")
# rings: ease-out growth, a bright first frame, eased fade
rep("""        q.s.scale.setScalar(1 + q.grow * u);
        q.s.material.opacity = 0.8 * (1 - u);""",
"""        const g = 1 - Math.pow(1 - Math.min(1, u), 3); // EFX3: ease-out
        q.s.scale.setScalar(0.85 + (q.grow + 0.15) * g);
        q.s.material.opacity = (u < 0.08 ? 0.95 : 0.8) * Math.pow(1 - Math.min(1, u), 1.6);""")
# pours: ease in-out travel, swell on arrival
rep("""          q.s.position.lerpVectors(q.from || gem, to, Math.min(1, u));
          q.s.position.y += (q.arc ?? 0.18) * Math.sin(Math.PI * Math.min(1, u));
        }
        q.s.material.opacity = q.t < 0 ? 0 : 0.85 * (1 - u * 0.4);""",
"""          const w = Math.min(1, u), m = w * w * (3 - 2 * w); // EFX3: ease in-out
          q.s.position.lerpVectors(q.from || gem, to, m);
          q.s.position.y += (q.arc ?? 0.18) * Math.sin(Math.PI * w);
          if (q.size == null) q.size = q.s.scale.x;
          q.s.scale.setScalar(q.size * (w > 0.8 ? 1 + 2.2 * (w - 0.8) : 1));
        }
        q.s.material.opacity = q.t < 0 ? 0 : 0.85 * (1 - u * 0.4);""")
open(p, 'w').write(s)
print('patched')
# Leaf Gale wall: it springs up out of the floor with an overshoot, breathes in the wind, and blows apart at the end
s = open(p).read()
def rep2(a, b):
    global s
    assert s.count(a) == 1, a
    s = s.replace(a, b)
rep2("""      o.sheets.forEach((m, i) => { m.material.opacity = (0.16 - i * 0.03) * k; m.scale.y = 0.4 + 0.6 * Math.min(1, o.t * 4); });""",
"""      const bw = Math.min(1, o.t * 3.2), back = 1 + 2.4 * Math.pow(bw - 1, 3) + 1.4 * Math.pow(bw - 1, 2); // EFX3 overshoot
      o.sheets.forEach((m, i) => { m.material.opacity = (0.12 - i * 0.025) * k * (0.85 + 0.15 * Math.sin(o.t * 7 + i * 2)); m.scale.y = Math.max(0.05, back * out + 0.05) * (1 + 0.04 * Math.sin(o.t * 5 + i)); m.position.z = (i - 1) * 0.16 + 0.05 * Math.sin(o.t * 4 + i * 1.7); });""")
rep2("""        m.position.set(d.x + Math.sin(o.t * 3 + d.ph) * 0.12, 0.1 + 1.5 * u, Math.sin(o.t * 5 + d.ph) * 0.2);""",
"""        const blow = o.fade != null ? o.fade * 3.5 : 0; // EFX3: the end blows the leaves out
        m.position.set(d.x * (1 + blow * 0.3) + Math.sin(o.t * 3 + d.ph) * 0.12, 0.1 + 1.5 * u + blow * 0.4, Math.sin(o.t * 5 + d.ph) * 0.2 + (d.ph % 2 > 1 ? 1 : -1) * blow);""")
open(p, 'w').write(s)
print('wall patched')
