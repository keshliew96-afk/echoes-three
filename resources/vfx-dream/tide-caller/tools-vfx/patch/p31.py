p='tools/tc.js'; s=open(p).read()
R=[('c=mix(c,vec3(0.06,0.22,0.66),smoothstep(0.686,1.0,v));', 'c=mix(c,vec3(0.16,0.42,0.9),smoothstep(0.686,1.0,v));'), ('float a=op*mix(0.82,1.0,rim)*(1.0-smoothstep(0.92,1.0,v));', 'float a=op*mix(0.97,1.0,rim)*(1.0-smoothstep(0.92,1.0,v));')]
for a,b in R:
    assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
