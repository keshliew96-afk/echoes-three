p='tools/tc.js'; s=open(p).read()
R=[('float core=1.0-smoothstep(0.3,0.6,f+0.35*(nz-0.5)); float cr=', 'float core=1.0-smoothstep(0.14,0.42,f+0.4*(nz-0.5)); float cr=')]
for a,b in R:
    assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
