import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:100]); sys.exit(1)
    s=s.replace(a,b)
# --- splash: filled petals that hold their height; crash crowns lower; denser foam; pool rings
R("float top=0.25+0.75*pk*","float top=mix(0.25,0.4,ln)+mix(0.75,0.6,ln)*pk*")
R("vec3 c=mix(vec3(0.1,0.3,0.8),vec3(0.4,0.65,1.0),y);","vec3 c=mix(vec3(0.25,0.5,1.0),vec3(0.45,0.7,1.0),y);")
R("float a=op*(0.3+0.35*y+0.6*lip); gl_FragColor","float a=op*(0.5+0.3*y+0.5*lip); gl_FragColor")
R("hh = (o.h || 0.6) * Math.sin(Math.PI * Math.min(1, u * 1.3)) + 0.01; m.scale.set(r, hh * (o.crash ? 1.7 : 1.3), r);","hh = (o.h || 0.6) * Math.min(1, u * 4) * (1 - EASE.in(u)) + 0.01; m.scale.set(r, hh * (o.crash ? 1.0 : 1.3), r); m.material.uniforms.ln.value = o.crash ? 1 : 0;")
R("smoothstep(0.1,0.15,r)*(1.0-smoothstep(0.45,0.6,r+0.25*(fbm(p*5.0+tm)-0.5)));","smoothstep(0.1,0.15,r)*(1.0-smoothstep(0.5,0.65,r+0.25*(fbm(p*5.0+tm)-0.5)));")
R("float fr=min(1.0,abs(u0))*rm*smoothstep(0.5,0.62,fbm(p*18.0+tm*0.5));","float fr=min(1.0,abs(u0))*rm*(u0>1.1? smoothstep(0.45,0.58,fbm(p*9.0+tm*0.5)) : smoothstep(0.42,0.55,fbm(p*18.0+tm*0.5)));")
R("a=op*(0.7+0.2*r+0.15*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(max(a,glow*op),fr*0.95); }",
  "float r2=smoothstep(0.02,0.0,abs(rn-0.75))*u0*0.6; c=mix(c,vec3(0.55,0.8,1.0),r2); a=op*(0.55+0.2*r+0.15*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(max(max(a,glow*op),fr*0.95),r2*op); }")
# --- tsunami: caps flagged in uv (v+2), blue with thin veins; longer, lower; back visible
R("UVw.push(0.3 + 0.4 * y, v); }","UVw.push(0.3 + 0.4 * y, v + 2.0); }")
R("void main(){ vec3 n=normalize(vN), v=normalize(vV); if(!gl_FrontFacing) n=-n; float l=0.55+0.45*max(0.0,dot(n,normalize(vec3(-0.3,0.8,0.5)))); float fr=pow(1.0-abs(dot(n,v)),2.0);\n    float pv=vUv.y*13.0;",
  "void main(){ float cap=step(1.5,vUv.y); vec2 uv=vec2(vUv.x,vUv.y-2.0*cap); vec3 n=normalize(vN), v=normalize(vV); if(!gl_FrontFacing) n=-n; float l=0.55+0.45*max(0.0,dot(n,normalize(vec3(-0.3,0.8,0.5)))); float fr=pow(1.0-abs(dot(n,v)),2.0);\n    float pv=uv.y*13.0;")
R("float st=smoothstep(0.5,0.78,fbm(vec2(vUv.x*22.0+sin(vUv.y*9.0)*0.6, vUv.y*4.0-tm*0.6)))*(0.55+0.45*face);\n    float froth=crest*smoothstep(0.2,0.5,fbm(vec2(vUv.x*30.0,vUv.y*40.0)+tm*0.4));",
  "float st=smoothstep(mix(0.5,0.72,cap),mix(0.78,0.85,cap),fbm(vec2(uv.x*22.0+sin(uv.y*9.0)*0.6, uv.y*4.0-tm*0.6)))*(0.55+0.45*face);\n    float froth=crest*smoothstep(0.2,0.5,fbm(vec2(uv.x*30.0,uv.y*40.0)+tm*0.4))*(1.0-cap*smoothstep(0.88,0.7,uv.x));")
