import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:100]); sys.exit(1)
    s=s.replace(a,b)
# ===== WALL: own shader, faces classed in object space
R("FX.wall = (A, o) => {\n  const m = A.add(new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 } }, vertexShader: VS_SKIN, fragmentShader: F_SKIN,",
  """const VS_WALL = `varying vec3 vNo; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vP=position; vNo=normal; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
// a wall of water seen from the play camera: one deep-to-light body over the near end and the top, a glowing foot, a foam crest and swirls
const F_WALL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec3 vNo; varying vec3 vP; varying vec2 vUv; ${GN}
  void main(){ if(vNo.y<-0.5) discard; bool top=vNo.y>0.5; float y=vP.y; float along=clamp(vP.x*u0+0.5,0.0,1.0); float g=top? 0.45+0.55*along : 0.45*y;
    vec3 c=mix(vec3(0.02,0.10,0.45),vec3(0.08,0.32,0.90),clamp(g/0.85,0.0,1.0)); c=mix(c,vec3(0.30,0.60,1.0),smoothstep(0.85,1.0,g));
    float cs=caus(vec2((vP.x+vP.z)*3.0, y*3.0+vP.z*2.0)+vec2(0.0,-tm*0.2),tm); c=mix(c,vec3(0.3,0.6,1.0),cs*0.18);
    float foot=top? 0.0 : (1.0-smoothstep(0.0,0.15,y)); c+=vec3(0.4,0.7,1.0)*0.8*foot;
    float n=fbm(vec2((vP.x+vP.z)*8.0, y*6.0+along*6.0)+tm*0.5); float crest=smoothstep(0.88,0.95,g+0.1*(n-0.5));
    float run=0.0; if(top){ float zz=vP.z; run=smoothstep(0.06,0.0,abs(along-0.6-0.08*sin(zz*12.0+tm*1.5)-0.04*fbm(vec2(zz*8.0,tm))))+smoothstep(0.06,0.0,abs(along-0.78-0.06*sin(zz*10.0-tm*1.2+2.0))); run*=smoothstep(0.35,0.6,n); }
    float edge=top? smoothstep(0.42,0.5,abs(vP.z))*smoothstep(0.3,0.6,n) : 0.0; float foam=clamp(max(max(crest,run*0.9),edge),0.0,1.0);
    c=mix(c,mix(c,col,0.5),u1*0.6); c=mix(c,col2,foam); gl_FragColor=vec4(c, clamp(op*0.85*(1.0+0.15*foam),0.0,1.0)); }`;
FX.wall = (A, o) => {
  const m = A.add(new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 1 }, u1: { value: o.col ? 1 : 0 }, tm: { value: 0 } }, vertexShader: VS_WALL, fragmentShader: F_WALL,""")
R("m.material.uniforms.tm.value = t; lip.position.copy(m.position);","m.material.uniforms.tm.value = t; m.material.uniforms.u0.value = -Math.sin(yawAt(t)) < 0 ? 1 : -1; lip.position.copy(m.position);")
# ===== TSUNAMI: concave back, big curl, full-height sides, a filled profile cap at each side
R("const PR = [[-1.55, 0], [-1.1, 0.25], [-0.6, 0.62], [-0.2, 0.95], [0.15, 1.2], [0.45, 1.35], [0.75, 1.32], [0.97, 1.13], [0.88, 0.92], [0.6, 0.78], [0.38, 0.5], [0.45, 0.18], [0.72, 0]];",
  "const PR = [[-1.55, 0], [-1.05, 0.06], [-0.6, 0.22], [-0.25, 0.5], [0.05, 0.85], [0.3, 1.15], [0.6, 1.35], [0.95, 1.3], [1.15, 1.05], [1.05, 0.82], [0.75, 0.75], [0.5, 0.45], [0.5, 0.15], [0.62, 0]];")
