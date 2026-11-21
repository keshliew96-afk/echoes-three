p='tools/tc.js'; s=open(p).read()
R=[('float core=(1.0-smoothstep(0.3,0.55,x+0.25*(n-0.5)))*(1.0-hd*0.85)', 'float core=(1.0-smoothstep(0.18,0.42,x+0.3*(n-0.5)))*(1.0-hd*0.85)'), ('vec3 c=mix(col2,blue,core); float a=s*edge*op; if(a<0.02) discard;', 'float fo=smoothstep(0.35,0.55,fine+0.3*(1.0-x)); vec3 c=mix(mix(vec3(0.7,0.86,1.0),col2,fo),blue,core); float a=s*edge*op*mix(0.85,1.0,fo); if(a<0.02) discard;')]
for a,b in R:
    assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
