f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:90], s.count(old))
    s=s.replace(old,new)
# caustics: a cellular light web (worley F2-F1), soft and thin, instead of scribbles
rep("float caus(vec2 p, float t){ vec2 q=p; float c=0.0; for(int i=0;i<3;i++){ float fi=float(i); q+=vec2(sin(q.y*1.7+t*0.8+fi),cos(q.x*1.5-t*0.6+fi*1.3))*0.55; c+=abs(sin(q.x*2.1)+sin(q.y*2.3)); } c/=3.0; return pow(1.0-clamp(abs(c-0.9)*1.6,0.0,1.0),5.0); }",
    "float caus(vec2 p, float t){ p+=vec2(vn(p*0.7+t*0.2),vn(p*0.7-t*0.2+5.0))*0.6; vec2 g=floor(p), f=fract(p); float d1=8.0, d2=8.0; for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 o=vec2(float(x),float(y)); vec2 h=vec2(hh(g+o),hh(g+o+17.3)); h=0.5+0.4*sin(t*0.8+6.283*h); float d=length(o+h-f); if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d; } return 1.0-smoothstep(0.0,0.09,d2-d1); }")
# pool caustics softer
rep("c=mix(c,vec3(0.6,0.8,1.0),cs*0.55); c=mix(c,vec3(0.7,0.86,1.0),glow);", "c=mix(c,vec3(0.55,0.75,1.0),cs*0.35); c=mix(c,vec3(0.7,0.86,1.0),glow);")
rep("a=op*(0.62+0.2*r+0.3*cs)*(1.0-smoothstep(0.95,1.0,rn));", "a=op*(0.7+0.2*r+0.15*cs)*(1.0-smoothstep(0.95,1.0,rn));")
rep("float cs=caus(p*3.0, tm); float rip=sin(r*24.0-tm*3.0)*0.5+0.5;", "float cs=caus(p*3.2, tm); float rip=smoothstep(0.75,1.0,sin(r*26.0-tm*4.0))*(1.0-r*0.5);")
rep("c=mix(c,col*1.3,0.12*rip);", "c=mix(c,vec3(0.6,0.8,1.0),0.35*rip);")
# whirl: fine streaky foam along the spiral, no rings
rep("float foam=smoothstep(0.55,0.95,arm)*smoothstep(0.15,0.45,r)*(0.35+0.65*n); float lines=smoothstep(0.8,0.97,sin(sw*9.0+r*10.0))*0.5*r;",
    "float fs=fbm(vec2(sw*5.0, r*28.0)); float foam=smoothstep(0.45,0.95,arm)*smoothstep(0.12,0.4,r)*smoothstep(0.35,0.75,fs+0.25*n); float lines=smoothstep(0.62,0.85,fbm(vec2(sw*7.0,r*40.0)))*0.55*r*(1.0-foam);")
# wet floor: fewer web lines, crisp froth lines on the long edges
rep("c=mix(c,vec3(0.6,0.8,1.0),cs*0.6); c=mix(c,col2,foam);", "c=mix(c,vec3(0.55,0.78,1.0),cs*0.3); c=mix(c,col2,foam);")
rep("float a=op*s*body*mix(1.0,ends,0.6)*(0.8+0.3*cs+0.5*foam);", "float a=op*s*body*mix(1.0,ends,0.85)*(0.85+0.15*cs+0.5*foam);")
rep("float foam=smoothstep(0.58,0.8,xe)*body*smoothstep(0.35,0.65,fr);", "float foam=smoothstep(0.66,0.8,xe)*body*smoothstep(0.3,0.6,fr);")
# stream: optional twist; jets run straight
rep("if (core) { draw(core, W0 * 0.3, t, [0, W0 * 0.28]);", "const TW = o.twist === false ? 0 : 0.28; if (core) { draw(core, W0 * 0.3, t, [0, W0 * TW]);")
rep("if (core2) { draw(core2, W0 * 0.26, t, [3.14, W0 * 0.28]);", "if (core2) { draw(core2, W0 * 0.26, t, [3.14, W0 * TW]);")
rep("sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false }, o));", "sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false, twist: false }, o));")
rep("FX.rope = (A, o) => FX.stream(A, Object.assign({ w: 0.1,", "FX.rope = (A, o) => FX.stream(A, Object.assign({ w: 0.14,")
# bolt: a bigger glossy ball, lighter core
rep("const r = o.r || 0.11, wob = 1 + 0.12 * Math.sin(a * 40); ball.scale.set(r * wob, r / wob, r * wob); core.scale.setScalar(r * 0.7); });",
    "const r = (o.r || 0.11) * 1.35, wob = 1 + 0.12 * Math.sin(a * 40); ball.scale.set(r * wob, r / wob, r * wob); core.scale.setScalar(r * 0.75); });")
rep("const core = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: o.col || C.cobalt, transparent: true, opacity: 0.55, depthWrite: false }))); core.visible = false;",
    "const core = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#3C78E0', transparent: true, opacity: 0.8, depthWrite: false }))); core.visible = false;")
rep("len: o.len || 0.26, w: (o.r || 0.11) * 2.2, op: 0.9, col: C.cobalt });", "len: o.len || 0.3, w: (o.r || 0.11) * 3.0, op: 1.0, col: C.cobalt });")
# splash ring: thin, light
rep("FX.ring(A, { t: o.t, at: o.at, y: 0.02, r0: (o.r || 0.5) * 0.3, r1: (o.r || 0.5) * 1.8, dur: 0.45, col: C.foam, op: 0.6, w: 0.14 });",
    "FX.ring(A, { t: o.t, at: o.at, y: 0.02, r0: (o.r || 0.5) * 0.3, r1: (o.r || 0.5) * 1.6, dur: 0.45, col: C.sky, op: 0.7, w: 0.06 });")
# rain: tight cloud, more streaks
rep("const N = o.n || 40, rr = o.r || 1.5, h = o.h || 2.2;", "const N = Math.round((o.n || 40) * 1.8), rr = o.r || 1.5, h = o.h || 2.2;")
rep("cl.push({ s, a: R() * 6.28, r: Math.sqrt(R()) * rr * 0.85, sz: rr * (0.3 + 0.25 * R()) }); }", "cl.push({ s, a: R() * 6.28, r: Math.sqrt(R()) * rr * 0.55, sz: rr * (0.32 + 0.22 * R()) }); }")
rep("q.s.position.set(p[0], h + 0.1 * Math.sin(t + i), p[1]); q.s.scale.set(q.sz * 1.7, q.sz * 0.9, 1); q.s.material.opacity = 0.7 * k; });",
    "q.s.position.set(p[0], h + 0.15 * (i % 3) + 0.1 * Math.sin(t + i), p[1]); q.s.scale.set(q.sz * 1.5, q.sz * 0.85, 1); q.s.material.opacity = 0.85 * k; });")
open(f,'w').write(s); print('ok')