R("hk = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 6)), 0.5), y = py * hk / 1.35, pv = v * (PR.length - 1);\n    pos.push(u * 0.5, y, (pz - 0.97) / 2.52);\n    const crest = pv > 5.3 && pv < 8.3, face = pv >= 8.3 && pv < 11.2, foot = pv >= 11.2;",
  "hk = 1 - 0.4 * Math.min(1, Math.max(0, (Math.abs(u) - 0.8) / 0.2)) ** 2, y = py * hk / 1.35, pv = v * (PR.length - 1);\n    pos.push(u * 0.5, y, (pz - 1.15) / 2.7);\n    const crest = pv > 5.0 && pv < 8.6, face = pv >= 8.6 && pv < 12.4, foot = pv >= 12.4;")
R("for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b2 = a + NV + 1; idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); }\n  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); const UVw = []; for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) UVw.push(i / NU, j / NV);",
  "for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b2 = a + NV + 1; idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); }\n  const UVw = []; for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) UVw.push(i / NU, j / NV);\n"
  "  // a filled profile at each side (the curl seen in silhouette): the outline back -> crest -> lip -> under the face -> foot, closed along the floor\n"
  "  for (const sd of [-1, 1]) { const outl = [], base = pos.length / 3; for (let j = 0; j <= NV; j++) { const v = j / NV, [pz, py] = prof(v), y = py * 0.6 / 1.35, z = (pz - 1.15) / 2.7; outl.push(new THREE.Vector2(z, y)); pos.push(sd * 0.5, y, z); cc.copy(c0).lerp(c1, Math.min(1, y * 2.2)).lerp(c3, Math.sin(v * 60 + y * 9) > 0.85 ? 0.45 : 0); col.push(cc.r, cc.g, cc.b, 1); UVw.push(sd < 0 ? 0.12 : 0.88, v); }\n"
  "    const tri = THREE.ShapeUtils.triangulateShape(outl, []); for (const t3 of tri) idx.push(base + t3[0], base + t3[1], base + t3[2]); }\n"
  "  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));")
R("float pv=vUv.y*12.0; float crest=smoothstep(4.5,5.5,pv)*(1.0-smoothstep(9.2,10.0,pv)); float face=smoothstep(8.0,9.0,pv);","float pv=vUv.y*13.0; float crest=smoothstep(4.5,5.5,pv)*(1.0-smoothstep(9.0,9.8,pv)); float face=smoothstep(9.0,10.0,pv);")
R("hh = (o.h || 0.8) * 1.3 * rise","hh = (o.h || 0.8) * 1.5 * rise")
R("(o.len || 1.0) * 1.4 * (0.7 + 0.3 * rise))","(o.len || 1.0) * 1.2 * (0.7 + 0.3 * rise))")
R("FX.mist(A, { t: ts, at: (tt) => { const p = posAt(ts), y = dirAt(ts); return [p.x + Math.sin(y) * 0.2 * (o.len || 1), (o.h || 0.8) * 0.95, p.z + Math.cos(y) * 0.2 * (o.len || 1)]; }, n: 2, r: (o.w || 1.3) * 0.45, h: 0.15, size: 0.14, dur: 0.4, op: 0.45, rise: 0.25, seed: i * 7 + 3 }); if (i % 2 === 0) FX.drops(",
  "FX.drops(")
