f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:90], s.count(old))
    s=s.replace(old,new)
rep("vec3 c=mix(vec3(0.07,0.2,0.55),col*1.2,pow(1.0-x,0.6)); c=mix(c,vec3(0.62,0.8,1.0),0.6*str);", "vec3 c=mix(vec3(0.07,0.2,0.55),col*1.2,pow(1.0-x,0.6)); c=mix(c,vec3(0.8,0.92,1.0),0.85*str);")
rep("core = o.core === false ? null : mk(o.coreCol || C.sky, 0.5), core2 = o.core === false && !o.helix ? null : mk(o.coreCol || C.sky, 0.5);",
    "core = o.core === false ? null : mk(o.coreCol || C.foam, 0.5), core2 = o.core === false && !o.helix ? null : mk(o.coreCol || C.foam, 0.5);")
rep("const cl = []; for (let k = 0; k < 7; k++) {", "const cl = []; for (let k = 0; k < 6; k++) {")
rep("q.s.scale.set(q.sz * 1.5, q.sz * 0.85, 1); q.s.material.opacity = 0.85 * k; });", "q.s.scale.set(q.sz * 1.5, q.sz * 0.85, 1); q.s.material.opacity = 0.6 * k; });")
# ---- new shaders: a lit water surface for the wave, bubble/dome/wall skins
SH = r'''
// the breaking wave: vertex colours lit, foam streaks down the face, a frothy crest (uv: u across, v from back to foot)
const VS_WAVE = `attribute vec4 color; varying vec4 vC; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vC=color; vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
const F_WAVE = `uniform float op; uniform float tm; varying vec4 vC; varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${GN}
  void main(){ vec3 n=normalize(vN), v=normalize(vV); if(!gl_FrontFacing) n=-n; float l=0.55+0.45*max(0.0,dot(n,normalize(vec3(-0.3,0.8,0.5)))); float fr=pow(1.0-abs(dot(n,v)),2.0);
    float pv=vUv.y*12.0; float crest=smoothstep(5.0,6.0,pv)*(1.0-smoothstep(8.6,9.4,pv)); float face=smoothstep(8.0,9.0,pv);
    float st=smoothstep(0.55,0.85,fbm(vec2(vUv.x*26.0, vUv.y*3.0-tm*0.6)))*(0.4+0.6*face);
    float froth=crest*smoothstep(0.35,0.65,fbm(vec2(vUv.x*30.0,vUv.y*40.0)+tm*0.4));
    vec3 c=vC.rgb*l; c=mix(c,vec3(0.06,0.2,0.62),0.25*(1.0-crest)); c=mix(c,vec3(0.78,0.9,1.0),st*0.75); c=mix(c,vec3(0.95,0.98,1.0),froth); c+=vec3(0.25,0.4,0.6)*fr*0.5;
    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),30.0); c+=vec3(spec*0.6);
    gl_FragColor=vec4(c, op*vC.a*(0.82+0.18*max(froth,st))); }`;
// a bubble: a thin blue rim, almost clear inside, soft white swirls in the skin, a sharp window light
const F_BUB2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${GN}
  void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.0-abs(dot(n,v)); float rim=pow(f,3.5);
    float sw=smoothstep(0.62,0.85,fbm(vec2(atan(vP.z,vP.x)*1.6+vP.y*2.0+tm*0.3, vP.y*3.0-tm*0.2)))*smoothstep(0.35,0.8,f);
    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),40.0); vec3 c=mix(col,vec3(0.25,0.5,0.95),0.6*rim); c=mix(c,col2,sw*0.8+u0); c=mix(c,vec3(1.0),spec);
    float a=op*(0.06+0.7*rim+0.45*sw); gl_FragColor=vec4(c,clamp(max(a,spec*op),0.0,1.0)); }`;
const VS_BUB2 = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
// a dome or a wall of water: clear skin with a moving caustic web, a bright band where it meets the floor, foam on top (u1: wall)
const VS_SKIN = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
const F_SKIN = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv; ${GN}
  void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.0-abs(dot(n,v)); float y=vP.y;
    vec2 q=u1>0.5? vec2(vP.x*2.5+vP.z*2.5, y*2.5) : vec2(atan(vP.z,vP.x)*3.0, y*4.0); float cs=caus(q*1.4+vec2(0.0,-tm*0.25), tm);
    float base=u1>0.5? 0.0 : (1.0-smoothstep(0.0,0.12,y))*0.9; float top=u1>0.5? smoothstep(0.86,0.98,y)*smoothstep(0.3,0.6,fbm(vec2(vP.x*9.0+vP.z*9.0,y*6.0)+tm*0.5)) : 0.0;
    float run=u1>0.5? smoothstep(0.6,0.85,fbm(vec2((vP.x+vP.z)*12.0, y*1.5+tm*1.2)))*0.6 : 0.0; float wall=u1>0.5? (1.0-step(0.5,abs(n.y))) : 1.0;
    vec3 c=mix(col*0.85,col*1.25,y); c=mix(c,vec3(0.65,0.85,1.0),cs*0.65+run*0.5); c=mix(c,vec3(0.7,0.88,1.0),base); c=mix(c,col2,max(top, u1>0.5? step(0.5,n.y)*0.8 : 0.0));
    float spec=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.4,0.8,0.5)))),30.0);
    float a=op*(u1>0.5? (0.42+0.35*f+0.35*cs+0.4*run+0.6*top)*wall + step(0.5,n.y)*0.9 : (0.06+0.6*pow(f,2.5)+0.45*cs+base)); gl_FragColor=vec4(c+spec*0.5, clamp(a,0.0,1.0)); }`;
'''
rep("\nconst streakGeo = ", SH+"\nconst streakGeo = ")
# wave geometry: give it uvs; wave material: the lit shader
rep("geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; })();",
    "geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); const UVw = []; for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) UVw.push(i / NU, j / NV); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UVw, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; })();")
