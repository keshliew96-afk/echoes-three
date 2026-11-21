import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:90]); sys.exit(1)
    s=s.replace(a,b)
# ---- splash crown: thin clear sheets, sharp spikes
R("float sx=vUv.x*7.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),3.0);","float sx=vUv.x*9.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),6.0);")
R("float lip=smoothstep(top-0.28,top,y);\n    vec3 c=mix(vec3(0.15,0.4,0.9),vec3(0.55,0.75,1.0),y); c=mix(c,col2,clamp(lip*0.9+smoothstep(0.65,0.85,n)*0.6,0.0,1.0)); float a=op*(0.6+0.4*y+0.3*lip);",
  "float lip=smoothstep(top-0.12,top,y);\n    vec3 c=mix(vec3(0.1,0.3,0.8),vec3(0.4,0.65,1.0),y); c=mix(c,col2,clamp(lip*0.9+smoothstep(0.7,0.88,n)*0.5,0.0,1.0)); float a=op*(0.25+0.35*y+0.5*lip);")
R("op: o.crash ? 0.55 : 0.42, froth: 1, fin: 0.06","op: o.crash ? 0.4 : 0.3, froth: 1, fin: 0.06")
R("up: (o.h || 0.6) * 3.4, size: 0.04, dur: 0.6, dir: o.dir });","up: (o.h || 0.6) * 3.4, size: 0.055, dur: 0.6, dir: o.dir });")
R("n: (o.n || 8) * (o.crash ? 2 : 1.5), sp: (o.r || 0.5) * 2.4","n: Math.round((o.n || 8) * (o.crash ? 3 : 2.2)), sp: (o.r || 0.5) * 2.4")
# ---- pool (non-whirl): navy, foam ring hugging the centre, rougher rim
R("float rn=r+(fbm(vec2(an*2.0,tm*0.2))-0.5)*0.06;","float rn=r+(fbm(vec2(cos(an),sin(an))*2.0+tm*0.2)-0.5)*0.12;")
R("float fr=u0*smoothstep(0.12,0.28,r)*(1.0-smoothstep(0.45,0.8,r+0.25*(fbm(p*5.0+tm)-0.5)))*smoothstep(0.42,0.62,fbm(p*16.0+tm*0.5));\n      c=mix(vec3(0.06,0.2,0.6),col*1.15,0.35+0.65*r);",
  "float fr=u0*smoothstep(0.06,0.2,r)*(1.0-smoothstep(0.3,0.55,r+0.25*(fbm(p*5.0+tm)-0.5)))*smoothstep(0.3,0.5,fbm(p*7.0+tm*0.5));\n      c=mix(vec3(0.03,0.12,0.42),col*1.0,0.25+0.6*r);")
# ---- whirl: broad arms, navy, darker eye, no seam
R("float arm=sin(sw*3.0+fbm(p*3.0)*2.0); float n=fbm(vec2(sw*1.5, r*6.0-tm*0.6));\n      float fs=fbm(vec2(sw*5.0, r*28.0)); float foam=smoothstep(0.45,0.95,arm)*smoothstep(0.12,0.4,r)*smoothstep(0.35,0.75,fs+0.25*n); float lines=smoothstep(0.62,0.85,fbm(vec2(sw*7.0,r*40.0)))*0.55*r*(1.0-foam);\n      c=mix(vec3(0.02,0.08,0.3),mix(vec3(0.1,0.3,0.75),col*1.05,fbm(vec2(sw*2.0,r*5.0))),smoothstep(0.0,0.8,r));",
  "vec2 cw=vec2(cos(sw),sin(sw)); float arm=sin(sw*3.0+fbm(p*3.0)*2.0); float n=fbm(cw*1.5+vec2(r*6.0-tm*0.6,0.0));\n      float fs=fbm(cw*4.0+vec2(0.0,r*14.0)); float foam=smoothstep(0.2,0.8,arm)*smoothstep(0.12,0.4,r)*smoothstep(0.25,0.6,fs+0.25*n); float lines=smoothstep(0.62,0.85,fbm(cw*6.0+vec2(r*30.0,0.0)))*0.55*r*(1.0-foam);\n      c=mix(vec3(0.015,0.05,0.22),mix(vec3(0.06,0.2,0.6),col*1.0,fbm(cw*2.0+vec2(r*5.0,0.0))),smoothstep(0.1,0.6,r));")
