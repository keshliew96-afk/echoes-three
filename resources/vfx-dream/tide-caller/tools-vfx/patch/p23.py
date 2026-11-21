p='tools/tc.js'; s=open(p).read()
R=[('m.material.uniforms.op.value = (um ? 0.75 : 0.9) * Math.min(1, down * 1.5);', 'm.material.uniforms.op.value = (um ? 1.0 : 0.9) * Math.min(1, down * 1.5);'), ('smoothstep(0.42,0.58,fbm(p*15.0+vec2(tm*0.6,0.0)));', 'smoothstep(0.44,0.58,fbm(p*24.0+vec2(tm*0.6,0.0)));'), ('if(ln<0.5){ a*=1.0-smoothstep(top-0.3,top,y);', 'if(ln<0.5){ a*=1.0-smoothstep(top-0.2,top,y);')]
for a,b in R:
    assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
