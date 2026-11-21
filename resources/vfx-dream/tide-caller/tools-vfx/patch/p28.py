import math
p='tools/tc.js'; s=open(p).read()
P=[[0.0,1.16],[0.5,1.17],[1.0,1.15],[1.5,1.1],[1.9,1.03],[2.2,0.96],[2.36,0.88],[2.32,0.8],[2.05,0.77],[1.6,0.8],[1.15,0.87],[0.8,0.93]]
L=[0];
for i in range(1,len(P)): L.append(L[-1]+math.dist(P[i],P[i-1]))
v=[x/L[-1] for x in L]; vr0=v[4]; vr1=v[8]  # the rim: from the shoulder round to the underside
old_geo=s[s.index("const umbGeo = new THREE.LatheGeometry("):]; old_geo=old_geo[:old_geo.index("\n")]
s=s.replace(old_geo,"const umbGeo = new THREE.LatheGeometry("+str(P).replace(' ','').replace(',',', ')+".map(([x, y]) => new THREE.Vector2(x, y)), 64); // a fountain's mushroom head: a broad flat top, a rolled rim, the underside back to the jet")
i=s.index("const F_UMB = `"); j=s.index("const F_FOAMT = `")
new=f'''// a fountain's head (u around, v from the top centre out over the rim and back under): solid water swirling out, a ragged white foam rim
const F_UMB = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float tm; varying vec2 vUv; ${{GN}}
  void main(){{ float v=vUv.y; vec2 q=vec2(cos(vUv.x*6.2832),sin(vUv.x*6.2832)); float n=fbm(q*5.0+vec2(v*3.0-tm*1.2,0.0)); float fine=fbm(q*24.0+vec2(v*9.0-tm*2.0,3.0));
    float sw=smoothstep(0.55,0.72,fbm(vec2(vUv.x*14.0+v*5.0-tm*0.8,v*4.0)));
    vec3 c=mix(vec3(0.42,0.7,1.0),vec3(0.18,0.47,0.95),smoothstep(0.1,{vr0:.3f},v)); c=mix(c,vec3(0.06,0.22,0.66),smoothstep({vr1:.3f},1.0,v)); c=mix(c,vec3(0.8,0.92,1.0),sw*0.55);
    float rim=smoothstep({vr0-0.1:.3f},{vr0+0.02:.3f},v+0.12*(fine-0.5))*(1.0-smoothstep({vr1-0.04:.3f},{vr1+0.08:.3f},v+0.12*(n-0.5)));
    float top=(1.0-smoothstep(0.0,0.12,v))*smoothstep(0.45,0.6,fine); c=mix(c,col2,max(rim,top));
    float a=op*mix(0.82,1.0,rim)*(1.0-smoothstep(0.92,1.0,v)); if(a<0.02) discard; gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }}`;
'''
s=s[:i]+new+s[j:]
# the jet: thicker under the head, its streaks twist round it
a="const jr = um ? r * 0.72 : r;"; assert a in s; s=s.replace(a,"const jr = um ? r * 0.95 : r;")
a="float st=smoothstep(0.48,0.72,fbm(vec2(vUv.x*u1*4.0+0.6*sin(y*5.0), y*0.4-tm*u0*0.6)))"
assert a in s; s=s.replace(a,"float st=smoothstep(0.48,0.72,fbm(vec2(vUv.x*u1*4.0+0.6*sin(y*5.0)+(ln<0.5? y*9.0-tm*4.0 : 0.0), y*0.4-tm*u0*0.6)))")
# the head no longer falls to the floor; keep it about the jet's width x 2.4
a="um.scale.set(r * (0.6 + 0.4 * op2), hh2, r * (0.6 + 0.4 * op2));"; assert a in s
s=s.replace(a,"um.scale.set(r * (0.5 + 0.5 * op2), hh2, r * (0.5 + 0.5 * op2));")
open(p,'w').write(s)