# ---- bubble: crisp blue rim, broad swirls, window streak
R("float f=1.0-abs(dot(n,v)); float rim=pow(f,3.5);\n    float sw=smoothstep(0.62,0.85,fbm(vec2(atan(vP.z,vP.x)*1.6+vP.y*2.0+tm*0.3, vP.y*3.0-tm*0.2)))*smoothstep(0.35,0.8,f);\n    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),40.0); vec3 c=mix(col,vec3(0.2,0.45,0.95),0.85*rim); c=mix(c,col2,sw*0.8+u0); c=mix(c,vec3(1.0),spec);\n    float a=op*(0.08+1.1*rim+0.6*sw);",
  "float f=1.0-abs(dot(n,v)); float rim=pow(f,2.5); float ang=atan(vP.z,vP.x);\n    float sw=smoothstep(0.5,0.72,fbm(vec2(ang*0.8+vP.y*1.2+tm*0.3, vP.y*5.0-tm*0.2)))*smoothstep(0.2,0.6,f);\n    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),12.0)*smoothstep(0.35,0.6,fract((vP.x-vP.y)*1.5+0.2))*(1.0-smoothstep(0.6,0.85,fract((vP.x-vP.y)*1.5+0.2))); vec3 c=mix(col,vec3(0.25,0.5,1.0),0.9*rim); c=mix(c,col2,sw*0.9+u0); c=mix(c,vec3(1.0),spec);\n    float a=op*(0.14+1.6*rim+0.9*sw);")
# ---- bolt: glassy ball, light core, one comet tail
R("const ball = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0.9 }, u0: { value: 0.1 } }, vertexShader: VS_BUB, fragmentShader: F_BUB,",
  "const ball = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0.95 }, u0: { value: 0.05 }, tm: { value: 0 } }, vertexShader: VS_BUB2, fragmentShader: F_BUB2,")
R("new THREE.MeshBasicMaterial({ color: '#3C78E0', transparent: true, opacity: 0.8, depthWrite: false }))); core.visible = false;","new THREE.MeshBasicMaterial({ color: '#6FA8F0', transparent: true, opacity: 0.35, depthWrite: false }))); core.visible = false;")
R("len: o.len || 0.3, w: (o.r || 0.11) * 3.0, op: 1.0, col: C.cobalt });","len: o.len || 0.6, w: (o.r || 0.11) * 3.0, op: 1.0, col: C.cobalt });")
R("for(int i=0;i<4;i++){ float fi=float(i); float lane=-0.7+0.47*fi+0.12*sin(h*9.0+fi*2.0);","for(int i=0;i<4;i++){ float fi=float(i); float lane=-0.45+0.3*fi+0.1*sin(h*9.0+fi*2.0);")
R("float a=op*pow(h,1.2)*(0.55*core+0.6*l)*(1.0-abs(vv)*0.3);","float fl=smoothstep(0.7,0.9,hh(floor(vec2(h*40.0,vv*4.0))))*smoothstep(0.6,0.9,abs(vv)); c=mix(c,col2,fl); float a=op*pow(h,1.2)*(0.9*core+0.3*l+0.6*fl)*(1.0-abs(vv)*0.3);")
# ---- stream: braid, darker body, rough edge, burst at the end (ln = burst flag)
R("float edge=1.0-smoothstep(0.55,1.0,x+0.35*(n-0.5));","float edge=1.0-smoothstep(0.55,1.0,x+0.55*(n-0.5));")
R("vec3 c=mix(vec3(0.07,0.2,0.55),col*1.2,pow(1.0-x,0.6));","vec3 c=mix(vec3(0.04,0.14,0.45),col*1.15,pow(1.0-x,0.8));")
R("float a=s*edge*op*(0.85+0.15*max(str,gl)); gl_FragColor=vec4(c,a); }`;\nconst F_HALO",
  "float bu=ln*smoothstep(0.86,1.0,vUv.x); c=mix(c,col2,bu*0.75*smoothstep(0.3,0.6,n+0.3*(1.0-x))); float a=s*edge*op*(0.85+0.15*max(str,gl)); gl_FragColor=vec4(c,a); }`;\nconst F_HALO")
