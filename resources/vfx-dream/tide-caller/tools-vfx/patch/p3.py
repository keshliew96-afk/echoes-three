f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:90], s.count(old))
    s=s.replace(old,new)
# richer stream colours: deep -> cobalt body, sky strands, foam glints; plus a soft halo shader
rep("vec3 c=mix(col*0.5,col*1.12,pow(1.0-x,0.7)); c=mix(c,mix(col,col2,0.55),0.55*str);",
    "vec3 c=mix(vec3(0.07,0.2,0.55),col*1.2,pow(1.0-x,0.6)); c=mix(c,vec3(0.62,0.8,1.0),0.6*str);")
rep("float a=s*edge*op*(0.72+0.28*max(str,gl)); gl_FragColor=vec4(c,a); }`;\n// floor water",
    "float a=s*edge*op*(0.85+0.15*max(str,gl)); gl_FragColor=vec4(c,a); }`;\nconst F_HALO = `uniform vec3 col; uniform float op; uniform float u0; uniform float u1; varying vec2 vUv; void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.06,vUv.x)*(1.0-smoothstep(u1-0.06,u1,vUv.x)); gl_FragColor=vec4(col, s*op*pow(1.0-x,2.0)); }`;\n// floor water")
# stream: wider body, halo sheet
rep("const outer = mk(o.col || C.cobalt, 0.85),", "const halo = o.halo === false ? null : mk(C.cobalt, 0.2); if (halo) { halo.m.material = fxMat(C.cobalt, F_HALO, { add: true }); }\n  const outer = mk(o.col || C.cobalt, 0.85),")
rep("const W0 = o.w || 0.16; draw(outer, W0, t);", "const W0 = (o.w || 0.16) * 1.35; if (halo) { halo.m.visible = on; draw(halo, W0 * 2.6, t); halo.m.material.uniforms.op.value = 0.16 * k; } draw(outer, W0, t);")
rep("A.fx((t) => { const on = t >= o.t0 && t <= o.t1 + tail; outer.m.visible = on; if (core) core.m.visible = on; if (core2) core2.m.visible = on; if (!on) return;",
    "A.fx((t) => { const on = t >= o.t0 && t <= o.t1 + tail; outer.m.visible = on; if (core) core.m.visible = on; if (core2) core2.m.visible = on; if (halo) halo.m.visible = on; if (!on) return;")
rep("FX.rope = (A, o) => FX.stream(A, Object.assign({ w: 0.08, core: false, helix: true,", "FX.rope = (A, o) => FX.stream(A, Object.assign({ w: 0.1, core: false, helix: true, halo: false,")
# wet floor: saturated, opaque, thick froth edges, bigger sparkles
rep("float cs=caus(p*1.3+vec2(-tm*0.3,0.0), tm); float foam=smoothstep(0.62,0.84,xe)*body*(0.45+0.55*fbm(p*4.0+tm*0.2));",
    "float cs=caus(p*1.3+vec2(-tm*0.3,0.0), tm); float fr=fbm(p*5.0+tm*0.2); float foam=smoothstep(0.58,0.8,xe)*body*smoothstep(0.35,0.65,fr);")
rep("vec3 c=mix(col*0.55,col*1.05,0.55+0.45*fbm(p*0.8)); c=mix(c,mix(col,col2,0.6),cs*0.55); c=mix(c,col2,foam*0.85); c+=vec3(0.9,0.95,1.0)*spk(p*5.0,tm)*0.9;\n    float a=op*s*body*mix(1.0,ends,0.6)*(0.55+0.35*cs+0.5*foam);",
    "vec3 c=mix(vec3(0.06,0.2,0.6),col*1.15,0.45+0.55*fbm(p*0.8)); c=mix(c,vec3(0.6,0.8,1.0),cs*0.6); c=mix(c,col2,foam); c+=vec3(0.9,0.95,1.0)*(spk(p*4.0,tm)+spk(p*7.0+3.0,tm*1.3))*1.1;\n    float a=op*s*body*mix(1.0,ends,0.6)*(0.8+0.3*cs+0.5*foam);")
# pools: saturated, glowing rim, optional froth ring (u0) round the middle
rep("vec2 p=vUv*2.0-1.0; float r=length(p); float an=atan(p.y,p.x); float rn=r+(fbm(vec2(an*2.0,tm*0.2))-0.5)*0.08; if(rn>1.0) discard;",
    "vec2 p=vUv*2.0-1.0; float r=length(p); float an=atan(p.y,p.x); float rn=r+(fbm(vec2(an*2.0,tm*0.2))-0.5)*0.06; if(rn>1.0) discard; float glow=smoothstep(0.88,0.95,rn)*(1.0-smoothstep(0.95,1.0,rn));")
rep("c=mix(col*0.35,col*1.1,smoothstep(0.0,0.85,r)); c=mix(c,mix(col,col2,0.5),lines); c=mix(c,col2,foam*0.9);\n      float rim=smoothstep(0.86,0.97,rn)*(1.0-smoothstep(0.97,1.0,rn)); c=mix(c,mix(col,col2,0.7),rim); a=op*(0.78+0.2*r)*(1.0-smoothstep(0.96,1.0,rn)); a=max(a,rim*op); }",
    "c=mix(vec3(0.03,0.1,0.35),col*1.2,smoothstep(0.0,0.8,r)); c=mix(c,vec3(0.55,0.75,1.0),lines); c=mix(c,col2,foam*0.95);\n      c=mix(c,vec3(0.7,0.85,1.0),glow); a=op*(0.85+0.15*r)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,glow*op); }")
