import sys
p='/home/user/tc/tools/tc.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: print('MISS',c,a[:100]); sys.exit(1)
    s=s.replace(a,b)
# tsunami: only the camera-facing cap, solid
R("col.push(cc.r, cc.g, cc.b, 0.25 + 0.75 * Math.min(1, y * 1.8)); UVw.push(0.3 + 0.4 * y, v + 2.0); }","col.push(cc.r, cc.g, cc.b, 0.92); UVw.push(0.3 + 0.4 * y, v + 2.0); }")
R("geo.setIndex(idx); geo.computeVertexNormals(); return geo; })();\n// o: t, from, dir",
  "geo.setIndex(idx); geo.computeVertexNormals(); { const nm = geo.attributes.normal, n0 = (NU + 1) * (NV + 1); for (let k = n0; k < nm.count; k++) nm.setXYZ(k, k < n0 + NV + 1 ? -1 : 1, 0, 0); } return geo; })();\n// o: t, from, dir")
R("void main(){ float cap=step(1.5,vUv.y); vec2 uv=vec2(vUv.x,vUv.y-2.0*cap); vec3 n=normalize(vN), v=normalize(vV);","void main(){ float cap=step(1.5,vUv.y); vec2 uv=vec2(vUv.x,vUv.y-2.0*cap); vec3 n=normalize(vN), v=normalize(vV); if(cap>0.5 && dot(n,v)<0.0) discard;")
# splash: taller petals; crash crowns low and small
R("m.scale.set(r, hh * (o.crash ? 1.0 : 1.3), r); m.material.uniforms.ln.value","m.scale.set(r * (o.crash ? 0.7 : 0.8), hh * (o.crash ? 0.6 : 1.9), r * (o.crash ? 0.7 : 0.8)); m.material.uniforms.ln.value")
# bolt: comet taper
R("float w=0.1+0.9*pow(h,1.5); if(abs(v)>w) discard;","float w=0.05+0.95*pow(h,2.0); if(abs(v)>w) discard;")
R("len: o.len || 0.2, w: (o.r || 0.11) * 2.6","len: o.len || 0.2, w: (o.r || 0.11) * 2.0")
# geyser foot crown taller
R("ft.scale.set(r * 1.3, 0.15 * up, r * 1.3); ft.material.uniforms.op.value = 0.8 * down;","ft.scale.set(r * 1.3, 0.3 * up, r * 1.3); ft.material.uniforms.op.value = 0.95 * down;")
# wall: foam bands on the body by g, broken edges
R("float run=0.0; if(top){ float zz=vP.z; run=smoothstep(0.12,0.0,abs(along-0.55-0.05*sin(zz*2.0+tm*1.5)-0.08*(fbm(vec2(zz*8.0,along*10.0+tm))-0.5)))+smoothstep(0.12,0.0,abs(along-0.76-0.05*sin(zz*2.0-tm*1.2+2.0)-0.08*(fbm(vec2(zz*9.0+3.0,along*10.0-tm))-0.5))); run*=smoothstep(0.35,0.6,n); }",
  "float zz=vP.z; float run=smoothstep(0.06,0.0,abs(g-0.6-0.15*zz-0.06*(fbm(vec2(zz*8.0+vP.x*4.0,g*10.0+tm))-0.5)))+smoothstep(0.06,0.0,abs(g-0.78-0.15*zz-0.06*(fbm(vec2(zz*9.0+3.0+vP.x*4.0,g*10.0-tm))-0.5))); run*=smoothstep(0.25,0.5,n);")
# whirlpool: broad arms, lighter mid band
R("float foam=smoothstep(0.0,0.6,arm)","float foam=smoothstep(-0.2,0.5,arm)")
R("float fz=smoothstep(0.35,0.75,fbm(cw*9.0+vec2(r*40.0,tm*0.3))); c=mix(c,col2,foam*(0.25+0.7*fz));","c=mix(c,vec3(0.2,0.45,0.95),0.35*smoothstep(0.45,0.6,r)*(1.0-smoothstep(0.85,0.95,r))); float fz=smoothstep(0.3,0.7,fbm(cw*9.0+vec2(r*40.0,tm*0.3))); c=mix(c,col2,foam*(0.35+0.6*fz));")
# ring wave: a fine broken foam line on the outer top
R("float n=fbm(q*14.0+vec2(v*24.0,tm*0.8)); float crest=smoothstep(0.44,0.52,v)*(1.0-smoothstep(0.58,0.66,v))*smoothstep(0.4,0.6,n);","float n=fbm(q*22.0+vec2(v*30.0,tm*0.8)); float crest=smoothstep(0.47,0.52,v)*(1.0-smoothstep(0.58,0.63,v))*smoothstep(0.38,0.55,n);")
# wet path: far end fades over the last quarter
R("*(1.0-smoothstep(1.0-0.25/max(ln,0.6),1.0,vUv.x));","*(1.0-smoothstep(0.75,1.0,vUv.x+0.12*(en-0.5)));")
R("float ends=smoothstep(0.0,1.2/max(ln,0.6)","float ends=smoothstep(0.0,0.3/max(ln,0.6)")
# soaked stain lighter with front foam
R("c=mix(vec3(0.03,0.10,0.38),vec3(0.1,0.3,0.75),cs*0.4); c=mix(c,col2,ff); a=op*(1.0-smoothstep(0.7,1.0,rn));","c=mix(vec3(0.05,0.16,0.5),vec3(0.15,0.38,0.85),cs*0.4); c=mix(c,col2,ff); a=op*0.8*(1.0-smoothstep(0.7,1.0,rn));")
R("float ff=smoothstep(0.55,0.68,fbm(p*14.0+tm*0.3))","float ff=smoothstep(0.48,0.6,fbm(p*14.0+tm*0.3))")
open(p,'w').write(s); print('p16 ok')