R("return [p.x + Math.sin(y) * 0.25 * (o.len || 1), (o.h || 0.8) * 1.0, p.z + Math.cos(y) * 0.25 * (o.len || 1)]; }, n: 5, sp: (o.w || 1.3) * 0.5, up: 1.0,","return [p.x + Math.sin(y) * 0.1 * (o.len || 1), (o.h || 0.8) * 1.4, p.z + Math.cos(y) * 0.1 * (o.len || 1)]; }, n: 5, sp: (o.w || 1.3) * 0.6, up: 1.0,")
# ===== SPLASH: broad petals, foam solid, rings brighter
R("float sx=vUv.x*13.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),9.0); float top=0.35+0.65*pk*","float sx=vUv.x*8.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),2.5); float top=0.25+0.75*pk*")
R("float a=op*(0.45+0.35*y+0.5*lip); gl_FragColor","float a=op*(0.3+0.35*y+0.6*lip); gl_FragColor")
R("const crownGeo = new THREE.CylinderGeometry(1, 0.55, 1, 28, 1, true);","const crownGeo = new THREE.CylinderGeometry(0.8, 0.6, 1, 32, 1, true);")
R("float fr=u0*smoothstep(0.08,0.2,r)*(1.0-smoothstep(0.5,0.75,r+0.25*(fbm(p*5.0+tm)-0.5)))*smoothstep(0.3,0.5,fbm(p*7.0+tm*0.5));",
  "float rm=u0>1.1? smoothstep(0.6,0.72,r)*(1.0-smoothstep(0.85,1.0,r)) : u0<0.0? 0.0 : smoothstep(0.1,0.15,r)*(1.0-smoothstep(0.45,0.6,r+0.25*(fbm(p*5.0+tm)-0.5))); float fr=min(1.0,abs(u0))*rm*smoothstep(0.5,0.62,fbm(p*18.0+tm*0.5));")
R("a=op*(0.7+0.2*r+0.15*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,max(glow,fr)*op); }","a=op*(0.7+0.2*r+0.15*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(max(a,glow*op),fr*0.95); }")
R("FX.ring(A, { t: o.t, at: o.at, y: 0.02, r0: (o.r || 0.5) * 0.3, r1: (o.r || 0.5) * 1.6, dur: 0.45, col: C.sky, op: 0.7, w: 0.06 });","FX.ring(A, { t: o.t, at: o.at, y: 0.02, r0: (o.r || 0.5) * 0.3, r1: (o.r || 0.5) * 1.6, dur: 0.45, col: C.sky, op: 0.9, w: 0.06 });")
# ===== POOL: rim noise per mode, softer ripples, blue glow; stain mode (u1 < 0) for the soaked puddle
R("float rn=r+(fbm(vec2(cos(an),sin(an))*2.0+tm*0.2)-0.5)*0.12;","float rn=r+(fbm(vec2(cos(an),sin(an))*2.0+tm*0.2)-0.5)*(u1>0.0? 0.04 : u1<0.0? 0.3 : 0.12);")
R("float rip=smoothstep(0.75,1.0,sin(r*26.0-tm*4.0))*(1.0-r*0.5);","float rip=smoothstep(0.75,1.0,sin(r*26.0-tm*4.0))*(1.0-r*0.5)*0.45;")
R("c=mix(c,vec3(0.7,0.86,1.0),glow); c=mix(c,col2,fr); c+=vec3(0.9,0.95,1.0)*spk(p*6.0,tm)*0.8;",
  "c=mix(c,vec3(0.4,0.7,1.0),glow); c=mix(c,col2,fr); c+=vec3(0.9,0.95,1.0)*spk(p*6.0,tm)*0.8;\n      if(u1<0.0){ float ff=smoothstep(0.55,0.68,fbm(p*14.0+tm*0.3))*smoothstep(0.55,0.75,rn)*(1.0-smoothstep(0.85,0.95,rn))*smoothstep(-0.1,-0.4,p.y); c=mix(vec3(0.03,0.10,0.38),vec3(0.1,0.3,0.75),cs*0.4); c=mix(c,col2,ff); a=op*(1.0-smoothstep(0.7,1.0,rn)); a=max(a,ff*op); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); return; }")
