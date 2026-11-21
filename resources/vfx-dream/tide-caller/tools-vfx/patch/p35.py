p='tools/tc.js'; s=open(p).read()
# the stream can take another shader for its outer ribbon
a="const outer = mk(o.col || C.cobalt, 0.85),"
b="const outer = mk(o.col || C.cobalt, 0.85); if (o.shader) outer.m.material = fxMat(o.col || C.cobalt, o.shader, { col2: o.col2 || C.foam }); const"
assert s.count(a)==1; s=s.replace(a,b)
s=s.replace("const outer = mk(o.col || C.cobalt, 0.85); if (o.shader) outer.m.material = fxMat(o.col || C.cobalt, o.shader, { col2: o.col2 || C.foam }); const core =","const outer = mk(o.col || C.cobalt, 0.85); if (o.shader) outer.m.material = fxMat(o.col || C.cobalt, o.shader, { col2: o.col2 || C.foam }); const core =")
anchor="const F_HALO = `"
new='''// a jet (the reference, 20 Nov): a deep blue core wrapped in a white foam sheath; the head bursts into ragged white spikes wider than the body
const F_JET = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.05,vUv.x)*(1.0-smoothstep(u1-0.015,u1,vUv.x));
    float n=fbm(vec2(vUv.x*12.0-tm*2.0, vUv.y*4.0)); float fine=fbm(vec2(vUv.x*38.0-tm*3.0, vUv.y*10.0));
    float hd=smoothstep(u1-0.2,u1-0.05,vUv.x); float spk=smoothstep(0.42,0.6,fbm(vec2(vUv.y*11.0, vUv.x*2.0-tm*0.5)));
    float edge=1.0-smoothstep(0.72,0.98,x+0.3*(n-0.5)); edge=mix(edge, edge*max(spk,1.0-smoothstep(0.2,0.5,x)), hd);
    float core=(1.0-smoothstep(0.3,0.55,x+0.25*(n-0.5)))*(1.0-hd*0.85)*smoothstep(u0,u0+0.12,vUv.x);
    vec3 blue=mix(vec3(0.07,0.25,0.75),col*1.1,smoothstep(0.35,0.7,fbm(vec2(vUv.x*18.0-tm*2.5,vUv.y*5.0)))); blue=mix(blue,vec3(0.55,0.8,1.0),smoothstep(0.6,0.72,fine)*0.45);
    vec3 c=mix(col2,blue,core); float a=s*edge*op; if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
'''
assert anchor in s; s=s.replace(anchor,new+anchor,1)
a="FX.jet = (A, o) => FX.stream(A, Object.assign({ t0: o.t, t1: o.t + (o.hold || 0.12), head: o.dur || 0.12, tail: o.tail || 0.14, sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false, twist: false, jop: 0.6 }, o, { w: (o.w || 0.14) * 0.75 }));"
b="FX.jet = (A, o) => FX.stream(A, Object.assign({ t0: o.t, t1: o.t + (o.hold || 0.12), head: o.dur || 0.12, tail: o.tail || 0.14, sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false, twist: false, jop: 0.95, core: false, shader: F_JET,\n  wid: (v) => (0.6 + 0.4 * Math.min(1, v / 0.2)) * (1 + 1.5 * Math.max(0, (v - 0.82) / 0.18) ** 1.5) }, o, { w: (o.w || 0.14) * 1.0 }));"
assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
