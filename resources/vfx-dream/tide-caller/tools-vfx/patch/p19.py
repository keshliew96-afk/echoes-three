p='tools/tc.js'; s=open(p).read()
R=[
# thinner, brighter strands with bead highlights near the ends
("float n=fbm(q*7.0+vec2(v*2.5-tm*2.2,0.0)); float fine=fbm(q*22.0+vec2(v*4.0-tm*3.0,3.0));\n    float strands=smoothstep(0.42,0.62,n)*(0.55+0.45*smoothstep(0.4,0.6,fine));",
 "float n=fbm(q*13.0+vec2(v*2.0-tm*2.2,0.0)); float fine=fbm(q*30.0+vec2(v*5.0-tm*3.0,3.0));\n    float strands=smoothstep(0.5,0.62,n)*(0.5+0.5*smoothstep(0.45,0.6,fine)); float core=smoothstep(0.58,0.7,n);"),
("c=mix(c,vec3(0.15,0.4,0.9),smoothstep(0.5,1.0,v)*0.6);\n    float head",
 "c=mix(c,vec3(0.15,0.4,0.9),smoothstep(0.5,1.0,v)*0.6); c=mix(c,vec3(0.85,0.95,1.0),core*0.7);\n    float head"),
("float a=op*max(strands*brk,head*0.92); if(a<0.02) discard;",
 "float a=op*max(strands*brk*(0.55+0.45*core),head*0.92); if(a<0.02) discard;"),
# jet narrower and lighter under the umbrella
("m.position.set(c.x, 0, c.z); m.scale.set(r, Math.max(0.01, h * (o.fall ? down : 1)), r); m.material.uniforms.op.value = 0.9 * Math.min(1, down * 1.5);",
 "m.position.set(c.x, 0, c.z); const jr = um ? r * 0.72 : r; m.scale.set(jr, Math.max(0.01, h * (o.fall ? down : 1)), jr); m.material.uniforms.op.value = (um ? 0.75 : 0.9) * Math.min(1, down * 1.5);"),
# landing splash crown moves out to where the strands land
("ft.visible = true; ft.position.set(c.x, 0, c.z); ft.scale.set(r * 1.3, 0.3 * up, r * 1.3);",
 "ft.visible = true; ft.position.set(c.x, 0, c.z); const fr = um ? r * 2.1 : r * 1.3; ft.scale.set(fr, (um ? 0.22 : 0.3) * up, fr);"),
]
for a,b in R:
    assert a in s, a[:60]; s=s.replace(a,b)
open(p,'w').write(s)
