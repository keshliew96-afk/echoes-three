f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:90], s.count(old))
    s=s.replace(old,new)
# wave: fade the sides and the low back so it reads as a curl, not a block; stronger streaks
rep("gl_FragColor=vec4(c, op*vC.a*(0.82+0.18*max(froth,st))); }`;",
    "float side=1.0-smoothstep(0.55,1.0,abs(vUv.x*2.0-1.0)+0.25*(fbm(vec2(vUv.y*8.0,tm))-0.5)); float back=smoothstep(0.0,0.45,vUv.y+0.15*fbm(vec2(vUv.x*12.0,tm*0.5)));\n    gl_FragColor=vec4(c, op*vC.a*side*mix(0.35,1.0,back)*(0.82+0.18*max(froth,st))); }`;")
rep("float st=smoothstep(0.55,0.85,fbm(vec2(vUv.x*26.0, vUv.y*3.0-tm*0.6)))*(0.4+0.6*face);", "float st=smoothstep(0.5,0.8,fbm(vec2(vUv.x*34.0, vUv.y*2.0-tm*0.6)))*(0.55+0.45*face);")
# ring/column walls: more streak contrast, a ragged top
rep("float top=0.86+0.14*fbm(vec2(vUv.x*u1*0.9,tm*0.7)); if(y>top) discard;", "float top=0.7+0.3*fbm(vec2(vUv.x*u1*1.2,tm*0.7)); if(y>top) discard;")
rep("float st=smoothstep(0.55,0.9,fbm(vec2(vUv.x*u1*3.0, y*1.2-tm*u0)))*(1.0-y*0.4);", "float st=smoothstep(0.48,0.75,fbm(vec2(vUv.x*u1*4.0, y*1.0-tm*u0)))*(1.0-y*0.3);")
rep("vec3 c=mix(col*0.45,col*1.15,smoothstep(0.0,0.75,y)); c=mix(c,mix(col,col2,0.65),st*0.7); c=mix(c,col2,lip*0.9);",
    "vec3 c=mix(vec3(0.05,0.18,0.55),col*1.2,smoothstep(0.0,0.75,y)); c=mix(c,vec3(0.78,0.9,1.0),st*0.8); c=mix(c,col2,lip*0.95);")
# bubble: a clearer blue rim
rep("float a=op*(0.06+0.7*rim+0.45*sw); gl_FragColor=vec4(c,clamp(max(a,spec*op),0.0,1.0)); }`;",
    "float a=op*(0.08+1.1*rim+0.6*sw); gl_FragColor=vec4(c,clamp(max(a,spec*op),0.0,1.0)); }`;")
rep("vec3 c=mix(col,vec3(0.25,0.5,0.95),0.6*rim);", "vec3 c=mix(col,vec3(0.2,0.45,0.95),0.85*rim);")
# geyser foot: a tighter, finer froth
rep("r: (o.r || 0.35) * 2.4, op: 0.5, froth: 1.2, fin: 0.08, fout: 0.3 });", "r: (o.r || 0.35) * 1.9, op: 0.5, froth: 1.2, fin: 0.08, fout: 0.3 });")
rep("smoothstep(0.35,0.62,fbm(p*10.0+tm*0.5));", "smoothstep(0.42,0.62,fbm(p*16.0+tm*0.5));")
# wall: thicker slab, deeper blue
rep("m.scale.set(o.w || 2, Math.max(0.01, H * sink), o.th || 0.18);", "m.scale.set(o.w || 2, Math.max(0.01, H * sink), (o.th || 0.18) * 1.9);")
rep("vec3 c=mix(col*0.85,col*1.25,y); c=mix(c,vec3(0.65,0.85,1.0),cs*0.65+run*0.5);", "vec3 c=mix(vec3(0.08,0.25,0.7),col*1.25,clamp(y,0.0,1.0)); c=mix(c,vec3(0.65,0.85,1.0),(u1>0.5? cs*0.5 : sh2)+run*0.5);")
# dome: soft flowing light bands in place of the cell web (no pole seam), glow at the rim
rep("vec2 q=u1>0.5? vec2(vP.x*2.5+vP.z*2.5, y*2.5) : vec2(atan(vP.z,vP.x)*3.0, y*4.0); float cs=caus(q*1.4+vec2(0.0,-tm*0.25), tm);",
    "vec2 q=u1>0.5? vec2(vP.x*2.5+vP.z*2.5, y*2.5) : vP.xz*2.2+vec2(y*1.5); float cs=u1>0.5? caus(q*1.4+vec2(0.0,-tm*0.25), tm) : 0.0; float sh2=u1>0.5? 0.0 : smoothstep(0.62,0.8,fbm(q*1.3+vec2(tm*0.15,-tm*0.1)))*0.8+smoothstep(0.5,0.9,fbm(q*4.0-tm*0.2))*0.3;")
rep("(0.06+0.6*pow(f,2.5)+0.45*cs+base)); gl_FragColor", "(0.07+0.75*pow(f,2.2)+0.35*sh2+base)); gl_FragColor")
# soaked: bigger drips, frothier puddle
rep("pu.material.uniforms.op.value = 0.5 * wet; pu.material.uniforms.u0.value = 0.5;", "pu.material.uniforms.op.value = 0.55 * wet; pu.material.uniforms.u0.value = 1.0;")
rep("pu.scale.setScalar(0.36 * dm.m.s / 0.82 *", "pu.scale.setScalar(0.44 * dm.m.s / 0.82 *")
rep("d.scale.set(0.035, ph < 0.6 ? 0.06 : 0.045, 1);", "d.scale.set(0.05, ph < 0.6 ? 0.11 : 0.06, 1);")
rep("const drips = []; for (let k = 0; k < 6; k++)", "const drips = []; for (let k = 0; k < 9; k++)")
# rain cloud: one wide lumpy cloud texture, a few big sprites
rep("const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'); const R = rng(41);\n  for (let k = 0; k < 9; k++) { const cx = 24 + R() * 80, cy = 40 + R() * 24, r = 16 + R() * 18;",
    "const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d'); const R = rng(41);\n  for (let k = 0; k < 18; k++) { const cx = 30 + R() * 196, cy = 42 + R() * 22 - (Math.abs(k - 9) < 4 ? 10 : 0), r = 14 + R() * 20;")
rep("const cl = []; for (let k = 0; k < 6; k++) {", "const cl = []; for (let k = 0; k < 3; k++) {")
rep("cl.push({ s, a: R() * 6.28, r: Math.sqrt(R()) * rr * 0.6, sz: rr * (0.5 + 0.25 * R()) }); }", "cl.push({ s, a: k * 2.1 + R(), r: rr * (k ? 0.35 : 0.05), sz: rr * (k ? 0.9 : 1.2) }); }")
rep("q.s.scale.set(q.sz * 1.5, q.sz * 0.85, 1); q.s.material.opacity = 0.6 * k; });", "q.s.scale.set(q.sz * 2.0, q.sz * 0.75, 1); q.s.material.opacity = 0.8 * k; });")
open(f,'w').write(s); print('ok')
