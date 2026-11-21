import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:90]); sys.exit(1)
    s=s.replace(a,b)
# ---- tsunami: tall curling crest, overhanging lip, hollow face
R("const PR = [[-1.55, 0], [-1.15, 0.2], [-0.7, 0.6], [-0.3, 0.9], [0, 0.95], [0.3, 1.02], [0.52, 1.17], [0.74, 1.02], [0.73, 0.84], [0.56, 0.68], [0.48, 0.4], [0.57, 0.13], [0.76, 0]];",
  "const PR = [[-1.55, 0], [-1.1, 0.25], [-0.6, 0.62], [-0.2, 0.95], [0.15, 1.2], [0.45, 1.35], [0.75, 1.32], [0.97, 1.13], [0.88, 0.92], [0.6, 0.78], [0.38, 0.5], [0.45, 0.18], [0.72, 0]];")
R("y = py * hk / 1.17, pv = v * (PR.length - 1);\n    pos.push(u * 0.5, y, (pz - 0.76) / 2.31);","y = py * hk / 1.35, pv = v * (PR.length - 1);\n    pos.push(u * 0.5, y, (pz - 0.97) / 2.52);")
R("float pv=vUv.y*12.0; float crest=smoothstep(5.0,6.0,pv)*(1.0-smoothstep(8.6,9.4,pv));","float pv=vUv.y*12.0; float crest=smoothstep(4.5,5.5,pv)*(1.0-smoothstep(9.2,10.0,pv));")
R("float st=smoothstep(0.5,0.8,fbm(vec2(vUv.x*34.0, vUv.y*2.0-tm*0.6)))*(0.55+0.45*face);\n    float froth=crest*smoothstep(0.35,0.65,",
  "float st=smoothstep(0.5,0.78,fbm(vec2(vUv.x*22.0+sin(vUv.y*9.0)*0.6, vUv.y*4.0-tm*0.6)))*(0.55+0.45*face);\n    float froth=crest*smoothstep(0.2,0.5,")
R("hh = (o.h || 0.8) * rise * sink * (o.hFn ? o.hFn(a / d) : 1);","hh = (o.h || 0.8) * 1.3 * rise * sink * (o.hFn ? o.hFn(a / d) : 1);")
R("w: (o.w || 1.3) * 0.9, op: 0.34, flow: 0 });","w: (o.w || 1.3) * 0.9, op: 0.18, flow: 0 });")
# ---- wall: deep blue slab, foam top, curved foam bands, no diagonal glare; slimmer
R("float run=u1>0.5? smoothstep(0.6,0.85,fbm(vec2((vP.x+vP.z)*12.0, y*1.5+tm*1.2)))*0.6 : 0.0;",
  "float hz=vP.x+vP.z; float run=u1>0.5? (smoothstep(0.035,0.0,abs(y-0.62-0.12*sin(hz*5.0+tm*1.5)-0.05*fbm(vec2(hz*8.0,tm))))+smoothstep(0.03,0.0,abs(y-0.32-0.1*sin(hz*4.0-tm*1.2+2.0)-0.05*fbm(vec2(hz*9.0,tm+3.0)))))*smoothstep(0.35,0.6,fbm(vec2(hz*10.0,y*4.0+tm))) : 0.0; float wb=u1>0.5? (1.0-smoothstep(0.0,0.1,y)) : 0.0;")
R("float top=u1>0.5? smoothstep(0.86,0.98,y)*smoothstep(0.3,0.6,","float top=u1>0.5? smoothstep(0.8,0.95,y)*smoothstep(0.25,0.55,")
R("vec3 c=mix(vec3(0.08,0.25,0.7),col*1.25,clamp(y,0.0,1.0)); c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.5 : sh2)+run*0.5); c=mix(c,vec3(0.7,0.88,1.0),base); c=mix(c,col2,max(top, u1>0.5? step(0.5,n.y)*0.8 : 0.0));",
  "float tf=u1>0.5? step(0.5,n.y)*smoothstep(0.3,0.6,fbm(vec2(vP.x*7.0,vP.z*7.0)+tm*0.6)) : 0.0; vec3 c=u1>0.5? mix(vec3(0.03,0.14,0.5),vec3(0.2,0.5,0.95),clamp(y,0.0,1.0)) : mix(vec3(0.08,0.25,0.7),col*1.25,clamp(y,0.0,1.0)); c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.35 : sh2)); c=mix(c,vec3(0.6,0.85,1.0),wb*0.8); c=mix(c,vec3(0.7,0.88,1.0),base); c=mix(c,col2,clamp(max(max(top,run*0.9), u1>0.5? step(0.5,n.y)*(0.35+0.6*tf) : 0.0),0.0,1.0));")
