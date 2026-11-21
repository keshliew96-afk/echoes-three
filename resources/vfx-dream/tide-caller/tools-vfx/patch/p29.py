p='tools/tc.js'; s=open(p).read()
R=[('um.scale.set(r * (0.5 + 0.5 * op2), hh2, r * (0.5 + 0.5 * op2));', 'um.scale.set(r * 0.72 * (0.5 + 0.5 * op2), hh2, r * 0.72 * (0.5 + 0.5 * op2));'), ('float sw=smoothstep(0.55,0.72,fbm(vec2(vUv.x*14.0+v*5.0-tm*0.8,v*4.0)));', 'float sw=smoothstep(0.5,0.7,fbm(vec2(vUv.x*28.0+v*7.0-tm*0.8,v*3.0)));'), ('c=mix(c,vec3(0.8,0.92,1.0),sw*0.55);', 'c=mix(c,vec3(0.78,0.9,1.0),sw*0.4);')]
for a,b in R:
    assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