R("float side=1.0-smoothstep(0.82,1.0,abs(vUv.x*2.0-1.0)+0.25*(fbm(vec2(vUv.y*8.0,tm))-0.5)); float back=smoothstep(0.0,0.45,vUv.y+0.15*fbm(vec2(vUv.x*12.0,tm*0.5)));",
  "float side=mix(1.0-smoothstep(0.82,1.0,abs(uv.x*2.0-1.0)+0.25*(fbm(vec2(uv.y*8.0,tm))-0.5)),1.0,cap); float back=smoothstep(0.0,0.45,uv.y+0.15*fbm(vec2(uv.x*12.0,tm*0.5)));")
R("mix(0.0,1.0,back)","mix(0.5,1.0,back)")
R("cc.copy(c0).lerp(c1, Math.min(1, y * 1.6)).lerp(c2, Math.max(0, y - 0.7) * 1.5).lerp(c3, Math.max(0, y - 0.9) * 5);","cc.setRGB(0.03, 0.12, 0.45).lerp(new THREE.Color(0.15, 0.45, 0.95), Math.min(1, y * 1.15)).lerp(c3, Math.max(0, y - 0.88) * 6);")
R("hh = (o.h || 0.8) * 1.5 * rise","hh = (o.h || 0.8) * 1.2 * rise")
R("(o.len || 1.0) * 1.2 * (0.7 + 0.3 * rise))","(o.len || 1.0) * 1.9 * (0.7 + 0.3 * rise))")
# --- bolt: smaller ball, filled comet
R("const r = (o.r || 0.11) * 1.8, wob","const r = (o.r || 0.11) * 1.26, wob")
R("color: '#8FC0F8', transparent: true, opacity: 0.55","color: '#8FC0F8', transparent: true, opacity: 0.45")
R("vec3 c=mix(col,col2,clamp(0.5*pow(core,3.0)+0.5*l,0.0,1.0)); float fl=","vec3 c=mix(vec3(0.15,0.4,0.95),col2,clamp(0.45*pow(core,4.0)+0.4*l,0.0,1.0)); float fl=")
R("float a=op*pow(h,0.8)*(0.8*core+0.25*l+0.5*fl)*(1.0-abs(vv)*0.3);","float a=op*pow(h,0.8)*(0.7*(1.0-smoothstep(0.6,1.0,abs(vv)))+0.25*l+0.5*fl);")
# --- geyser: white lumpy cap, tighter; foot foam hugging the column
R("float m=smoothstep(0.4,0.6,n); vec3 c=mix(vec3(0.45,0.7,1.0),col2,m); gl_FragColor=vec4(c,op*(0.3+0.7*m)); }`;",
  "float m=smoothstep(0.4,0.6,n); float ed=abs(vUv.y-0.5)*2.0; if(fbm(q*6.0+vec2(vUv.y*8.0,tm))<0.3+0.5*ed*ed) discard; vec3 c=mix(vec3(0.92,0.96,1.0),col2,m); gl_FragColor=vec4(c,op*(0.8+0.2*m)); }`;")
R("torGeo = new THREE.TorusGeometry(1, 0.3, 10, 48);","torGeo = new THREE.TorusGeometry(0.9, 0.22, 10, 48);")
R("cap.scale.set(r * 1.02, r * 0.9, r * 1.02);","cap.scale.set(r * 1.2, r * 1.0, r * 1.2);")
R("smoothstep(0.6,0.72,r)*(1.0-smoothstep(0.85,1.0,r))","smoothstep(0.68,0.74,r)*(1.0-smoothstep(0.86,0.95,r))")
R("r: (o.r || 0.35) * 1.4, op: 0.4, froth: 1.2","r: (o.r || 0.35) * 1.25, op: 0.4, froth: 1.2")
# --- wall: luminous, lighter middle, broad broken foam bands, ragged crest
R("vec3 c=mix(vec3(0.02,0.10,0.45),vec3(0.08,0.32,0.90),clamp(g/0.85,0.0,1.0)); c=mix(c,vec3(0.30,0.60,1.0),smoothstep(0.85,1.0,g));",
  "vec3 c=mix(vec3(0.03,0.13,0.5),vec3(0.15,0.45,0.95),clamp(g/0.6,0.0,1.0)); c=mix(c,vec3(0.35,0.65,1.0),smoothstep(0.6,1.0,g));")
