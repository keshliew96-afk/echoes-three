import re,sys
f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:80], s.count(old))
    s=s.replace(old,new)
# ---------- shared noise + new shaders, inserted before streakGeo
NOISE = r'''
// ---- dream-loop water looks (Tide Caller VFX, 20 Nov): shared noise, caustics, foam
const GN = `float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float a=0.0, w=0.5; for(int i=0;i<4;i++){ a+=w*vn(p); p=p*2.03+vec2(1.7,9.2); w*=0.5; } return a; }
  float caus(vec2 p, float t){ vec2 q=p; float c=0.0; for(int i=0;i<3;i++){ float fi=float(i); q+=vec2(sin(q.y*1.7+t*0.8+fi),cos(q.x*1.5-t*0.6+fi*1.3))*0.55; c+=abs(sin(q.x*2.1)+sin(q.y*2.3)); } c/=3.0; return pow(1.0-clamp(abs(c-0.9)*1.6,0.0,1.0),5.0); }
  float spk(vec2 p, float t){ vec2 g=floor(p); float r=hh(g); float tw=0.5+0.5*sin(t*6.0+r*40.0); vec2 f=fract(p)-0.5; return step(0.94,r)*tw*(1.0-smoothstep(0.03,0.14,length(f))); }`;
// a stream, jet or rope (u along, v across): twisted strands of clear water, deep edges, foam glints running with the flow
const F_FLOW2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.04,vUv.x)*(1.0-smoothstep(u1-0.04,u1,vUv.x));
    float n=fbm(vec2(vUv.x*16.0-tm*2.2, vUv.y*3.0)); float edge=1.0-smoothstep(0.55,1.0,x+0.35*(n-0.5));
    float str=0.0; for(int i=0;i<3;i++){ float fi=float(i); float lane=0.5+0.34*sin(vUv.x*11.0-tm*1.3+fi*2.094); str=max(str,1.0-smoothstep(0.0,0.1,abs(vUv.y-lane))); }
    vec3 c=mix(col*0.5,col*1.12,pow(1.0-x,0.7)); c=mix(c,mix(col,col2,0.55),0.55*str);
    float gl=smoothstep(0.68,0.9,n)*(1.0-x*0.8); c=mix(c,col2,clamp(gl*0.9+0.5*str*step(0.62,fract(vUv.x*5.0-tm*1.8+vUv.y)),0.0,1.0));
    float a=s*edge*op*(0.72+0.28*max(str,gl)); gl_FragColor=vec4(c,a); }`;
// floor water (the wet path, a wake, a current): glossy shallow water, caustic web, wavy foam edges, sparkle
const F_WET = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; uniform float ln; varying vec2 vUv; ${GN}
  void main(){ vec2 p=vec2(vUv.x*ln, vUv.y)*3.2; float x=abs(vUv.y-0.5)*2.0; float s=smoothstep(u0,u0+0.03,vUv.x)*(1.0-smoothstep(u1-0.03,u1,vUv.x));
    float en=fbm(vec2(vUv.x*ln*5.0, vUv.y*2.0)+vec2(tm*0.15,0.0)); float xe=x+(en-0.5)*0.35; float body=1.0-smoothstep(0.82,0.98,xe);
    float cs=caus(p*1.3+vec2(-tm*0.3,0.0), tm); float foam=smoothstep(0.62,0.84,xe)*body*(0.45+0.55*fbm(p*4.0+tm*0.2));
    float ends=smoothstep(0.0,0.08/max(ln,0.3),vUv.x)*(1.0-smoothstep(1.0-0.04/max(ln,0.3),1.0,vUv.x));
    vec3 c=mix(col*0.55,col*1.05,0.55+0.45*fbm(p*0.8)); c=mix(c,mix(col,col2,0.6),cs*0.55); c=mix(c,col2,foam*0.85); c+=vec3(0.9,0.95,1.0)*spk(p*5.0,tm)*0.9;
    float a=op*s*body*mix(1.0,ends,0.6)*(0.55+0.35*cs+0.5*foam); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a water surface on the floor (pools, puddles): caustic web, ripples, a foam rim; u1 > 0: a whirl with foam arms to a dark eye
const F_POOL2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float an=atan(p.y,p.x); float rn=r+(fbm(vec2(an*2.0,tm*0.2))-0.5)*0.08; if(rn>1.0) discard;
    vec3 c; float a;
    if(u1>0.0){ float sw=an+r*u1*5.5-tm*u1*2.6; float arm=sin(sw*3.0+fbm(p*3.0)*2.0); float n=fbm(vec2(sw*1.5, r*6.0-tm*0.6));
      float foam=smoothstep(0.55,0.95,arm)*smoothstep(0.15,0.45,r)*(0.35+0.65*n); float lines=smoothstep(0.8,0.97,sin(sw*9.0+r*10.0))*0.5*r;
      c=mix(col*0.35,col*1.1,smoothstep(0.0,0.85,r)); c=mix(c,mix(col,col2,0.5),lines); c=mix(c,col2,foam*0.9);
      float rim=smoothstep(0.86,0.97,rn)*(1.0-smoothstep(0.97,1.0,rn)); c=mix(c,mix(col,col2,0.7),rim); a=op*(0.78+0.2*r)*(1.0-smoothstep(0.96,1.0,rn)); a=max(a,rim*op); }
    else { float cs=caus(p*3.0, tm); float rip=sin(r*24.0-tm*3.0)*0.5+0.5;
      float rim=smoothstep(0.84,0.96,rn)*(1.0-smoothstep(0.96,1.0,rn))*(0.5+0.5*fbm(vec2(an*5.0,tm))); 
      c=mix(col*0.5,col*1.05,0.4+0.6*r); c=mix(c,col*1.2,0.15*rip); c=mix(c,mix(col,col2,0.6),cs*0.6); c=mix(c,col2,rim*0.8); c+=vec3(0.9,0.95,1.0)*spk(p*6.0,tm)*0.7;
      a=op*(0.5+0.25*r+0.35*cs)*(1.0-smoothstep(0.95,1.0,rn)); a=max(a,rim*op); }
    gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a crown splash: an upright ring with a spiked, broken top, foam at the lip, streaks thrown up
const F_CROWN = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float y=vUv.y; float sx=vUv.x*7.0; float pk=pow(abs(sin(sx*3.14159+hh(vec2(floor(sx),u0))*1.5)),3.0); float top=0.5+0.5*pk*(0.6+0.4*hh(vec2(floor(sx),3.0+u0)));
    float n=fbm(vec2(vUv.x*20.0,y*3.0-tm)); if(y>top+0.06*(n-0.5)) discard; float lip=smoothstep(top-0.28,top,y);
    vec3 c=mix(col*0.7,col*1.1,y); c=mix(c,col2,clamp(lip*0.85+smoothstep(0.7,0.9,n)*0.5,0.0,1.0)); float a=op*(0.45+0.5*y+0.3*lip); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a ring wall or column of water: deep low, streaks running (u0: speed, sign = up/down), a broken foam top
const F_COL2 = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float y=vUv.y; float n=fbm(vec2(vUv.x*u1*1.6, y*2.0-tm*u0*0.5)); float top=0.86+0.14*fbm(vec2(vUv.x*u1*0.9,tm*0.7)); if(y>top) discard;
    float st=smoothstep(0.55,0.9,fbm(vec2(vUv.x*u1*3.0, y*1.2-tm*u0)))*(1.0-y*0.4); float lip=smoothstep(top-0.22,top-0.02,y)*(0.55+0.45*n);
    vec3 c=mix(col*0.45,col*1.15,smoothstep(0.0,0.75,y)); c=mix(c,mix(col,col2,0.65),st*0.7); c=mix(c,col2,lip*0.9);
    float a=op*(0.5+0.35*y+0.3*st+0.3*lip)*smoothstep(0.0,0.06,y); gl_FragColor=vec4(c,clamp(a,0.0,1.0)); }`;
// a comet tail (a bolt's trail, a stone's skim): fine streak lines that taper to the tail
const F_TAIL = `uniform vec3 col; uniform vec3 col2; uniform float op; uniform float u0; uniform float u1; uniform float tm; varying vec2 vUv; ${GN}
  void main(){ float h=vUv.x; float v=(vUv.y-0.5)*2.0; float w=0.15+0.85*h; if(abs(v)>w) discard; float vv=v/w; float l=0.0; for(int i=0;i<4;i++){ float fi=float(i); float lane=-0.7+0.47*fi+0.12*sin(h*9.0+fi*2.0); l=max(l,1.0-smoothstep(0.0,0.12,abs(vv-lane))); }
    float core=1.0-smoothstep(0.0,0.5,abs(vv)); vec3 c=mix(col,col2,clamp(0.4*core+0.6*l,0.0,1.0)); float a=op*pow(h,1.4)*(0.25*core+0.75*l)*(1.0-abs(vv)*0.3); gl_FragColor=vec4(c,a); }`;
'''
rep("\nconst streakGeo = ", NOISE+"\nconst streakGeo = ")
# fxMat: allow extra uniforms already. add uniform ln default
rep("op: { value: 1 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 } }, extra.uniforms || {})","op: { value: 1 }, u0: { value: 0 }, u1: { value: 1 }, tm: { value: 0 }, ln: { value: 1 } }, extra.uniforms || {})")
open(f,'w').write(s); print('ok')
