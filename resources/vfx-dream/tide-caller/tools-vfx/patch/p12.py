import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:90]); sys.exit(1)
    s=s.replace(a,b)
# bolt tail: a filled blue comet with a white heart
R("vec3 c=mix(col,col2,clamp(0.4*core+0.6*l,0.0,1.0)); float fl=","vec3 c=mix(col,col2,clamp(0.5*pow(core,3.0)+0.5*l,0.0,1.0)); float fl=")
R("float a=op*pow(h,1.2)*(0.9*core+0.3*l+0.6*fl)*(1.0-abs(vv)*0.3);","float a=op*pow(h,0.8)*(1.2*core+0.3*l+0.6*fl)*(1.0-abs(vv)*0.3);")
# splash: firmer sheets; pool deeper, foam ring wider
R("float a=op*(0.25+0.35*y+0.5*lip); gl_FragColor","float a=op*(0.45+0.35*y+0.5*lip); gl_FragColor")
R("float fr=u0*smoothstep(0.06,0.2,r)*(1.0-smoothstep(0.3,0.55,r+","float fr=u0*smoothstep(0.08,0.2,r)*(1.0-smoothstep(0.5,0.75,r+")
R("c=mix(vec3(0.03,0.12,0.42),col*0.8,0.25+0.6*r);","c=mix(vec3(0.03,0.12,0.42),col*0.85,0.15+0.6*r*r);")
# rain pool: lighter clear blue
R("yaw: o.yaw, op: 0.22, grow: true });","yaw: o.yaw, op: 0.3, col: '#5A9AF2', grow: true });")
# dome: bright blue rim, stronger veins
R("c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.35 : sh2*0.6+cs2*0.9));","c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.35 : sh2*0.6)); if(u1<0.5){ c=mix(c,vec3(0.3,0.6,1.0),pow(f,2.0)); c=mix(c,vec3(0.8,0.92,1.0),cs2); }")
R("(0.04+0.6*pow(f,3.0)+0.7*cs2+0.25*sh2+base)","(0.04+0.8*pow(f,2.6)+1.0*cs2+0.25*sh2+base)")
# soaked: drips outside the body, firmer stain
R("const an = k * 1.05 + 0.4, rr = 0.16 * dm.m.s / 0.82;","const an = k * 1.05 + 0.4, rr = 0.25 * dm.m.s / 0.82;")
R("pu.material.uniforms.op.value = 0.45 * wet;","pu.material.uniforms.op.value = 0.7 * wet;")
# wall: the top face is the water surface the camera sees: deep blue, caustics, foam swirls and a foam edge
R("float tf=u1>0.5? step(0.5,n.y)*smoothstep(0.3,0.6,fbm(vec2(vP.x*7.0,vP.z*7.0)+tm*0.6)) : 0.0;",
  "float ed=min(min(vUv.x,1.0-vUv.x)*4.0,min(vUv.y,1.0-vUv.y)*1.2); float tf=u1>0.5? step(0.5,n.y)*clamp(smoothstep(0.62,0.8,fbm(vec2(vP.x*5.0,vP.z*5.0)+tm*0.6))+smoothstep(0.35,0.0,ed)*smoothstep(0.3,0.6,fbm(vUv*20.0+tm)),0.0,1.0) : 0.0; float tcs=u1>0.5? step(0.5,n.y)*caus(vUv*vec2(2.0,8.0)+tm*0.1,tm) : 0.0;")
R("c=mix(c,vec3(0.6,0.85,1.0),wb*0.8);","c=mix(c,vec3(0.6,0.85,1.0),wb*0.8); if(u1>0.5 && n.y>0.5){ c=mix(vec3(0.06,0.25,0.75),vec3(0.25,0.55,1.0),vUv.y); c=mix(c,vec3(0.7,0.88,1.0),tcs*0.6); }")
R("step(0.5,n.y)*(0.15+0.75*tf) : 0.0),0.0,1.0));","step(0.5,n.y)*tf : 0.0),0.0,1.0));")
R("+ step(0.5,n.y)*(0.55+0.4*tf) :","+ step(0.5,n.y)*(0.75+0.2*tf+0.2*tcs) :")
# geyser cap: foam only where the noise peaks
R("float m=smoothstep(0.3,0.55,n);","float m=smoothstep(0.48,0.68,n);")
# tsunami: brighter streaks
R("c=mix(c,vec3(0.78,0.9,1.0),st*0.75); c=mix(c,vec3(0.95,0.98,1.0),froth);","c=mix(c,vec3(0.82,0.93,1.0),st*0.9); c=mix(c,vec3(0.95,0.98,1.0),froth);")
open(p,'w').write(s); print('p12 ok')
