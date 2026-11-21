p='tools/tc.js'; s=open(p).read()
R=[('vec3 c=mix(vec3(0.42,0.7,1.0),vec3(0.18,0.47,0.95),smoothstep(0.475,0.686,v));', 'vec3 c=mix(vec3(0.52,0.78,1.0),vec3(0.3,0.6,1.0),smoothstep(0.2,0.42,v)); c=mix(c,vec3(0.18,0.47,0.95),smoothstep(0.5,0.7,v));'), ('c=mix(c,vec3(0.78,0.9,1.0),sw*0.4);', 'c=mix(c,vec3(0.8,0.92,1.0),sw*0.3);')]
for a,b in R:
    assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
