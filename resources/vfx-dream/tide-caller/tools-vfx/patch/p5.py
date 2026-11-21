f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:90], s.count(old))
    s=s.replace(old,new)
# stream body: lengthwise streaks (no crossing lattice); the twist comes from the two helix strands
rep("float str=0.0; for(int i=0;i<3;i++){ float fi=float(i); float lane=0.5+0.34*sin(vUv.x*11.0-tm*1.3+fi*2.094); str=max(str,1.0-smoothstep(0.0,0.1,abs(vUv.y-lane))); }",
    "float str=0.0; for(int i=0;i<4;i++){ float fi=float(i); float lane=0.2+0.2*fi+0.04*sin(vUv.x*7.0-tm*1.1+fi*2.0); float dash=smoothstep(0.25,0.6,fbm(vec2(vUv.x*9.0-tm*2.6+fi*3.1,fi))); str=max(str,(1.0-smoothstep(0.0,0.06,abs(vUv.y-lane)))*dash); }")
rep("FX.rope = (A, o) => FX.stream(A, Object.assign({ w: 0.14, core: false, helix: true, halo: false, wob: 0.04, spray: false, head: 0.15, tail: 0.15 }, o));",
    "FX.rope = (A, o) => FX.stream(A, Object.assign({ core: false, helix: true, halo: false, wob: 0.04, spray: false, head: 0.15, tail: 0.15 }, o, { w: (o.w || 0.09) * 1.7 }));")
# whirl: navy depth, lighter variation, thinner rim
rep("c=mix(vec3(0.03,0.1,0.35),col*1.2,smoothstep(0.0,0.8,r));", "c=mix(vec3(0.02,0.08,0.3),mix(vec3(0.1,0.3,0.75),col*1.05,fbm(vec2(sw*2.0,r*5.0))),smoothstep(0.0,0.8,r));")
rep("c=mix(c,vec3(0.7,0.85,1.0),glow); a=op*(0.85+0.15*r)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,glow*op); }",
    "c=mix(c,vec3(0.6,0.8,1.0),glow*0.8); a=op*(0.85+0.15*r)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,glow*op*0.8); }")
rep("float glow=smoothstep(0.88,0.95,rn)*(1.0-smoothstep(0.95,1.0,rn));", "float glow=smoothstep(0.9,0.96,rn)*(1.0-smoothstep(0.96,1.0,rn));")
# puddle: a fainter web
rep("c=mix(c,vec3(0.55,0.75,1.0),cs*0.35); c=mix(c,vec3(0.7,0.86,1.0),glow);", "c=mix(c,vec3(0.55,0.75,1.0),cs*0.18*r); c=mix(c,vec3(0.7,0.86,1.0),glow);")
# froth: a wider band, whiter
rep("float fr=u0*smoothstep(0.08,0.2,r)*(1.0-smoothstep(0.3,0.62,r+0.2*(fbm(p*5.0+tm)-0.5)))*smoothstep(0.4,0.7,fbm(p*9.0+tm*0.5));",
    "float fr=u0*smoothstep(0.12,0.28,r)*(1.0-smoothstep(0.45,0.8,r+0.25*(fbm(p*5.0+tm)-0.5)))*smoothstep(0.35,0.62,fbm(p*10.0+tm*0.5));")
# crown: lighter, more solid
rep("vec3 c=mix(col*0.7,col*1.1,y); c=mix(c,col2,clamp(lip*0.85+smoothstep(0.7,0.9,n)*0.5,0.0,1.0)); float a=op*(0.45+0.5*y+0.3*lip);",
    "vec3 c=mix(vec3(0.15,0.4,0.9),vec3(0.55,0.75,1.0),y); c=mix(c,col2,clamp(lip*0.9+smoothstep(0.65,0.85,n)*0.6,0.0,1.0)); float a=op*(0.6+0.4*y+0.3*lip);")
# wet floor: soft ends
rep("float ends=smoothstep(0.0,0.08/max(ln,0.3),vUv.x)*(1.0-smoothstep(1.0-0.04/max(ln,0.3),1.0,vUv.x));",
    "float ends=smoothstep(0.0,0.6/max(ln,0.6),vUv.x+0.15*(en-0.5))*(1.0-smoothstep(1.0-0.25/max(ln,0.6),1.0,vUv.x));")
# comet tail: a filled body under the lines
rep("float a=op*pow(h,1.4)*(0.25*core+0.75*l)*(1.0-abs(vv)*0.3);", "float a=op*pow(h,1.2)*(0.55*core+0.6*l)*(1.0-abs(vv)*0.3);")
# rain cloud texture: fluffy lobes lit from above
rep("// rain: a low cloud,", "const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'); const R = rng(41);\n  for (let k = 0; k < 9; k++) { const cx = 24 + R() * 80, cy = 40 + R() * 24, r = 16 + R() * 18; const g = x.createRadialGradient(cx - r * 0.25, cy - r * 0.35, r * 0.1, cx, cy, r); g.addColorStop(0, 'rgba(235,242,250,0.95)'); g.addColorStop(0.55, 'rgba(170,185,205,0.85)'); g.addColorStop(1, 'rgba(110,125,150,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fill(); }\n  return new THREE.CanvasTexture(c); })();\n// rain: a low cloud,")
rep("const cl = []; for (let k = 0; k < 16; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 3 ? '#6F7F98' : '#A3B1C6',",
    "const cl = []; for (let k = 0; k < 7; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: k % 3 ? '#9AA6B8' : '#C2CCDA',")
rep("cl.push({ s, a: R() * 6.28, r: Math.sqrt(R()) * rr * 0.55, sz: rr * (0.32 + 0.22 * R()) }); }", "cl.push({ s, a: R() * 6.28, r: Math.sqrt(R()) * rr * 0.6, sz: rr * (0.5 + 0.25 * R()) }); }")
open(f,'w').write(s); print('ok')
