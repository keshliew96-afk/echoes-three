p='tools/tc.js'; s=open(p).read()
i=s.index("FX.wall = (A, o) => {"); j=s.index("// a dome of water round a point")
old=s[i:j]
# Sever's flat sheet keeps the old slab (no crest); every wall becomes a waterfall
sheet=old.replace("FX.wall = (A, o) => {","// a thin flat sheet of water on edge (Jet's Sever): the old slab, kept only for that\nFX.sheet = (A, o) => {").replace("const cr = o.crest === false ? null :","const cr = true ? null :")
fall='''// a waterfall (Kesh, 20 Nov: no walls; anything that needs a wall is water falling from the sky): a sheet pouring from out of sight
// onto a line, streaks racing down, a foaming pool, splashes and ripples where it lands.
// o: t0, t1, at, yaw (deg or fn, rad), w, top (the height it falls from, or fn), th (thickness, or fn), op, rise (the first water
// falling to the floor), cut (the sky stops: the last water falls), tip / tipDur / fallDir (it topples forward), follow, col, bub
const F_FALL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec3 vNo; varying vec3 vP; varying vec2 vUv; ${GN}
  void main(){ if(abs(vNo.y)>0.5) discard; float y=vP.y; if(y<u0-0.002||y>u1) discard; float x=vP.x*3.0+vP.z;
    float sp=tm*2.4; float n=fbm(vec2(x*5.0, y*2.0+sp)); float st=smoothstep(0.55,0.75,fbm(vec2(x*16.0, y*1.0+sp*1.3))); float st2=smoothstep(0.64,0.8,fbm(vec2(x*34.0+3.0, y*0.7+sp*1.7)));
    float side=1.0-smoothstep(0.42,0.5,abs(vP.x)+0.07*(n-0.5));
    vec3 c=mix(vec3(0.05,0.2,0.62),col,0.5+0.5*n); c=mix(c,vec3(0.72,0.88,1.0),st*0.7); c=mix(c,col2,st2*0.85);
    float foot=1.0-smoothstep(0.0,0.1,y+0.06*(n-0.5)); c=mix(c,col2,foot*0.85); float lead=(1.0-smoothstep(u0,u0+0.05,y))*step(0.002,u0); c=mix(c,col2,lead*0.9);
    float sky=1.0-smoothstep(0.62,1.0,y); float a=op*side*sky*(0.65+0.35*max(max(st,st2),foot)); if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
FX.waterfall = (A, o) => {
  const m = A.add(new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 } }, vertexShader: VS_WALL, fragmentShader: F_FALL, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  const W = o.w || 2, rise = o.rise || 0.35, c0 = (t) => P3(A, o.at, o.follow ? t : o.t0), yawAt = (t) => typeof o.yaw === 'function' ? o.yaw(t) : (o.yaw || 0) * D2R;
  const val = (v, t, d) => typeof v === 'function' ? v(t) : (v != null ? v : d), landed = o.t0 + rise, endW = o.cut != null ? o.cut + 0.3 : o.t1;
  A.fx((t) => { const on = t >= o.t0 && t <= o.t1; m.visible = on; if (!on) return; const c = c0(t), a = t - o.t0, Ht = val(o.top, t, 3.4);
    let tip = 0; if (o.tip != null && t > o.tip) tip = EASE.in2(clamp((t - o.tip) / (o.tipDur || 0.4))) * (Math.PI / 2 - 0.05);
    m.position.set(c.x, 0, c.z); m.rotation.set(0, yawAt(t), 0, 'YXZ'); m.rotateX(tip * (o.fallDir || 1)); m.scale.set(W, Math.max(0.01, Ht), Math.max(0.02, val(o.th, t, 0.2)));
    m.material.uniforms.u0.value = 1 - EASE.in(clamp(a / rise)); m.material.uniforms.u1.value = o.cut != null && t > o.cut ? 1 - EASE.in(clamp((t - o.cut) / 0.3)) : 1;
    m.material.uniforms.op.value = Math.min(1, (o.op || 0.7) * 1.2) * Math.min(1, (o.t1 - t) / 0.15); m.material.uniforms.tm.value = t; });
  // where it lands: a foaming pool along its foot, splashes kicking up, a ring when the first water hits
  FX.pool(A, { t0: landed, t1: Math.min(o.t1, endW) + 0.25, at: (tt) => { const c = c0(tt); return [c.x, 0, c.z]; }, follow: true, r: W * 0.62, sx: 1, sz: 0.42, yaw: (tt) => yawAt(tt), op: 0.3, froth: 1.2, fin: 0.1, fout: 0.25 });
  FX.ring(A, { t: landed, at: (tt) => { const c = c0(landed); return [c.x, 0.02, c.z]; }, r0: 0.2, r1: W * 0.6, dur: 0.4, col: C.foam, op: 0.6, w: 0.15 });
  for (let ts = landed; ts < Math.min(o.t1, endW); ts += 0.09) FX.drops(A, { t: ts, at: (tt) => { const c = c0(ts), y = yawAt(ts), u = ((ts * 7.3) % 1) - 0.5; return [c.x + Math.cos(y) * u * W * 0.9, 0.06, c.z - Math.sin(y) * u * W * 0.9]; }, n: 3, sp: 0.45, up: 0.9, size: 0.035, dur: 0.4, seed: Math.floor(ts * 100) });
  // bubbles tumbling down in it (Bubble's soap-film fall)
  if (o.bub) for (let ts = o.t0 + 0.2; ts < Math.min(o.t1, endW) - 0.5; ts += 0.22) { const u = (((ts * 5.7) % 1) - 0.5) * 0.85; FX.bubble(A, { t0: ts, t1: ts + 0.75, r: 0.06, at: (tt) => { const c = c0(tt), y = yawAt(tt), k = clamp((tt - ts) / 0.75); return [c.x + Math.cos(y) * u * W, val(o.top, tt, 3.4) * 0.55 * (1 - k * k), c.z - Math.sin(y) * u * W]; } }); }
};
'''
s=s[:i]+sheet+fall+s[j:]
open(p,'w').write(s)
