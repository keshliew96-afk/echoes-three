p='tools/tc.js'; s=open(p).read()
R=[
("float head=1.0-smoothstep(0.06,0.22,v+0.12*(fine-0.5));","float head=1.0-smoothstep(0.16,0.34,v+0.14*(fine-0.5));"),
("ft.material.uniforms.op.value = (um ? 0.6 : 0.95) * down;","ft.material.uniforms.op.value = (um ? 0.8 : 0.95) * down; if (um) ft.material.uniforms.col.value.set(C.sky);"),
("n: 7, sp: (o.r || 0.35) * 3.2, up: 0.9, size: 0.04, dur: 0.6, seed: i * 31 });","n: o.umbrella === false ? 7 : 12, sp: (o.r || 0.35) * (o.umbrella === false ? 3.2 : 4.4), up: o.umbrella === false ? 0.9 : 1.2, size: 0.04, dur: 0.6, seed: i * 31 });"),
]
for a,b in R:
    assert a in s, a[:60]; s=s.replace(a,b)
open(p,'w').write(s)
