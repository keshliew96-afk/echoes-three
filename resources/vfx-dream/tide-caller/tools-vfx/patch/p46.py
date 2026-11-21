p='tools/tc.js'; s=open(p).read()
rp=[
("const F_FALL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm;",
 "const F_FALL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float rnd;"),
("float ef=step(0.5,abs(vNo.x)); float x=mix(vP.x*3.0+vP.z, vP.z*2.0+vP.x*7.0, ef);",
 "float ef=step(0.5,abs(vNo.x))*(1.0-rnd); float x=mix(mix(vP.x*3.0+vP.z, vP.z*2.0+vP.x*7.0, ef), atan(vP.z,vP.x)*1.3, rnd);"),
("float side=mix(1.0-smoothstep(0.42,0.5,abs(vP.x)+0.07*(n-0.5)), 1.0-smoothstep(0.36,0.5,abs(vP.z)+0.08*(n-0.5)), ef);",
 "float side=mix(mix(1.0-smoothstep(0.42,0.5,abs(vP.x)+0.07*(n-0.5)), 1.0-smoothstep(0.36,0.5,abs(vP.z)+0.08*(n-0.5)), ef), 1.0, rnd);"),
("  const m = A.add(new THREE.Mesh(slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 } }, vertexShader: VS_WALL, fragmentShader: F_FALL,",
 "  // o.round: a round fall (Sky Fall), w is its width across\n  const m = A.add(new THREE.Mesh(o.round ? cylFallGeo : slabGeo, new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 }, rnd: { value: o.round ? 1 : 0 } }, vertexShader: VS_WALL, fragmentShader: F_FALL,"),
("m.scale.set(W, Math.max(0.01, Ht), Math.max(0.02, val(o.th, t, 0.2)));",
 "m.scale.set(W, Math.max(0.01, Ht), o.round ? W : Math.max(0.02, val(o.th, t, 0.2)));"),
("follow: true, r: W * 0.62, sx: 1, sz: 0.42,", "follow: true, r: W * (o.round ? 0.8 : 0.62), sx: 1, sz: o.round ? 1 : 0.42,"),
("const c = c0(ts), y = yawAt(ts), u = ((ts * 7.3) % 1) - 0.5; return [c.x + Math.cos(y) * u * W * 0.9, 0.06, c.z - Math.sin(y) * u * W * 0.9];",
 "const c = c0(ts), y = yawAt(ts), u = ((ts * 7.3) % 1) - 0.5; if (o.round) { const an = ts * 23.7; return [c.x + Math.cos(an) * W * 0.5, 0.06, c.z + Math.sin(an) * W * 0.5]; } return [c.x + Math.cos(y) * u * W * 0.9, 0.06, c.z - Math.sin(y) * u * W * 0.9];"),
("const FX_FALL_END = 0;", "const FX_FALL_END = 0;"),
]
for a,b in rp:
    if a=="const FX_FALL_END = 0;": continue
    assert a in s, a[:50]; s=s.replace(a,b)
i=s.index("// a waterfall (Kesh, 20 Nov: no walls;")
s=s[:i]+"const cylFallGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1, true); cylFallGeo.translate(0, 0.5, 0);\n"+s[i:]
open(p,'w').write(s)