R("float foot=top? 0.0 : (1.0-smoothstep(0.0,0.15,y));","float foot=top? 0.0 : (1.0-smoothstep(0.0,0.25,y));")
R("float crest=smoothstep(0.88,0.95,g+0.1*(n-0.5));","float crest=smoothstep(0.88,0.95,g+0.16*(fbm(vec2((vP.x+vP.z)*12.0,along*12.0)+tm)-0.5));")
R("run=smoothstep(0.06,0.0,abs(along-0.6-0.08*sin(zz*12.0+tm*1.5)-0.04*fbm(vec2(zz*8.0,tm))))+smoothstep(0.06,0.0,abs(along-0.78-0.06*sin(zz*10.0-tm*1.2+2.0)));",
  "run=smoothstep(0.12,0.0,abs(along-0.55-0.05*sin(zz*2.0+tm*1.5)-0.08*(fbm(vec2(zz*8.0,along*10.0+tm))-0.5)))+smoothstep(0.12,0.0,abs(along-0.76-0.05*sin(zz*2.0-tm*1.2+2.0)-0.08*(fbm(vec2(zz*9.0+3.0,along*10.0-tm))-0.5)));")
R("gl_FragColor=vec4(c, clamp(op*0.85*(1.0+0.15*foam),0.0,1.0)); }`;","gl_FragColor=vec4(c, clamp(op*0.7*(1.0+0.3*foam+0.3*foot),0.0,1.0)); }`;")
# --- ring wave: slimmer, bluer, fine foam line
R("[[0.78, 0], [0.83, 0.25], [0.9, 0.55], [0.98, 0.8], [1.05, 0.92], [1.12, 0.84], [1.14, 0.62], [1.12, 0.38], [1.17, 0.1], [1.23, 0]]","[[0.82, 0], [0.86, 0.25], [0.92, 0.55], [0.99, 0.8], [1.05, 0.92], [1.11, 0.84], [1.12, 0.62], [1.1, 0.38], [1.14, 0.1], [1.19, 0]]")
R("vec3 c=mix(vec3(0.05,0.16,0.5),vec3(0.3,0.58,0.98),smoothstep(0.05,0.45,v));","vec3 c=mix(vec3(0.04,0.14,0.48),vec3(0.10,0.35,0.85),smoothstep(0.05,0.45,v));")
R("float n=fbm(q*5.0+vec2(v*10.0,tm*0.8)); float crest=smoothstep(0.36,0.48,v)*(1.0-smoothstep(0.62,0.76,v))*smoothstep(0.38,0.58,n);","float n=fbm(q*14.0+vec2(v*24.0,tm*0.8)); float crest=smoothstep(0.44,0.52,v)*(1.0-smoothstep(0.58,0.66,v))*smoothstep(0.4,0.6,n);")
# --- whirlpool: deeper, broad arms
R("float foam=smoothstep(0.2,0.8,arm)","float foam=smoothstep(0.0,0.6,arm)")
R("c=mix(vec3(0.015,0.05,0.22),mix(vec3(0.06,0.2,0.6),col*0.8,","c=mix(vec3(0.01,0.03,0.16),mix(vec3(0.05,0.17,0.52),col*0.7,")
# --- stream: fuller, bigger end burst
R("draw(outer, W0, t); outer.m.material.uniforms.op.value = (o.jop || 0.9) * k;","draw(outer, W0 * (o.spray === false ? 1 : 1.3), t); outer.m.material.uniforms.op.value = (o.jop || 0.9) * k;")
R("FX.drops(A, { t: ts, at: (tt) => to(tt), n: 8, sp: 0.9, up: 0.9, size: 0.035","FX.drops(A, { t: ts, at: (tt) => to(tt), n: 8, sp: 0.9, up: 0.9, size: 0.05")
# --- dome web colour
R("c=mix(c,vec3(0.8,0.92,1.0),cs2); }","c=mix(c,vec3(0.5,0.75,1.0),cs2); }")
# --- rain: longer streaks
R("q.m.scale.set(0.012, 0.012, 0.9);","q.m.scale.set(0.012, 0.012, 1.35);")
# --- soaked: blue drips, bigger stain with front foam
R("d.material.color.set('#D6EAFF');","d.material.color.set('#9CC8FF');")
R("const ps = 0.31 * dm.m.s / 0.82","const ps = 0.46 * dm.m.s / 0.82")
R("pu.material.uniforms.u1.value = -1;","pu.material.uniforms.u1.value = -1; pu.material.uniforms.u0.value = 0.6;")
open(p,'w').write(s); print('p15 ok')
