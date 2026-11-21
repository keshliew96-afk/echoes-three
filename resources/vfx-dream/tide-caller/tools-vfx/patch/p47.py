p='tools/tc.js'; s=open(p).read()
i=s.index("// a slab of water on edge")
add='''// a waterspout 水龙卷 (Kesh's three refs, 20 Nov): a twisting funnel, thin at the floor and wide at the top, spiral streaks and white foam
// ribbons racing up and round it, a looser outer skin turning faster, spray thrown off its lip, a small whirl at its foot.
// o: t, dur, at (follow), h, r (top radius), rise
const F_SPOUT = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float y=vUv.y, x=vUv.x; vec2 q=vec2(cos(x*6.2832),sin(x*6.2832)); float sp=x*u1+y*3.2-tm*2.6*u1/3.0;
    float n=fbm(q*2.0+vec2(y*5.0-tm*1.5, sp*0.3)); float st=smoothstep(0.5,0.72,fbm(vec2(sp*4.0, y*2.0)+q*0.7)); float rb=smoothstep(0.4,0.47,abs(fract(sp*0.5+0.15*(n-0.5))-0.5));
    vec3 c=mix(vec3(0.04,0.15,0.5),col,0.45+0.45*y); c=mix(c,vec3(0.62,0.82,0.98),st*0.6); c=mix(c,col2,rb*(0.55+0.45*y));
    float a=op*smoothstep(0.0,0.06,y)*(1.0-smoothstep(0.86,1.0,y+0.08*(n-0.5)))*(u0+(1.0-u0)*max(st,rb)); if(y>u0*0.0+1.0) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
const spoutGeo = (() => { const pts = []; for (let k = 0; k <= 24; k++) { const y = k / 24; pts.push(new THREE.Vector2(0.2 + 0.8 * Math.pow(y, 1.7), y)); } return new THREE.LatheGeometry(pts, 40); })();
FX.spout = (A, o) => {
  const mk = (sc, solid, turn) => { const g = spoutGeo.clone(), P0 = g.attributes.position.array.slice(), m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_SPOUT, { col2: C.foam }))); m.visible = false; m.material.uniforms.u0.value = solid; m.material.uniforms.u1.value = turn; m.frustumCulled = false; return { m, g, P0, sc }; };
  const L = [mk(0.72, 0.75, 3.0), mk(1.0, 0.25, 4.5)], H = o.h || 2.0, R = o.r || 0.5, dur = o.dur || 2, rise = o.rise || 0.35;
  A.fx((t) => { const a = t - o.t, on = a >= 0 && a <= dur; for (const l of L) l.m.visible = on; if (!on) return; const c = P3(A, o.at, o.follow ? t : o.t), k = EASE.out(clamp(a / rise)) * (a > dur - 0.3 ? 1 - EASE.in((a - dur + 0.3) / 0.3) : 1);
    for (const l of L) { const pa = l.g.attributes.position; for (let v = 0; v < pa.count; v++) { const x = l.P0[v * 3], y = l.P0[v * 3 + 1], z = l.P0[v * 3 + 2], sw = 0.18 * y * y * Math.sin(t * 2.2 + y * 2.5), sw2 = 0.12 * y * Math.cos(t * 1.7 + y * 3.1);
        pa.setXYZ(v, c.x + x * R * l.sc * (0.6 + 0.4 * k) + sw, y * H * k, c.z + z * R * l.sc * (0.6 + 0.4 * k) + sw2); } pa.needsUpdate = true;
      l.m.material.uniforms.tm.value = t; l.m.material.uniforms.op.value = (l.sc < 1 ? 0.85 : 0.6) * Math.min(1, k * 1.4); } });
  FX.pool(A, { t0: o.t, t1: o.t + dur, at: (tt) => { const c = P3(A, o.at, o.follow ? tt : o.t); return [c.x, 0, c.z]; }, follow: true, r: R * 1.1, whirl: 1.3, op: 0.45, fin: 0.15, fout: 0.3 });
  for (let ts = o.t + rise; ts < o.t + dur - 0.3; ts += 0.12) FX.drops(A, { t: ts, at: (tt) => { const c = P3(A, o.at, o.follow ? ts : o.t), an = ts * 9.1; return [c.x + Math.cos(an) * R * 0.9 + 0.18 * Math.sin(ts * 2.2 + 2.5), H * 0.95, c.z + Math.sin(an) * R * 0.9]; }, n: 3, sp: 0.5, up: 0.4, size: 0.03, dur: 0.5, seed: Math.floor(ts * 100) + 9 });
};
'''
s=s[:i]+add+s[i:]
open(p,'w').write(s)