R("mix(vec3(0.06,0.2,0.6),col*1.0,fbm(cw*2.0+vec2(r*5.0,0.0)))","mix(vec3(0.06,0.2,0.6),col*0.8,fbm(cw*2.0+vec2(r*5.0,0.0)))")
# ===== GEYSER: solid foam donut, column meets it, foam at the foot, softer streaks
R("float m=smoothstep(0.48,0.68,n); vec3 c=mix(vec3(0.5,0.72,1.0),col2,m); gl_FragColor=vec4(c,op*(0.08+0.9*m)); }`;","float m=smoothstep(0.35,0.55,n); vec3 c=mix(vec3(0.78,0.9,1.0),col2,m); gl_FragColor=vec4(c,op*(0.75+0.25*m)); }`;")
R("torGeo = new THREE.TorusGeometry(1, 0.2, 10, 48);","torGeo = new THREE.TorusGeometry(1, 0.3, 10, 48);")
R("cap.position.set(c.x, h * (o.fall ? down : 1) * 0.8, c.z); cap.scale.set(r * 1.1, r * 0.8, r * 1.1);","cap.position.set(c.x, h * (o.fall ? down : 1) * 0.92, c.z); cap.scale.set(r * 1.3, r * 1.0, r * 1.3); ft.visible = true; ft.position.set(c.x, 0, c.z); ft.scale.set(r * 1.3, 0.15 * up, r * 1.3); ft.material.uniforms.op.value = 0.8 * down; ft.material.uniforms.tm.value = t;")
R("const cap = A.add(new THREE.Mesh(torGeo, fxMat(C.foam, F_FOAMT, { col2: C.foam }))); cap.visible = false;","const cap = A.add(new THREE.Mesh(torGeo, fxMat(C.foam, F_FOAMT, { col2: C.foam }))); cap.visible = false; const ft = A.add(new THREE.Mesh(crownGeo, fxMat(C.cobalt, F_CROWN, { col2: C.foam }))); ft.visible = false; ft.material.uniforms.u0.value = 4.1;")
R("const on = a >= 0 && a <= d; m.visible = cap.visible = on; if (!on) return; const c = P3(A, o.at, o.follow ? t : o.t); const up","const on = a >= 0 && a <= d; m.visible = cap.visible = ft.visible = on; if (!on) return; const c = P3(A, o.at, o.follow ? t : o.t); const up")
R("float top=0.7+0.3*fbm(vec2(vUv.x*u1*1.2,tm*0.7)); if(y>top) discard;","float top=0.97+0.03*fbm(vec2(vUv.x*u1*1.2,tm*0.7)); if(y>top) discard;")
R("float st=smoothstep(0.48,0.72,fbm(vec2(vUv.x*u1*4.0, y*0.4-tm*u0*0.6)))*(1.0-y*0.3);","float st=smoothstep(0.48,0.72,fbm(vec2(vUv.x*u1*4.0+0.6*sin(y*5.0), y*0.4-tm*u0*0.6)))*(1.0-y*0.3);")
R("vec3 c=mix(vec3(0.05,0.18,0.55),col*1.2,smoothstep(0.0,0.75,y)); c=mix(c,vec3(0.78,0.9,1.0),st*0.8);","vec3 c=mix(vec3(0.05,0.18,0.55),vec3(0.25,0.55,1.0),smoothstep(0.0,0.75,y)); c=mix(c,vec3(0.78,0.9,1.0),st*0.5);")
# ===== SOAKED: stain puddle, drips on the camera side, glossier
R("pu.position.set(p.x, 0.007, p.z); pu.scale.setScalar(0.31 * dm.m.s / 0.82 * (0.6 + 0.4 * Math.min(1, (t - sk.t0) / 0.4)));","pu.position.set(p.x, 0.007, p.z + 0.1); { const ps = 0.31 * dm.m.s / 0.82 * (0.6 + 0.4 * Math.min(1, (t - sk.t0) / 0.4)); pu.scale.set(ps * 1.25, 1, ps * 0.9); } pu.material.uniforms.u1.value = -1;")
R("pu.material.uniforms.op.value = 0.7 * wet;","pu.material.uniforms.op.value = 0.75 * wet;")
R("dm.m.cm.roughness = 0.95 - 0.75 * wet;","dm.m.cm.roughness = 0.95 - 0.85 * wet;")
R("const an = k * 1.05 + 0.4, rr = 0.25 * dm.m.s / 0.82;","const an = Math.PI * (0.22 + 0.07 * k), rr = 0.27 * dm.m.s / 0.82;")
R("const hy = (k % 2 ? 0.55 : 0.95) * dm.m.s / 0.82;","const hy = (0.95 - 0.08 * (k % 3)) * dm.m.s / 0.82;")
R("d.scale.set(0.045, ph < 0.6 ? 0.2 : 0.08, 1);","d.scale.set(0.03, ph < 0.6 ? 0.32 : 0.07, 1); d.material.color.set('#9CC8F5');")
# ===== BOLT tail: one teardrop
R("float w=0.15+0.85*h; if(abs(v)>w) discard;","float w=0.1+0.9*pow(h,1.5); if(abs(v)>w) discard;")
R("float a=op*pow(h,0.8)*(1.2*core+0.3*l+0.6*fl)*(1.0-abs(vv)*0.3);","float a=op*pow(h,0.8)*(0.8*core+0.25*l+0.5*fl)*(1.0-abs(vv)*0.3);")
R("len: o.len || 0.35, w: (o.r || 0.11) * 3.6","len: o.len || 0.45, w: (o.r || 0.11) * 3.6")
# ===== STREAM: fuller body, glow, bigger end flare
R("const W0 = (o.w || 0.16) * 1.35;","const W0 = (o.w || 0.16) * 1.35 * (o.spray === false ? 1 : 1.3);")
R("halo.m.material.uniforms.op.value = 0.16 * k;","halo.m.material.uniforms.op.value = 0.3 * k;")
R("(o.spray === false ? 1 : 1 + 1.2 * Math.max(0, (v - 0.88) / 0.12) ** 2)","(o.spray === false ? 1 : 1 + 2.0 * Math.max(0, (v - 0.88) / 0.12) ** 2)")
# ===== RING WAVE: thicker, lighter, bigger foam
R("[[0.84, 0], [0.88, 0.25], [0.93, 0.55], [0.99, 0.8], [1.04, 0.92], [1.09, 0.84], [1.1, 0.62], [1.08, 0.38], [1.12, 0.1], [1.17, 0]]","[[0.78, 0], [0.83, 0.25], [0.9, 0.55], [0.98, 0.8], [1.05, 0.92], [1.12, 0.84], [1.14, 0.62], [1.12, 0.38], [1.17, 0.1], [1.23, 0]]")
R("float n=fbm(q*9.0+vec2(v*22.0,tm*0.8)); float crest=smoothstep(0.38,0.5,v)*(1.0-smoothstep(0.6,0.72,v))*smoothstep(0.4,0.62,n);","float n=fbm(q*5.0+vec2(v*10.0,tm*0.8)); float crest=smoothstep(0.36,0.48,v)*(1.0-smoothstep(0.62,0.76,v))*smoothstep(0.38,0.58,n);")
R("vec3 c=mix(vec3(0.03,0.1,0.4),col*1.1,smoothstep(0.05,0.45,v)); c=mix(c,vec3(0.75,0.9,1.0),st*0.75);","vec3 c=mix(vec3(0.05,0.16,0.5),vec3(0.3,0.58,0.98),smoothstep(0.05,0.45,v)); c=mix(c,vec3(0.75,0.9,1.0),st*0.75);")
# ===== BUBBLE swirls, DOME rim colour
R("float sw=smoothstep(0.5,0.72,fbm(","float sw=smoothstep(0.46,0.66,fbm(")
R("c=mix(c,col2,sw*0.9+u0);","c=mix(c,col2,min(1.0,sw*1.1+u0));")
R("c=mix(c,vec3(0.3,0.6,1.0),pow(f,2.0));","c=mix(c,vec3(0.2,0.5,1.0),pow(f,2.0));")
open(p,'w').write(s); print('p13 ok')
