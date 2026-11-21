p='tools/tc.js'; s=open(p).read()
R=[
("const a0 = V3(o.from), a1 = V3(o.to), d = a1.clone().sub(a0), dn = d.clone().normalize(), side = new THREE.Vector3(-d.z, 0, d.x).normalize(), top = o.top || 2.2, Lf = o.floor || 1.5, st = o.stand || 0;",
 "const a0 = V3(o.from), a1 = V3(o.to), d = a1.clone().sub(a0), dn = d.clone().normalize(), side = new THREE.Vector3(-d.z, 0, d.x).normalize(), top = o.top || 2.2, st = o.stand || 0; let Lf = o.floor || 1.5;"),
# it grows out of flat water: a puddle, a low ripple, a rising lip, the full wave (the reference, 20 Nov)
("const hd = a < 0 ? 0 : EASE.out(clamp(a / du)), tail = a > du ? -1 + 2 * EASE.s(clamp((a - du) / out)) : -1, hh = (o.hh || 0.6) * EASE.out(clamp((a + st) / 0.15)), W = o.w || 1.3;",
 "const gs = st > 0 ? clamp((a + st) / st) : 1, hd = a < 0 ? 0 : EASE.out(clamp(a / du)), tail = a > du ? -1 + 2 * EASE.s(clamp((a - du) / out)) : -1, hh = (o.hh || 0.6) * Math.max(0.04, Math.pow(sm(gs), 1.6)), W = (o.w || 1.3) * (0.55 + 0.45 * sm(gs)); Lf = (o.floor || 1.5) * (0.35 + 0.65 * sm(gs));"),
]
for a,b in R:
    assert a in s, a[:50]; s=s.replace(a,b)
open(p,'w').write(s)