R("float a=op*(u1>0.5? (0.42+0.35*f+0.35*cs+0.4*run+0.6*top)*wall + step(0.5,n.y)*0.9 : (0.07+0.75*pow(f,2.2)+0.35*sh2+base));",
  "float a=op*(u1>0.5? (0.62+0.3*f+0.2*cs+0.5*run+0.6*top+0.5*wb)*wall + step(0.5,n.y)*(0.55+0.4*tf) : (0.04+0.38*pow(f,2.6)+0.6*cs2+0.35*sh2+base));")
# ---- dome: thin rim, clear inside, caustic veins, thin bright floor line
R("float base=u1>0.5? 0.0 : (1.0-smoothstep(0.0,0.12,y))*0.9;","float cs2=u1>0.5? 0.0 : caus(vP.xz*2.6+vec2(y*2.0,-y*1.5), tm)*smoothstep(0.1,0.7,f+0.2); float base=u1>0.5? 0.0 : (1.0-smoothstep(0.0,0.06,y))*1.0;")
R("c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.35 : sh2));","c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.35 : sh2*0.6+cs2*0.9));")
R("m.material.uniforms.op.value = Math.min(1, ((o.op || 0.5) * 1.5 + 0.4 * fl))","m.material.uniforms.op.value = Math.min(1, ((o.op || 0.5) * 1.7 + 0.4 * fl))")
R("m.scale.set(o.w || 2, Math.max(0.01, H * sink), (o.th || 0.18) * 1.9);","m.scale.set(o.w || 2, Math.max(0.01, H * sink), (o.th || 0.18) * 0.9);")
R("m.material.uniforms.op.value = Math.min(1, (o.op || 0.6) * 1.35) * Math.min(1, (o.t1 - t) / 0.2)","m.material.uniforms.op.value = Math.min(1, (o.op || 0.6) * 1.15) * Math.min(1, (o.t1 - t) / 0.2)")
# ---- ring wave: a rolled ring of water lying on the floor, swirl streaks around it, foam crest
R("const ringWallGeo = new THREE.CylinderGeometry(1, 1.04, 1, 48, 1, true); ringWallGeo.translate(0, 0.5, 0);",
  "const ringWallGeo = new THREE.LatheGeometry([[0.72, 0], [0.78, 0.25], [0.86, 0.55], [0.96, 0.8], [1.04, 0.92], [1.12, 0.82], [1.12, 0.6], [1.08, 0.35], [1.16, 0.08], [1.24, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 72);\n"
  "const F_RW = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}\n"
  "  void main(){ float v=vUv.y; float x=vUv.x; vec2 q=vec2(cos(x*6.2832),sin(x*6.2832)); float st=smoothstep(0.5,0.75,fbm(q*u1*0.35+vec2(v*6.0,tm*u0*0.6)))*(0.4+0.6*smoothstep(0.1,0.5,v));\n"
  "    float n=fbm(q*u1*0.5+vec2(v*9.0,tm*0.8)); float crest=smoothstep(0.32,0.45,v)*(1.0-smoothstep(0.62,0.78,v))*smoothstep(0.35,0.6,n); float ends=smoothstep(0.0,0.12,v)*(1.0-smoothstep(0.85,1.0,v));\n"
  "    vec3 c=mix(vec3(0.03,0.1,0.4),col*1.1,smoothstep(0.05,0.45,v)); c=mix(c,vec3(0.75,0.9,1.0),st*0.75); c=mix(c,col2,crest);\n"
  "    float a=op*ends*(0.65+0.25*st+0.4*crest); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;")
R("const m = A.add(new THREE.Mesh(ringWallGeo, fxMat(C.cobalt, F_COL2, { col2: C.foam }))); m.visible = false; m.material.uniforms.u1.value = 14;",
  "const m = A.add(new THREE.Mesh(ringWallGeo, fxMat(C.cobalt, F_RW, { col2: C.foam }))); m.material.side = THREE.DoubleSide; m.visible = false; m.material.uniforms.u1.value = 14;")
R("m.scale.set(r, (o.h || 0.55) * Math.sin(Math.PI * Math.min(1, 0.15 + u)), r); m.material.uniforms.op.value = (o.op || 0.85) * (1 - EASE.in(u));",
  "m.scale.set(r, (o.h || 0.55) * 0.75 * Math.sin(Math.PI * Math.min(1, 0.15 + u)), r); m.material.uniforms.op.value = (o.op || 0.85) * (1 - EASE.in(u));")
