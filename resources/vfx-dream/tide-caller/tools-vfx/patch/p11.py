import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:90]); sys.exit(1)
    s=s.replace(a,b)
# stream: body back, braid tighter
R("float edge=1.0-smoothstep(0.55,1.0,x+0.55*(n-0.5));","float edge=1.0-smoothstep(0.6,1.0,x+0.4*(n-0.5));")
R("(o.tw || 0.6)","(o.tw || 0.38)")
# tsunami: near side no longer see-through, longer profile, firmer back
R("float side=1.0-smoothstep(0.55,1.0,abs(vUv.x*2.0-1.0)","float side=1.0-smoothstep(0.82,1.0,abs(vUv.x*2.0-1.0)")
R("mix(0.35,1.0,back)","mix(0.6,1.0,back)")
R("(o.len || 1.0) * (0.7 + 0.3 * rise)); m.material.uniforms.op.value = 0.95","(o.len || 1.0) * 1.4 * (0.7 + 0.3 * rise)); m.material.uniforms.op.value = 0.95")
# ring wave: slimmer band, long tangential streaks, foam on the outer lip
R("[[0.72, 0], [0.78, 0.25], [0.86, 0.55], [0.96, 0.8], [1.04, 0.92], [1.12, 0.82], [1.12, 0.6], [1.08, 0.35], [1.16, 0.08], [1.24, 0]]","[[0.84, 0], [0.88, 0.25], [0.93, 0.55], [0.99, 0.8], [1.04, 0.92], [1.09, 0.84], [1.1, 0.62], [1.08, 0.38], [1.12, 0.1], [1.17, 0]]")
R("float st=smoothstep(0.5,0.75,fbm(q*u1*0.35+vec2(v*6.0,tm*u0*0.6)))","float st=smoothstep(0.52,0.72,fbm(q*2.5+vec2(v*28.0,tm*u0*0.6)))")
R("float n=fbm(q*u1*0.5+vec2(v*9.0,tm*0.8)); float crest=smoothstep(0.32,0.45,v)*(1.0-smoothstep(0.62,0.78,v))*smoothstep(0.35,0.6,n);","float n=fbm(q*9.0+vec2(v*22.0,tm*0.8)); float crest=smoothstep(0.38,0.5,v)*(1.0-smoothstep(0.6,0.72,v))*smoothstep(0.4,0.62,n);")
# bolt: bigger brighter ball, short bright comet
R("color: '#6FA8F0', transparent: true, opacity: 0.35","color: '#8FC0F8', transparent: true, opacity: 0.55")
R("const r = (o.r || 0.11) * 1.35, wob","const r = (o.r || 0.11) * 1.8, wob")
R("len: o.len || 0.6, w: (o.r || 0.11) * 3.0, op: 1.0, col: C.cobalt });","len: o.len || 0.35, w: (o.r || 0.11) * 3.6, op: 1.0, col: '#4F8EEA' });")
# splash: more, thinner, taller spikes; navy pool
R("float sx=vUv.x*9.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),6.0); float top=0.5+0.5*pk*","float sx=vUv.x*13.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),9.0); float top=0.35+0.65*pk*")
R("c=mix(vec3(0.03,0.12,0.42),col*1.0,0.25+0.6*r);","c=mix(vec3(0.03,0.12,0.42),col*0.8,0.25+0.6*r);")
# whirl: textured arms, not flat bands
R("c=mix(c,col2,foam*0.95);","float fz=smoothstep(0.35,0.75,fbm(cw*9.0+vec2(r*40.0,tm*0.3))); c=mix(c,col2,foam*(0.25+0.7*fz));")
# rain pool a bit more water
R("yaw: o.yaw, op: 0.14, grow: true });","yaw: o.yaw, op: 0.22, grow: true });")
# wet path: foam band inside the body, more water
R("float foam=min(1.0,1.5*smoothstep(0.7,0.95,xe)","float foam=min(1.0,1.6*smoothstep(0.55,0.85,xe)")
R("(o.op || 0.5) * 1.0) * k; m.material.uniforms.tm.value = (o.flow","(o.op || 0.5) * 1.3) * k; m.material.uniforms.tm.value = (o.flow")
# geyser cap: thinner frothy ring
R("torGeo = new THREE.TorusGeometry(1, 0.3, 10, 40);","torGeo = new THREE.TorusGeometry(1, 0.2, 10, 48);")
R("gl_FragColor=vec4(c,op*(0.35+0.65*m)); }`;","gl_FragColor=vec4(c,op*(0.08+0.9*m)); }`;")
R("cap.scale.set(r * 1.15, r * 1.1, r * 1.15);","cap.scale.set(r * 1.1, r * 0.8, r * 1.1);")
# wall: thicker, blue top with foam patches
R("(o.th || 0.18) * 0.9);","(o.th || 0.18) * 1.2);")
R("step(0.5,n.y)*(0.35+0.6*tf) : 0.0),0.0,1.0));","step(0.5,n.y)*(0.15+0.75*tf) : 0.0),0.0,1.0));")
# dome: veins live near the rim, a brighter blue rim
R("caus(vP.xz*2.6+vec2(y*2.0,-y*1.5), tm)*smoothstep(0.1,0.7,f+0.2);","caus(vP.xz*2.0+vec2(y*2.0,-y*1.5), tm)*smoothstep(0.35,0.85,f);")
R("(0.04+0.38*pow(f,2.6)+0.6*cs2+0.35*sh2+base)","(0.04+0.6*pow(f,3.0)+0.7*cs2+0.25*sh2+base)")
# soaked: firmer stain, visible drips
R("pu.material.uniforms.op.value = 0.33 * wet;","pu.material.uniforms.op.value = 0.45 * wet;")
R("d.scale.set(0.03, ph < 0.6 ? 0.16 : 0.07, 1); d.material.opacity = 0.85 * wet","d.scale.set(0.045, ph < 0.6 ? 0.2 : 0.08, 1); d.material.opacity = 1.0 * wet")
open(p,'w').write(s); print('p11 ok')