rep("const m = A.add(new THREE.Mesh(waveGeo, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide, emissive: 0x16305e }))); m.visible = false;",
    "const m = A.add(new THREE.Mesh(waveGeo, new THREE.ShaderMaterial({ uniforms: { op: { value: 0.9 }, tm: { value: 0 } }, vertexShader: VS_WAVE, fragmentShader: F_WAVE, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;")
rep("m.scale.set(o.wFn ? o.wFn(a / d) : (o.w || 1.3), Math.max(0.01, hh), (o.len || 1.0) * (0.7 + 0.3 * rise)); m.material.opacity = 0.88 * Math.min(1, sink * 1.5); });",
    "m.scale.set(o.wFn ? o.wFn(a / d) : (o.w || 1.3), Math.max(0.01, hh), (o.len || 1.0) * (0.7 + 0.3 * rise)); m.material.uniforms.op.value = 0.95 * Math.min(1, sink * 1.5); m.material.uniforms.tm.value = t; });")
# wave: drops thrown off the lip too
rep("n: 2, r: (o.w || 1.3) * 0.45, h: 0.15, size: 0.16, dur: 0.4, op: 0.5, rise: 0.25, seed: i * 7 + 3 }); }",
    "n: 2, r: (o.w || 1.3) * 0.45, h: 0.15, size: 0.14, dur: 0.4, op: 0.45, rise: 0.25, seed: i * 7 + 3 }); if (i % 2 === 0) FX.drops(A, { t: ts, at: (tt) => { const p = posAt(ts), y = dirAt(ts); return [p.x + Math.sin(y) * 0.25 * (o.len || 1), (o.h || 0.8) * 1.0, p.z + Math.cos(y) * 0.25 * (o.len || 1)]; }, n: 5, sp: (o.w || 1.3) * 0.5, up: 1.0, size: 0.035, dur: 0.45, dir: [Math.sin(dirAt(ts)), Math.cos(dirAt(ts))], seed: i * 5 + 1 }); }")
