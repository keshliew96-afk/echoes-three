p='tools/tc.js'; s=open(p).read()
# jet: no blue halo behind the white sheath
a="core: false, shader: F_JET,"; assert a in s; s=s.replace(a,"core: false, halo: false, shader: F_JET,")
# bolt tail: a blue core in a white sheath whose edge breaks into spikes peeling back
i=s.index("const F_TAIL = `"); j=s.index("\n",s.index("gl_FragColor=vec4(c,a); }`;",i))+1
new='''const F_TAIL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float h=vUv.x; float v=(vUv.y-0.5)*2.0; float spk=smoothstep(0.35,0.75,fbm(vec2(v*7.0,h*3.0-tm*0.8))); float w=(0.05+0.95*pow(h,1.6))*(0.75+0.45*spk*(1.0-h*0.5)); if(abs(v)>w) discard; float vv=v/w;
    float n=fbm(vec2(h*10.0-tm*2.0,vv*3.0)); float core=(1.0-smoothstep(0.25,0.55,abs(vv)+0.3*(n-0.5)))*smoothstep(0.25,0.6,h);
    vec3 blue=mix(vec3(0.07,0.25,0.75),vec3(0.2,0.5,1.0),smoothstep(0.4,0.7,fbm(vec2(h*16.0,vv*4.0)-tm))); vec3 c=mix(col2,blue,core);
    float a=op*pow(h,0.7)*(1.0-smoothstep(0.75,1.0,abs(vv)))*mix(0.8,1.0,core); if(a<0.02) discard; gl_FragColor=vec4(c,a); }`;
'''
s=s[:i]+new+s[j:]
# bolt head: a blue core in a white foam skin, stretched along its flight
anchor="// a water bolt: a ball of water"
shader='''// a water bolt's head (the reference, 20 Nov): white foam skin round a cracked deep blue core
const F_BOLTH = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${GN}
  void main(){ vec3 n=normalize(vN), v=normalize(vV); float f=1.0-abs(dot(n,v)); float nz=fbm(vP.xy*5.0+vP.z*3.0+tm*1.5);
    float core=1.0-smoothstep(0.3,0.6,f+0.35*(nz-0.5)); float cr=smoothstep(0.03,0.0,abs(fbm(vP.xz*7.0-tm*0.8)-0.5))*core;
    vec3 blue=mix(vec3(0.06,0.22,0.72),vec3(0.2,0.5,1.0),smoothstep(0.3,0.7,nz)); blue=mix(blue,vec3(0.6,0.85,1.0),cr*0.8); vec3 c=mix(col2,blue,core);
    gl_FragColor=vec4(c,op*(0.85+0.15*f)); }`;
'''
s=s.replace(anchor,shader+anchor,1)
a="const ball = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0.95 }, u0: { value: 0.05 }, tm: { value: 0 } }, vertexShader: VS_BUB2, fragmentShader: F_BUB2, transparent: true, depthWrite: false }))); ball.visible = false;"
b="const ball = A.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(o.col || C.cobalt) }, col2: { value: new THREE.Color(C.foam) }, op: { value: 0.95 }, u0: { value: 0.05 }, tm: { value: 0 } }, vertexShader: VS_BUB2, fragmentShader: F_BOLTH, transparent: true, depthWrite: false }))); ball.visible = false;"
assert a in s; s=s.replace(a,b)
a="const p = pos(t); ball.position.copy(p); core.position.copy(p); const r = (o.r || 0.11) * 1.26, wob = 1 + 0.12 * Math.sin(a * 40); ball.scale.set(r * wob, r / wob, r * wob); core.scale.setScalar(r * 0.75); });"
b="const p = pos(t); ball.position.copy(p); core.position.copy(p); core.visible = false; const r = (o.r || 0.11) * 1.26, wob = 1 + 0.08 * Math.sin(a * 40); ball.lookAt(pos(Math.min(o.t + d, t + 0.02)).add(p.clone().sub(pos(Math.max(o.t, t - 0.02)))).sub(p).add(p)); ball.scale.set(r * wob, r * wob, r * 1.7); ball.material.uniforms.tm.value = t; });"
assert a in s; s=s.replace(a,b)
open(p,'w').write(s)
