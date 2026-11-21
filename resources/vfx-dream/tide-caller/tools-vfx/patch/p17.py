import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:100]); sys.exit(1)
    s=s.replace(a,b)
# fountain: the jet widens as it rises, opens at the top into an umbrella of falling strands
R("const colGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);",
  "const colGeo = new THREE.CylinderGeometry(1, 0.7, 1, 32, 1, true);\n"
  "const umbGeo = new THREE.LatheGeometry([[0.12, 1.0], [0.45, 1.07], [0.85, 1.04], [1.2, 0.92], [1.5, 0.74], [1.72, 0.52], [1.86, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 64);\n"
  "// a fountain's umbrella (u around, v from the top out and down): strands of water radiating and falling, white near the top, breaking into drops at the ends\n"
  "const F_UMB = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float tm; varying vec2 vUv; ${GN}\n"
  "  void main(){ float v=vUv.y; vec2 q=vec2(cos(vUv.x*6.2832),sin(vUv.x*6.2832)); float n=fbm(q*7.0+vec2(v*2.5-tm*2.2,0.0)); float fine=fbm(q*22.0+vec2(v*4.0-tm*3.0,3.0));\n"
  "    float strands=smoothstep(0.42,0.62,n)*(0.55+0.45*smoothstep(0.4,0.6,fine)); float brk=1.0-smoothstep(0.55,0.95,v+0.25*(fine-0.5));\n"
  "    vec3 c=mix(col2,vec3(0.45,0.7,1.0),smoothstep(0.1,0.7,v)); c=mix(c,vec3(0.15,0.4,0.9),smoothstep(0.5,1.0,v)*0.6);\n"
  "    float a=op*strands*brk*smoothstep(0.0,0.08,v); if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;")
R("const ft = A.add(new THREE.Mesh(crownGeo, fxMat(C.cobalt, F_CROWN, { col2: C.foam }))); ft.visible = false; ft.material.uniforms.u0.value = 4.1;",
  "const ft = A.add(new THREE.Mesh(crownGeo, fxMat(C.cobalt, F_CROWN, { col2: C.foam }))); ft.visible = false; ft.material.uniforms.u0.value = 4.1;\n"
  "  const um = o.umbrella === false ? null : A.add(new THREE.Mesh(umbGeo, fxMat(C.cobalt, F_UMB, { col2: C.foam }))); if (um) um.visible = false;")
R("m.visible = cap.visible = ft.visible = on; if (!on) return;","m.visible = cap.visible = ft.visible = on; if (um) um.visible = on; if (!on) return;")
R("cap.position.set(c.x, h * (o.fall ? down : 1) * 0.92, c.z); cap.scale.set(r * 1.2, r * 1.0, r * 1.2);",
  "cap.position.set(c.x, h * (o.fall ? down : 1) * 0.97, c.z); cap.scale.set(r * 0.8, r * 0.9, r * 0.8);\n"
  "    if (um) { const hh2 = Math.max(0.01, h * (o.fall ? down : 1)), op2 = clamp((a - 0.06) / 0.15); um.position.set(c.x, 0, c.z); um.scale.set(r * (0.6 + 0.4 * op2), hh2, r * (0.6 + 0.4 * op2)); um.material.uniforms.op.value = 0.9 * op2 * down; um.material.uniforms.tm.value = t; }")
# the column itself: more aerated, broken edges
R("float a=op*(0.5+0.35*y+0.3*st+0.3*lip)*smoothstep(0.0,0.06,y); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;",
  "float br=smoothstep(0.25,0.5,fbm(vec2(vUv.x*u1*3.0, y*3.0-tm*u0*0.8))); float a=op*(0.35+0.3*y+0.45*st+0.3*lip)*(0.6+0.4*br)*smoothstep(0.0,0.06,y); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;")
R("c=mix(c,vec3(0.78,0.9,1.0),st*0.5);","c=mix(c,vec3(0.82,0.93,1.0),st*0.75);")
# water lands round the jet: froth ring further out, more spray thrown out from the top
R("r: (o.r || 0.35) * 1.25, op: 0.4, froth: 1.2","r: (o.r || 0.35) * 2.2, op: 0.3, froth: 1.2")
R("return [c.x, (typeof o.h === 'function' ? o.h(tt) : (o.h || 1.6)) * 0.95, c.z]; }, n: 4, sp: 0.9, up: 0.8, size: 0.04, dur: 0.55, seed: i * 31 });",
  "return [c.x, (typeof o.h === 'function' ? o.h(tt) : (o.h || 1.6)) * 0.95, c.z]; }, n: 7, sp: (o.r || 0.35) * 3.2, up: 0.9, size: 0.04, dur: 0.6, seed: i * 31 });")
open(p,'w').write(s); print('p17 ok')
