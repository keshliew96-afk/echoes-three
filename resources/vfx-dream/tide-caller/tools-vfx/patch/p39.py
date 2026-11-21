p='tools/tc.js'; s=open(p).read()
# the head is rebuilt each frame from its stage (bud -> opens -> rim curls down -> spout -> spreads and breaks)
a=s[s.index("const umbGeo = new THREE.LatheGeometry("):]; a=a[:a.index("\n")+1]
b='''const UMB_S = 64, UMB_P = 12; // the fountain head's lathe: 64 round, 12 along the sheet from the centre to the rim
const umbGeoNew = () => new THREE.LatheGeometry(Array.from({ length: UMB_P }, (_, j) => new THREE.Vector2(j / (UMB_P - 1), 0)), UMB_S);
// one stage k (0..1) of the head, in metres from the jet top: R the rim reach, th the rim's angle (up = a bud, down = curled over)
const umbProf = (k, rr) => { const e = EASE.out(clamp(k / 0.85)), R = rr * (0.35 + 1.45 * e), th = k < 0.6 ? lerp(1.15, -1.05, sm(clamp(k / 0.6))) : lerp(-1.05, -0.7, clamp((k - 0.6) / 0.4)); const out = []; let x = 0, y = 0; const ds = R / (UMB_P - 1);
  for (let j = 0; j < UMB_P; j++) { out.push([x, y]); const ph = th * Math.pow((j + 0.5) / (UMB_P - 1), 1.4); x += ds * Math.cos(ph); y += ds * Math.sin(ph); } return out; };
const umbSet = (g, prof, y0) => { const pa = g.attributes.position; let k = 0; for (let i = 0; i <= UMB_S; i++) { const ph = i / UMB_S * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph); for (let j = 0; j < UMB_P; j++) { const [x, y] = prof[j]; pa.setXYZ(k++, x * sn, y0 + y, x * cs); } } pa.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); };
'''
s=s.replace(a,b)
# the head's shader: the stage (u0) breaks the rim up as it spreads
i=s.index("const F_UMB = `"); j=s.index("const F_FOAMT = `")
new='''// a fountain's head (u around, v from the centre to the rim; u0 the stage): light water swirling out, a ragged white foam rim that breaks into drops as it spreads
const F_UMB = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float v=vUv.y; vec2 q=vec2(cos(vUv.x*6.2832),sin(vUv.x*6.2832)); float n=fbm(q*5.0+vec2(v*3.0-tm*1.2,0.0)); float fine=fbm(q*24.0+vec2(v*9.0-tm*2.0,3.0)); float lump=fbm(q*7.0+vec2(tm*0.4,1.0));
    float sw=smoothstep(0.5,0.7,fbm(vec2(vUv.x*28.0+v*7.0-tm*0.8,v*3.0)));
    vec3 c=mix(vec3(0.52,0.78,1.0),vec3(0.3,0.6,1.0),smoothstep(0.2,0.6,v)); c=mix(c,vec3(0.8,0.92,1.0),sw*0.3);
    float rim=smoothstep(0.55,0.62,v+0.18*(lump-0.5)+0.04*(fine-0.5)); float top=(1.0-smoothstep(0.0,0.12,v))*smoothstep(0.45,0.6,fine); c=mix(c,col2,max(rim,top));
    float brk=smoothstep(0.98-0.35*u0,1.0-0.2*u0,v+0.25*(fine-0.5)); if(brk>0.5 && fine<0.5+0.2*u0) discard;
    float a=op*mix(0.92,1.0,rim)*(1.0-smoothstep(0.9,1.0,v+0.1*(n-0.5))); if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
'''
s=s[:i]+new+s[j:]
a="const um = o.umbrella === false ? null : A.add(new THREE.Mesh(umbGeo, fxMat(C.cobalt, F_UMB, { col2: C.foam })));"
b="const um = o.umbrella === false ? null : A.add(new THREE.Mesh(umbGeoNew(), fxMat(C.cobalt, F_UMB, { col2: C.foam }))); if (um) um.frustumCulled = false;\n  const sp = o.umbrella === false ? null : A.add(new THREE.Mesh(colGeo, fxMat(C.cobalt, F_COL2, { col2: C.foam }))); if (sp) { sp.visible = false; sp.material.uniforms.u1.value = 6; sp.material.uniforms.ln.value = 0; sp.renderOrder = 4; }"
assert a in s; s=s.replace(a,b)
a="if (um) { const hh2 = Math.max(0.01, h * (o.fall ? down : 1)), op2 = clamp((a - 0.06) / 0.15); um.position.set(c.x, 0, c.z); um.scale.set(r * 0.72 * (0.5 + 0.5 * op2), hh2, r * 0.72 * (0.5 + 0.5 * op2)); um.material.uniforms.op.value = 0.9 * op2 * down; um.material.uniforms.tm.value = t; }"
b="""if (um) { const hh2 = Math.max(0.01, h * (o.fall ? down : 1)), op2 = clamp((a - 0.04) / 0.1), k = clamp((a - 0.06) / (d * 0.8)); um.position.set(c.x, 0, c.z); umbSet(um.geometry, umbProf(k, (o.r || 0.35) * 1.75), hh2 * 0.97);
      um.material.uniforms.op.value = 0.95 * op2 * down; um.material.uniforms.u0.value = k; um.material.uniforms.tm.value = t;
      // the little spout that rises out of the opened head (stage 4 on), white at its tip
      const spk = sm(clamp((k - 0.45) / 0.3)); sp.visible = spk > 0.01; sp.position.set(c.x, hh2 * 0.95, c.z); sp.scale.set(r * 0.2, Math.max(0.01, h * 0.22 * spk * (1 - 0.4 * clamp((k - 0.85) / 0.15))), r * 0.2); sp.material.uniforms.op.value = 0.95 * down; sp.material.uniforms.u0.value = -3.0; sp.material.uniforms.tm.value = t; }"""
assert a in s; s=s.replace(a,b)
a="if (um) { um.visible = on; cap.visible = false; ft.visible = false; }"
b="if (um) { um.visible = on; cap.visible = false; ft.visible = false; } if (sp && !on) sp.visible = false;"
assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