R("const F_FLOW2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv;","const F_FLOW2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float ln; varying vec2 vUv;")
R("const ww = w * (o.wid ? o.wid(v, t) : (0.75 + 0.25 * v))","const ww = w * (o.wid ? o.wid(v, t) : (0.75 + 0.25 * v) * (o.spray === false ? 1 : 1 + 1.2 * Math.max(0, (v - 0.88) / 0.12) ** 2))")
R("draw(outer, W0, t); outer.m.material.uniforms.op.value = 0.9 * k;","draw(outer, W0, t); outer.m.material.uniforms.op.value = (o.jop || 0.9) * k; outer.m.material.uniforms.ln.value = o.spray === false ? 0 : 1;")
R("const TW = o.twist === false ? 0 : 0.28; if (core) { draw(core, W0 * 0.3, t, [0, W0 * TW]);","const TW = o.twist === false ? 0 : (o.tw || 0.6); if (core) { draw(core, W0 * 0.4, t, [0, W0 * TW]);")
R("FX.drops(A, { t: ts, at: (tt) => to(tt), n: 5, sp: 0.9","FX.drops(A, { t: ts, at: (tt) => to(tt), n: 8, sp: 0.9")
# ---- jet: thinner, clearer
R("sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false, twist: false }, o));","sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false, twist: false, jop: 0.6 }, o, { w: (o.w || 0.14) * 0.75 }));")
# ---- rope: wavy, thinner, stronger twist
R("FX.rope = (A, o) => FX.stream(A, Object.assign({ core: false, helix: true, halo: false, wob: 0.04, spray: false, head: 0.15, tail: 0.15 }, o, { w: (o.w || 0.09) * 1.7 }));",
  "FX.rope = (A, o) => FX.stream(A, Object.assign({ core: false, helix: true, halo: false, wob: 0.12, spray: false, head: 0.15, tail: 0.15, tw: 0.9 }, o, { w: (o.w || 0.09) * 1.2 }));")
# ---- wet path: darker, see-through, foam on the long edges
R("float foam=smoothstep(0.66,0.8,xe)*body*smoothstep(0.3,0.6,fr);\n    float ends=smoothstep(0.0,0.6/max(ln,0.6)","float ends=smoothstep(0.0,1.2/max(ln,0.6)")
R("vec3 c=mix(vec3(0.06,0.2,0.6),col*1.15,0.45+0.55*fbm(p*0.8)); c=mix(c,vec3(0.55,0.78,1.0),cs*0.3);",
  "float foam=min(1.0,1.5*smoothstep(0.7,0.95,xe)*body*smoothstep(0.3,0.6,fr))*smoothstep(0.1,0.35,vUv.x)*(1.0-smoothstep(0.9,1.0,vUv.x)); vec3 c=mix(vec3(0.04,0.13,0.42),col*1.0,0.4+0.5*fbm(p*0.8)); c=mix(c,vec3(0.55,0.78,1.0),cs*0.5);")
R("m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.5) * 1.6) * k; m.material.uniforms.tm.value = (o.flow","m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.5) * 1.0) * k; m.material.uniforms.tm.value = (o.flow")
open(p,'w').write(s); print('p9 ok')