# ---- geyser: straight column, vertical streaks, foam donut on top, tight foot
R("const colGeo = new THREE.CylinderGeometry(0.85, 1, 1, 24, 1, true);","const colGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);\nconst F_FOAMT = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float tm; varying vec2 vUv; ${GN}\n  void main(){ vec2 q=vec2(cos(vUv.x*6.2832),sin(vUv.x*6.2832)); float n=fbm(q*3.0+vec2(vUv.y*5.0,tm*0.8)); float m=smoothstep(0.3,0.55,n); vec3 c=mix(vec3(0.5,0.72,1.0),col2,m); gl_FragColor=vec4(c,op*(0.35+0.65*m)); }`;\nconst torGeo = new THREE.TorusGeometry(1, 0.3, 10, 40); torGeo.rotateX(Math.PI / 2);")
R("float st=smoothstep(0.48,0.75,fbm(vec2(vUv.x*u1*4.0, y*1.0-tm*u0)))*(1.0-y*0.3);","float st=smoothstep(0.48,0.72,fbm(vec2(vUv.x*u1*4.0, y*0.4-tm*u0*0.6)))*(1.0-y*0.3);")
R("m.visible = false; m.material.uniforms.u1.value = 6;\n  const cap = A.add(new THREE.Mesh(crownGeo, fxMat(C.foam, F_CROWN, { col2: C.foam }))); cap.visible = false; cap.material.uniforms.u0.value = 2.7;",
  "m.visible = false; m.material.uniforms.u1.value = 10;\n  const cap = A.add(new THREE.Mesh(torGeo, fxMat(C.foam, F_FOAMT, { col2: C.foam }))); cap.visible = false;")
R("cap.position.set(c.x, h * (o.fall ? down : 1) * 0.86, c.z); cap.scale.set(r * 1.25, r * 1.1, r * 1.25);","cap.position.set(c.x, h * (o.fall ? down : 1) * 0.8, c.z); cap.scale.set(r * 1.15, r * 1.1, r * 1.15);")
R("r: (o.r || 0.35) * 1.9, op: 0.5, froth: 1.2, fin: 0.08","r: (o.r || 0.35) * 1.4, op: 0.4, froth: 1.2, fin: 0.08")
# ---- rain: thin dark flat cloud, clear pool, long thin streaks, small rings
R("q.s.scale.set(q.sz * 2.0, q.sz * 0.75, 1); q.s.material.opacity = 0.8 * k;","q.s.scale.set(q.sz * 1.3, q.sz * 0.3, 1); q.s.material.opacity = 0.45 * k;")
R("color: k % 3 ? '#9AA6B8' : '#C2CCDA'","color: k % 3 ? '#6E7A8C' : '#8E99AA'")
R("q.m.scale.set(0.02, 0.02, 0.45); q.m.material.uniforms.op.value = 0.9 * k;","q.m.scale.set(0.012, 0.012, 0.9); q.m.material.uniforms.op.value = 0.9 * k;")
R("r0: 0.02, r1: 0.18, dur: 0.5, col: C.foam, op: 0.6, w: 0.3 });","r0: 0.02, r1: 0.12, dur: 0.5, col: C.foam, op: 0.6, w: 0.3 });")
R("r: rr, sx: o.sx || 1, yaw: o.yaw, op: 0.28, grow: true });","r: rr, sx: o.sx || 1, yaw: o.yaw, op: 0.14, grow: true });")
# ---- soaked: deeper glossy tint, small dark stain, streak drips
R("const SOAKTINT = new THREE.Color('#3F6FD0');","const SOAKTINT = new THREE.Color('#2F62CC');")
R("lerp(SOAKTINT, 0.7 * wet); dm.m.cm.roughness = 0.95 - 0.6 * wet;","lerp(SOAKTINT, 0.8 * wet); dm.m.cm.roughness = 0.95 - 0.75 * wet;")
R("pu.scale.setScalar(0.44 * dm.m.s / 0.82","pu.scale.setScalar(0.31 * dm.m.s / 0.82")
R("pu.material.uniforms.op.value = 0.55 * wet;","pu.material.uniforms.op.value = 0.33 * wet;")
R("d.scale.set(0.05, ph < 0.6 ? 0.11 : 0.06, 1);","d.scale.set(0.03, ph < 0.6 ? 0.16 : 0.07, 1);")
open(p,'w').write(s); print('p10 ok')