# wet trail behind the wave: a little stronger
rep("follow: true, w: (o.w || 1.3) * 0.9, op: 0.28, flow: 0 });", "follow: true, w: (o.w || 1.3) * 0.9, op: 0.34, flow: 0 });")
# ring wave: broken foam top, streaks
rep("const m = A.add(new THREE.Mesh(ringWallGeo, fxMat(C.cobalt, F_COL, { col2: C.foam }))); m.visible = false;\n  A.fx((t) => { const a = t - o.t, d = o.dur || 0.45;",
    "const m = A.add(new THREE.Mesh(ringWallGeo, fxMat(C.cobalt, F_COL2, { col2: C.foam }))); m.visible = false; m.material.uniforms.u1.value = 14;\n  A.fx((t) => { const a = t - o.t, d = o.dur || 0.45;")
rep("m.material.uniforms.op.value = (o.op || 0.7) * (1 - EASE.in(u)); m.material.uniforms.u0.value = -2.5; m.material.uniforms.tm.value = t; });\n  FX.ring(A, { t: o.t + 0.03, at: o.at, r0: o.r0 || 0.3, r1: (o.r1 || 2) * 1.05, dur: (o.dur || 0.45) * 1.1, col: C.foam, op: 0.7, w: 0.08, y: 0.02 });\n  FX.drops(A, { t: o.t + 0.05, at: (tt) => { const c = P3(A, o.at, o.t); return [c.x, 0.2, c.z]; }, n: 14,",
    "m.material.uniforms.op.value = (o.op || 0.85) * (1 - EASE.in(u)); m.material.uniforms.u0.value = 1.5; m.material.uniforms.tm.value = t; });\n  FX.ring(A, { t: o.t + 0.03, at: o.at, r0: o.r0 || 0.3, r1: (o.r1 || 2) * 1.05, dur: (o.dur || 0.45) * 1.1, col: C.sky, op: 0.7, w: 0.05, y: 0.02 });\n  FX.drops(A, { t: o.t + 0.05, at: (tt) => { const c = P3(A, o.at, o.t); return [c.x, 0.3, c.z]; }, n: 24,")
# column: streaks rising, a crown of foam on top, froth at its foot
rep("const m = A.add(new THREE.Mesh(colGeo, fxMat(C.cobalt, F_COL, { col2: C.foam }))); m.visible = false;\n  const cap = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshLambertMaterial({ color: C.foam, transparent: true, opacity: 0.8, depthWrite: false, emissive: '#3a4a58' }))); cap.visible = false;",
    "const m = A.add(new THREE.Mesh(colGeo, fxMat(C.cobalt, F_COL2, { col2: C.foam }))); m.visible = false; m.material.uniforms.u1.value = 6;\n  const cap = A.add(new THREE.Mesh(crownGeo, fxMat(C.foam, F_CROWN, { col2: C.foam }))); cap.visible = false; cap.material.uniforms.u0.value = 2.7;")
rep("m.position.set(c.x, 0, c.z); m.scale.set(r, Math.max(0.01, h * (o.fall ? down : 1)), r); m.material.uniforms.op.value = 0.72 * Math.min(1, down * 1.5); m.material.uniforms.u0.value = 3; m.material.uniforms.tm.value = t;\n    cap.position.set(c.x, h * (o.fall ? down : 1), c.z); cap.scale.set(r * 1.3, r * 0.7, r * 1.3); cap.material.opacity = 0.8 * down; });",
    "m.position.set(c.x, 0, c.z); m.scale.set(r, Math.max(0.01, h * (o.fall ? down : 1)), r); m.material.uniforms.op.value = 0.9 * Math.min(1, down * 1.5); m.material.uniforms.u0.value = -2.5; m.material.uniforms.tm.value = t;\n    cap.position.set(c.x, h * (o.fall ? down : 1) * 0.86, c.z); cap.scale.set(r * 1.25, r * 1.1, r * 1.25); cap.material.uniforms.op.value = 0.95 * down; cap.material.uniforms.tm.value = t; });\n  FX.pool(A, { t0: o.t, t1: o.t + (o.dur || 0.7) + 0.2, at: (tt) => { const c = P3(A, o.at, o.t); return [c.x, 0, c.z]; }, r: (o.r || 0.35) * 2.4, op: 0.5, froth: 1.2, fin: 0.08, fout: 0.3 });")
