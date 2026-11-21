p='tools/tc.js'; s=open(p).read()
R=[
("float strands=smoothstep(0.5,0.62,n)*(0.5+0.5*smoothstep(0.45,0.6,fine));","float strands=smoothstep(0.44,0.58,n)*(0.5+0.5*smoothstep(0.45,0.6,fine));"),
("vec3 c=mix(col2,vec3(0.45,0.7,1.0),smoothstep(0.1,0.7,v)); c=mix(c,vec3(0.15,0.4,0.9),smoothstep(0.5,1.0,v)*0.6);",
 "vec3 c=mix(col2,vec3(0.3,0.58,1.0),smoothstep(0.08,0.5,v)); c=mix(c,vec3(0.1,0.32,0.88),smoothstep(0.4,1.0,v)*0.75);"),
("const fr = um ? r * 2.1 : r * 1.3; ft.scale.set(fr, (um ? 0.22 : 0.3) * up, fr); ft.material.uniforms.op.value = 0.95 * down;",
 "const fr = um ? r * 2.1 : r * 1.3; ft.scale.set(fr, (um ? 0.14 : 0.3) * up, fr); ft.material.uniforms.op.value = (um ? 0.6 : 0.95) * down;"),
("r: (o.r || 0.35) * 2.2, op: 0.2, froth: 1.2, fin: 0.08, fout: 0.3 });",
 "r: (o.r || 0.35) * 2.2, op: o.umbrella === false ? 0.2 : 0.32, froth: 1.2, whirl: o.umbrella === false ? 0 : 0.45, fin: 0.08, fout: 0.3 });"),
]
for a,b in R:
    assert a in s, a[:60]; s=s.replace(a,b)
open(p,'w').write(s)
