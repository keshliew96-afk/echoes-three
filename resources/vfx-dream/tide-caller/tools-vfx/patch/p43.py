p='tools/tc.js'; s=open(p).read()
a="void main(){ if(abs(vNo.y)>0.5) discard; float y=vP.y; if(y<u0-0.002||y>u1) discard; float x=vP.x*3.0+vP.z;"
b="void main(){ if(abs(vNo.y)>0.5) discard; float y=vP.y; if(y<u0-0.002||y>u1) discard; float ef=step(0.5,abs(vNo.x)); float x=mix(vP.x*3.0+vP.z, vP.z*2.0+vP.x*7.0, ef);"
assert a in s; s=s.replace(a,b)
a="float side=1.0-smoothstep(0.42,0.5,abs(vP.x)+0.07*(n-0.5));"
b="float side=mix(1.0-smoothstep(0.42,0.5,abs(vP.x)+0.07*(n-0.5)), 1.0-smoothstep(0.36,0.5,abs(vP.z)+0.08*(n-0.5)), ef);"
assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
