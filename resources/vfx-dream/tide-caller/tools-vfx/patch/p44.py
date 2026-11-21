p='tools/tc.js'; s=open(p).read()
i=s.index("// a ring wall of water that breaks outward from a point (Breaker)")
add='''// one tsunami that grows and curls over (Surge's Overhead, Kesh's growth strip, 20 Nov): a thin ripple rises into a tongue leaning
// toward her, its top curls into a round barrel with a white foam head, and that white head keeps curling over her and comes down
// behind her; then the body pours over after it. The wave is a spine in its own plane (x along the throw, y up), swept across its
// width with a lens-shaped section: thin at the base, a full round head. o: t (the curl starts over), stand (the growing time
// before t), dur (head over to the landing), from (its base), to (where the head lands), w, out (the pour after landing)
const VS_CURL = `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const F_CURL = `uniform float op; uniform float tm; uniform float u0; uniform float u1; varying vec2 vUv; varying vec3 vN; varying vec3 vW; ${GN}
  void main(){ float s=vUv.x, v=vUv.y; float inner=step(0.5,v); float n=fbm(vW.xz*2.5+vec2(s*5.0,tm*0.8)); if(s<u0+0.08*(n-0.5)) discard;
    vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; float lit=0.62+0.38*max(0.0,dot(N,normalize(vec3(0.3,1.0,0.45))));
    float st=smoothstep(0.55,0.75,fbm(vec2(s*16.0-tm*3.0, v*10.0))); float st2=smoothstep(0.62,0.8,fbm(vec2(s*30.0-tm*4.0+5.0, v*22.0)));
    vec3 deep=vec3(0.04,0.14,0.48), cob=vec3(0.13,0.42,0.92), sky=vec3(0.62,0.8,0.96), foam=vec3(0.9,0.95,0.97);
    vec3 c=mix(deep,cob,smoothstep(0.0,0.55,s)*(1.0-0.45*inner)); c=mix(c,sky,st*0.45); c=mix(c,foam,st2*0.35*smoothstep(0.2,0.6,s));
    float fm=smoothstep(u1-0.06,u1+0.1,s+0.22*(n-0.5)); fm*=1.0-0.45*inner; c=mix(c,foam,fm);
    float foot=1.0-smoothstep(0.0,0.07,s+0.05*(n-0.5)); c=mix(c,foam,foot*0.55);
    c*=lit; gl_FragColor=vec4(c,op*(0.86+0.14*fm)); }`;
FX.curlwave = (A, o) => {
  const NS = 72, NM = 28, g = new THREE.BufferGeometry(), P = new Float32Array((NS + 1) * (NM + 1) * 3), UV = new Float32Array((NS + 1) * (NM + 1) * 2), idx = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NM; j++) { const k = i * (NM + 1) + j; UV[k * 2] = i / NS; UV[k * 2 + 1] = j / NM; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NM; j++) { const a = i * (NM + 1) + j, b = a + NM + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setIndex(idx);
  const m = A.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { op: { value: 0.92 }, tm: { value: 0 }, u0: { value: -1 }, u1: { value: 0.7 } }, vertexShader: VS_CURL, fragmentShader: F_CURL, transparent: true, depthWrite: true, side: THREE.DoubleSide }))); m.visible = false; m.renderOrder = 2;
  const a0 = V3(o.from), a1 = V3(o.to), dv = a1.clone().sub(a0), D = dv.length(), fw = dv.clone().normalize(), sd = new THREE.Vector3(-fw.z, 0, fw.x), Wf = o.w || 2.0;
  // the stages (Kesh's strip): ripple, tongue, leaning tongue tipping over, barrel with its white head, then the head curled over her
  //            L     thb   thm   curl  sc    th     W     foam
  const KEY = [[0.5,  4,    8,    0,    0.6,  0.05,  0.5,  0.35],
               [1.0,  10,   38,   0,    0.6,  0.14,  0.7,  0.6],
               [1.7,  18,   72,   70,   0.5,  0.3,   0.88, 0.68],
               [2.6,  30,   100,  235,  0.42, 0.5,   1.0,  0.66],
               [1.0,  72,   92,   205,  0.28, 0.55,  1.0,  0.62]];
  const key = (q) => { const i = Math.min(3, Math.floor(q)), f = sm(q - i); return KEY[i].map((v, c) => v + (KEY[i + 1][c] - v) * f); };
  const spine = (L, thb, thm, C, sc) => { const pts = [[0, 0]]; let x = 0, y = 0; for (let i = 1; i <= NS; i++) { const s = (i - 0.5) / NS, th = (thb + (thm - thb) * sm(Math.min(1, s / 0.35)) - C * Math.pow(Math.max(0, (s - sc) / (1 - sc)), 1.4)) * D2R; x += Math.cos(th) * L / NS; y += Math.sin(th) * L / NS; pts.push([x, y]); } return pts; };
  const st = o.stand || 0.5, du = o.dur || 0.9, out = o.out || 0.45;
  A.fx((t) => { const a = t - o.t; m.visible = a >= -st && a <= du + out; if (!m.visible) return;
    const q = a < 0 ? 3 * clamp((a + st) / st) : 3 + EASE.io2(clamp(a / du)); const [L0, thb, thm, C, sc, th0, w0, fs] = key(q);
    let pts = spine(1, thb, thm, C, sc), L = L0, shear = 0; const kq = clamp(q - 3);
    if (kq > 0) { const xs = pts[NS][0], ys = pts[NS][1], Lthrow = D / Math.max(0.2, xs); L = L0 * (1 - kq) * 2.6 + Lthrow * kq; if (q - 3 < 1e-3) L = 2.6; shear = ys * kq * kq; }
    else L = L0;
    const W = Wf * w0, H = (i) => { const s = i / NS; return th0 * (0.22 + 0.78 * s) * Math.sqrt(clamp((1 - s) / 0.1)) * (0.55 + 0.45 * Math.sqrt(clamp(s / 0.25))); };
    // normals of the spine in its plane, then the lens section across the width
    for (let i = 0; i <= NS; i++) { const p = pts[i], pn = pts[Math.min(NS, i + 1)], pp = pts[Math.max(0, i - 1)], tx = pn[0] - pp[0], ty = pn[1] - pp[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      const sx = p[0] * L, sy = (p[1] - shear * (p[0] / Math.max(1e-3, pts[NS][0]))) * L, h = H(i);
      for (let j = 0; j <= NM; j++) { const v = j / NM, side = v < 0.5 ? 1 : -1, z = v < 0.5 ? (v * 4 - 1) : (3 - v * 4), cz = Math.pow(Math.max(0, 1 - z * z), 0.55), hz = 0.8 + 0.2 * cz;
        const lx = sx * hz + nx * side * h * 0.5 * cz, ly = Math.max(0, sy * hz + ny * side * h * 0.5 * cz), lz = z * W * 0.5, k = (i * (NM + 1) + j) * 3;
        P[k] = a0.x + fw.x * lx + sd.x * lz; P[k + 1] = ly; P[k + 2] = a0.z + fw.z * lx + sd.z * lz; } }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    const U = m.material.uniforms; U.tm.value = t; U.u1.value = fs; U.u0.value = a > du ? -0.1 + 1.15 * EASE.in(clamp((a - du) / out)) : -1; U.op.value = 0.92 * (a > du + out * 0.7 ? 1 - (a - du - out * 0.7) / (out * 0.3) : 1); });
  // spray off the white head as it curls over
  for (let ts = o.t; ts < o.t + du; ts += 0.08) FX.drops(A, { t: ts, at: (tt) => { const u = EASE.io2(clamp((ts - o.t) / du)), x = D * u * 0.92 + 0.6 * (1 - u), y = Math.sin(Math.PI * u) * 2.0 + 0.9 * (1 - u); return [a0.x + fw.x * x, y, a0.z + fw.z * x]; }, n: 4, sp: Wf * 0.45, up: 0.5, size: 0.035, dur: 0.45, seed: Math.floor(ts * 100) + 3 });
};
'''
s=s[:i]+add+s[i:]
open(p,'w').write(s)