rep("float rim=smoothstep(0.84,0.96,rn)*(1.0-smoothstep(0.96,1.0,rn))*(0.5+0.5*fbm(vec2(an*5.0,tm))); \n      c=mix(col*0.5,col*1.05,0.4+0.6*r); c=mix(c,col*1.2,0.15*rip); c=mix(c,mix(col,col2,0.6),cs*0.6); c=mix(c,col2,rim*0.8); c+=vec3(0.9,0.95,1.0)*spk(p*6.0,tm)*0.7;\n      a=op*(0.5+0.25*r+0.35*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,rim*op); }",
    "float fr=u0*smoothstep(0.08,0.2,r)*(1.0-smoothstep(0.3,0.62,r+0.2*(fbm(p*5.0+tm)-0.5)))*smoothstep(0.4,0.7,fbm(p*9.0+tm*0.5));\n      c=mix(vec3(0.06,0.2,0.6),col*1.15,0.35+0.65*r); c=mix(c,col*1.3,0.12*rip); c=mix(c,vec3(0.6,0.8,1.0),cs*0.55); c=mix(c,vec3(0.7,0.86,1.0),glow); c=mix(c,col2,fr); c+=vec3(0.9,0.95,1.0)*spk(p*6.0,tm)*0.8;\n      a=op*(0.62+0.2*r+0.3*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,max(glow,fr)*op); }")
rep("m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.55) * (o.whirl ? 1.45 : 1.5)) * k; m.material.uniforms.u1.value = o.whirl || 0;",
    "m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.55) * (o.whirl ? 1.5 : 1.6)) * k; m.material.uniforms.u0.value = o.froth || 0; m.material.uniforms.u1.value = o.whirl || 0;")
# splash: taller crown, froth round its foot, a smaller puddle
rep("m.scale.set(r, hh * (o.crash ? 1.25 : 1), r);", "m.scale.set(r, hh * (o.crash ? 1.7 : 1.3), r);")
rep("r: (o.r || 0.5) * (o.crash ? 1.45 : 1.15), op: o.crash ? 0.55 : 0.4, fin: 0.08, fout: 0.35 });",
    "r: (o.r || 0.5) * (o.crash ? 1.25 : 1.0), op: o.crash ? 0.55 : 0.42, froth: 1, fin: 0.06, fout: 0.35 });")
# bolt: a longer, brighter comet tail
rep("FX.trail(A, { of: (t) => pos(Math.min(t, o.t + (o.dur || 0.3))), t0: o.t, t1: o.t + (o.dur || 0.3), len: o.len || 0.12, w: (o.r || 0.11) * 1.5, op: 0.55, col: C.foam });",
    "FX.trail(A, { of: (t) => pos(Math.min(t, o.t + (o.dur || 0.3))), t0: o.t, t1: o.t + (o.dur || 0.3), len: o.len || 0.26, w: (o.r || 0.11) * 2.2, op: 0.9, col: C.cobalt });")
# rain cloud: darker grey-blue puffs, more of them; streaks brighter
rep("const cl = []; for (let k = 0; k < 9; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 3 ? '#8D9BAE' : '#B9C6D6',",
    "const cl = []; for (let k = 0; k < 16; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 3 ? '#6F7F98' : '#A3B1C6',")
rep("cl.push({ s, a: R() * 6.28, r: Math.sqrt(R()) * rr * 0.9, sz: rr * (0.5 + 0.4 * R()) }); }", "cl.push({ s, a: R() * 6.28, r: Math.sqrt(R()) * rr * 0.85, sz: rr * (0.3 + 0.25 * R()) }); }")
rep("q.s.scale.set(q.sz * 1.6, q.sz * 0.8, 1); q.s.material.opacity = 0.5 * k; });", "q.s.scale.set(q.sz * 1.7, q.sz * 0.9, 1); q.s.material.opacity = 0.7 * k; });")
rep("q.m.scale.set(0.025, 0.025, 0.35); q.m.material.uniforms.op.value = 0.7 * k; }); });", "q.m.scale.set(0.02, 0.02, 0.45); q.m.material.uniforms.op.value = 0.9 * k; }); });")
rep("r0: 0.02, r1: 0.18, dur: 0.5, col: C.foam, op: 0.5, w: 0.3 }); }", "r0: 0.02, r1: 0.18, dur: 0.5, col: C.foam, op: 0.6, w: 0.3 }); FX.drops(A, { t: o.t0 + 0.25 + i / 10, at: (tt) => { const c = P3(A, o.at, o.follow ? tt : o.t0); const yaw = o.yaw ? o.yaw(tt) : 0, lx = Math.cos(a) * r * (o.sx || 1), lz = Math.sin(a) * r; return [c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), 0.03, c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw)]; }, n: 3, sp: 0.25, up: 0.6, size: 0.025, dur: 0.3, col: C.foam }); }")
open(f,'w').write(s); print('ok')
