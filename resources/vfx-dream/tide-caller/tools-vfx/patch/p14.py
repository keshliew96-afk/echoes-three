import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:100]); sys.exit(1)
    s=s.replace(a,b)
R("hk = 1 - 0.4 * Math.min(1, Math.max(0, (Math.abs(u) - 0.8) / 0.2)) ** 2,","hk = 1,")
R("y = py * 0.6 / 1.35, z = (pz - 1.15) / 2.7; outl.push(new THREE.Vector2(z, y)); pos.push(sd * 0.5, y, z); cc.copy(c0).lerp(c1, Math.min(1, y * 2.2)).lerp(c3, Math.sin(v * 60 + y * 9) > 0.85 ? 0.45 : 0); col.push(cc.r, cc.g, cc.b, 1); UVw.push(sd < 0 ? 0.12 : 0.88, v); }",
  "y = py / 1.35, z = (pz - 1.15) / 2.7; outl.push(new THREE.Vector2(z, y)); pos.push(sd * 0.5, y, z); cc.copy(c0).lerp(c1, Math.min(1, y * 1.6)).lerp(c2, Math.max(0, y - 0.7) * 1.5).lerp(c3, Math.max(0, y - 0.9) * 5); col.push(cc.r, cc.g, cc.b, 1); UVw.push(0.3 + 0.4 * y, v); }")
open(p,'w').write(s); print('p14 ok')
