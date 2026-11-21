p='tools/tc.js'; s=open(p).read()
R=[
# column: soft top when ln<0.5 (fountain jet melts into the white head)
("const F_COL2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv;",
 "const F_COL2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float ln; varying vec2 vUv;"),
("*(0.6+0.4*br)*smoothstep(0.0,0.06,y); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;\n// a comet tail",
 "*(0.6+0.4*br)*smoothstep(0.0,0.06,y); if(ln<0.5){ a*=1.0-smoothstep(top-0.3,top,y); c=mix(c,col2,smoothstep(top-0.45,top-0.1,y)*0.6); } gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;\n// a comet tail"),
("m.material.uniforms.op.value = (um ? 0.75 : 0.9) * Math.min(1, down * 1.5);",
 "m.material.uniforms.op.value = (um ? 0.75 : 0.9) * Math.min(1, down * 1.5); m.material.uniforms.ln.value = um ? 0 : 1;"),
# the fountain's landing splash is the pool's own froth rim, not the glass crown
("if (um) { um.visible = on; cap.visible = false; }","if (um) { um.visible = on; cap.visible = false; ft.visible = false; }"),
("ft.visible = true; ft.position.set(c.x, 0, c.z);","ft.visible = !um; ft.position.set(c.x, 0, c.z);"),
# whirl pool + froth: white foam splashes round the rim
("c=mix(c,vec3(0.6,0.8,1.0),glow*0.8); a=op*(0.85+0.15*r)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,glow*op*0.8); }",
 "c=mix(c,vec3(0.6,0.8,1.0),glow*0.8); a=op*(0.85+0.15*r)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,glow*op*0.8);\n      if(u0>1.1){ float rf=smoothstep(0.7,0.86,rn)*(1.0-smoothstep(0.95,1.0,rn))*smoothstep(0.42,0.58,fbm(p*15.0+vec2(tm*0.6,0.0))); c=mix(c,col2,rf); a=max(a,rf*min(1.0,op*2.2)); } }"),
]
for a,b in R:
    assert a in s, a[:70]; s=s.replace(a,b)
open(p,'w').write(s)