# wall: the skin shader
rep("const m = A.add(new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0.05 } }, vertexShader: VS_BUB, fragmentShader: F_BUB, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;\n  const lip",
    "const m = A.add(new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 } }, vertexShader: VS_SKIN, fragmentShader: GN_FIX(F_SKIN), transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;\n  const lip")
rep("m.material.uniforms.op.value = (o.op || 0.6) * Math.min(1, (o.t1 - t) / 0.2) * (0.5 + 0.5 * sink); lip.position.copy(m.position); lip.quaternion.copy(m.quaternion); lip.translateY(H * sink); lip.scale.set(o.w || 2, 1, (o.th || 0.18) * 1.4); lip.material.opacity = 0.65 * sink; });",
    "m.material.uniforms.op.value = Math.min(1, (o.op || 0.6) * 1.35) * Math.min(1, (o.t1 - t) / 0.2) * (0.5 + 0.5 * sink); m.material.uniforms.tm.value = t; lip.position.copy(m.position); lip.quaternion.copy(m.quaternion); lip.translateY(H * sink); lip.scale.set(o.w || 2, 1, (o.th || 0.18) * 1.4); lip.material.opacity = 0.0; });\n  for (let ts = o.t0 + 0.3; ts < Math.min(o.t1, o.fall != null ? o.fall : o.t1); ts += 0.12) FX.drops(A, { t: ts, at: (tt) => { const c = c0(ts), y = yawAt(ts), u = ((ts * 7.3) % 1) - 0.5; return [c.x + Math.cos(y) * u * (o.w || 2), (o.h || 1.3) * 0.98, c.z - Math.sin(y) * u * (o.w || 2)]; }, n: 2, sp: 0.15, up: 0.2, size: 0.03, dur: 0.45, seed: Math.floor(ts * 100) });")
# dome: skin shader
rep("FX.dome = (A, o) => { const m = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 36, 18, 0, 6.283, 0, Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0.1 } }, vertexShader: VS_BUB, fragmentShader: F_BUB, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;",
    "FX.dome = (A, o) => { const m = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, 6.283, 0, Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 0 }, tm: { value: 0 } }, vertexShader: VS_SKIN, fragmentShader: F_SKIN, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;")
rep("m.material.uniforms.op.value = ((o.op || 0.5) + 0.4 * fl) * Math.min(1, (o.t1 - t) / 0.25); });\n  FX.ring(A, { t: o.t0, at: o.at, r0: 0.2, r1: o.r || 2, dur: o.grow || 0.35, col: C.foam, op: 0.6, w: 0.06, e: 'out' });",
    "m.material.uniforms.op.value = Math.min(1, ((o.op || 0.5) * 1.5 + 0.4 * fl)) * Math.min(1, (o.t1 - t) / 0.25); m.material.uniforms.tm.value = t; });\n  FX.ring(A, { t: o.t0, at: o.at, r0: 0.2, r1: o.r || 2, dur: o.grow || 0.35, col: C.sky, op: 0.6, w: 0.05, e: 'out' });")
# bubble: the new skin
rep("const m = A.add(new THREE.Mesh(bubGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.bubble) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 } }, vertexShader: VS_BUB, fragmentShader: F_BUB, transparent: true, depthWrite: false }))); m.visible = false;",
    "const m = A.add(new THREE.Mesh(bubGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.bubble) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, tm: { value: 0 } }, vertexShader: VS_BUB2, fragmentShader: F_BUB2, transparent: true, depthWrite: false }))); m.visible = false;")
rep("m.material.uniforms.op.value = (o.op || 0.7) * (1 + 0.6 * fl) * (o.pop === false ? Math.min(1, (o.t1 - t) / 0.2) : 1); });",
    "m.material.uniforms.op.value = (o.op || 0.7) * (1 + 0.6 * fl) * (o.pop === false ? Math.min(1, (o.t1 - t) / 0.2) : 1); m.material.uniforms.tm.value = t; });")
s=s.replace("GN_FIX(F_SKIN)","F_SKIN")
open(f,'w').write(s); print('ok')
