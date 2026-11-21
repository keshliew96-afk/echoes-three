  // ---- the Tidecaller's dash: she rides a tide she calls up, and it leaves a path of water behind her that slows any foe standing in it.
  // The tide is a tall cobalt wave, higher than a foe, with a pale curling crest that turns with her; the path is a flat wet strip on the floor that stays 3 s and then dries. All of it is flat and dim.
  const WET_LIFE=3.0, WET_W=0.5, TIDE_H=0.95, TIDE_LIP=0.22, TIDE_W=0.78, TIDE_CLIP=0.20;   // the tide stands 0.95 u at its middle (the practice post is 0.68 u), its curling crest 1.1 u; the clip itself lifts her 0.20
  const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
  let tide=null, tideK=0, wet=null, wetT=-1, wetLen=0, wetFrom=new THREE.Vector3(), wetU=[0,1], wetGrow=false, sprayT=0;
  function tideMake(){ tide=new THREE.Group();
    // the swell is one shaped sheet: a long back slope, a rounded crest she stands on, a steep front face; coloured by height from deep water to cobalt to a pale foam crest
    // one sheet swept across her path: its side view is a breaking wave (long back slope, the flat top she stands on, a crest that curls over a hollow face, a foot of foam)
    const PR=[[-1.55,0],[-1.15,0.2],[-0.7,0.6],[-0.3,0.9],[0,TIDE_H],[0.3,1.02],[0.52,TIDE_H+TIDE_LIP],[0.74,1.02],[0.73,0.84],[0.56,0.68],[0.48,0.4],[0.57,0.13],[0.76,0]];
    const cr=(p0,p1,p2,p3,t)=>0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t), prof=(v)=>{ const f=v*(PR.length-1), i=Math.min(PR.length-2,Math.floor(f)), t=f-i, P=(k)=>PR[Math.min(PR.length-1,Math.max(0,k))]; return [cr(P(i-1)[0],P(i)[0],P(i+1)[0],P(i+2)[0],t),Math.max(0,cr(P(i-1)[1],P(i)[1],P(i+1)[1],P(i+2)[1],t))]; };
    const NU=30, NV=60, pos=[], col=[], idx=[], c0=new THREE.Color(0x1F4796), c1=new THREE.Color(COBALT), c2=new THREE.Color(0x9CC2F2), c3=new THREE.Color(FOAM), cc=new THREE.Color(), HM=TIDE_H+TIDE_LIP;
    for(let i=0;i<=NU;i++)for(let j=0;j<=NV;j++){ const u=i/NU*2-1, v=j/NV, [pz,py]=prof(v), hk=Math.pow(Math.max(0,1-Math.pow(Math.abs(u),3.2)),0.55), y=py*hk, q=y/HM, pv=v*(PR.length-1);
      pos.push(u*TIDE_W*(pv<4?0.5+0.5*Math.pow(pv/4,0.6):1), y, pz*(0.55+0.45*hk)-0.42*u*u);
      const crest=pv>5.3&&pv<8.3, face=pv>=8.3&&pv<11.2, foot=pv>=11.2, top=pv>3.2&&pv<=5.3;
      if(crest)cc.copy(c2).lerp(c3,Math.min(1,0.45+0.55*Math.sin((pv-5.3)/3*Math.PI)));
      else if(foot)cc.copy(c1).lerp(c3,0.55+0.3*Math.sin(u*23+pv*9));
      else if(face)cc.copy(c0).lerp(c1,0.35+0.5*q).lerp(c3,Math.sin(u*17+pv*2.2)>0.8?0.55:0);        // the hollow face is the darkest water, with foam streaks running down it
      else if(top)cc.copy(c1).lerp(c2,0.55).lerp(c3,Math.sin(u*9+pv*7)>0.86?0.5:0);
      else cc.copy(c0).lerp(c1,Math.min(1,q/0.5)).lerp(c2,Math.max(0,(q-0.5)/0.5)*0.55).lerp(c3,Math.sin(u*13-pv*5)>0.9?0.35:0);
      col.push(cc.r,cc.g,cc.b,(j===0||i===0||i===NU)?0.3:1); }
    for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){ const a=i*(NV+1)+j, b2=a+NV+1; idx.push(a,b2,a+1,b2,b2+1,a+1); }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.Float32BufferAttribute(col,4)); geo.setIndex(idx); geo.computeVertexNormals();
    const body=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:0.9,depthWrite:false,side:THREE.DoubleSide,emissive:0x1b3566})); tide.add(body);
    const skirt=new THREE.Mesh(new THREE.RingGeometry(0.4,0.56,36),new THREE.MeshBasicMaterial({color:FOAM,transparent:true,opacity:0.3,depthWrite:false,side:THREE.DoubleSide})); skirt.rotation.x=-Math.PI/2; skirt.scale.set(TIDE_W/0.5*0.95,2.2,1); skirt.position.set(0,0.012,-0.4); tide.add(skirt);
    tide.visible=false; dashG.add(tide);
    wet=new THREE.Group(); const strip=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:COBALT,transparent:true,opacity:0,depthWrite:false})); strip.rotation.x=-Math.PI/2; strip.position.y=0.008; wet.add(strip);
    const mk=(x)=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(0.03,1),new THREE.MeshBasicMaterial({color:FOAM,transparent:true,opacity:0,depthWrite:false})); e.rotation.x=-Math.PI/2; e.position.set(x,0.01,0); wet.add(e);}; mk(-0.5); mk(0.5);
    wet.visible=false; worldG.add(wet); }
  function dashFx(ev){ if(ev==='off'){ wetGrow=false; blob.material.opacity=0.16; return; } if(!feel)return; if(!tide)tideMake();
    if(ev==='start'){ dring(heroW(0.1,0),COBALT,0.1,0.62,0.34,{op:0.4}); dring(heroW(0.1,0),FOAM,0.08,0.4,0.26,{op:0.3,delay:0.05}); }
    if(ev==='rise'){ wetT=0; wetLen=0; wetGrow=true; wetFrom.copy(heroW(-0.3,0)); wetU=[dashU[0],dashU[1]]; for(let i=0;i<8;i++){const a=i*0.785; dpuff(heroW(Math.cos(a)*0.3,Math.sin(a)*0.3,0.08),FOAM,0.1,0.4,{op:0.4,vx:Math.cos(a)*0.6,vz:Math.sin(a)*0.6,vy:0.5,grow:2});} }
    if(ev==='break'){ wetGrow=false; dring(heroW(0.3,0),FOAM,0.4,1.5,0.6,{op:0.42,inner:0.8}); dring(heroW(0.3,0),COBALT,0.3,1.2,0.5,{op:0.34,delay:0.05}); dring(heroW(0.3,0),FOAM,0.2,0.9,0.5,{op:0.3,delay:0.12});
      for(let i=0;i<30;i++){const a=(Math.random()-0.5)*2.6, sp=0.9+Math.random()*1.6; const v=[dashU[0]*Math.cos(a)-dashU[1]*Math.sin(a),dashU[1]*Math.cos(a)+dashU[0]*Math.sin(a)]; dpuff(heroW(0.35,rnd(0.55),0.1+Math.random()*TIDE_H*0.9),i%3?FOAM:COBALT,0.07+Math.random()*0.09,0.5+Math.random()*0.35,{op:0.5,vx:v[0]*sp,vz:v[1]*sp,vy:0.2+Math.random()*1.0,grow:1.9});} shake=Math.max(shake,0.3); }
    if(ev==='land'){ dring(heroW(0,0),FOAM,0.12,0.5,0.3,{op:0.26}); for(let i=0;i<6;i++){const a=i*1.05; dpuff(heroW(Math.cos(a)*0.14,Math.sin(a)*0.14,0.05),FOAM,0.08,0.4,{op:0.34,vx:Math.cos(a)*0.5,vz:Math.sin(a)*0.5,vy:0.3,grow:2});} }
  }
  // is this practice post standing in the water?
  function dummyWet(m){ if(wetT<0||wetT>WET_LIFE)return false; const rx=m.pos.x-wetFrom.x, rz=m.pos.z-wetFrom.z, al=rx*wetU[0]+rz*wetU[1], la=rx*wetU[1]-rz*wetU[0]; return al>-0.1&&al<wetLen+0.15&&Math.abs(la)<WET_W+0.08; }
  function dashUpd(t,d){ if(!tide){ if(t<0)return; tideMake(); }
    // the swell: up under her as she heaves the shell down, flat again as it breaks
    // it heaves up under her (0.10 to 0.22), carries her, and sinks as it breaks (0.62 to 0.80); she is lifted with it
    const want=t>=0.10&&t<0.66?1:0; if(t>=0)tideK=ss(0.10,0.22,t)*(1-ss(0.62,0.80,t)); else tideK=Math.max(0,tideK-d*7); const k=tideK; tide.visible=feel&&k>0.02;
    model.position.y=feel?(TIDE_H-TIDE_CLIP)*k:0;
    blob.material.opacity=0.16*(1-Math.min(1,k*1.5));
    if(tide.visible){ const bob=t>=0?0.02*Math.sin((t-0.17)*25):0; tide.scale.set(0.6+0.4*k+(1-k)*0.4*(want?0:1),Math.max(0.02,k*(1+bob)),0.6+0.4*k+(1-k)*0.5*(want?0:1)); tide.children.forEach((m,i)=>{ m.material.opacity=[0.9,0.3][i]*Math.min(1,k*1.6); }); }
    // spray off the lip and a wake down both sides while she rides
    if(t>=0.16&&t<0.66&&feel){ sprayT-=d; if(sprayT<=0){ sprayT=0.016; dpuff(heroW(0.62+rnd(0.08),rnd(0.5),TIDE_H*tideK*(0.95+Math.random()*0.22)),FOAM,0.06+Math.random()*0.06,0.34+Math.random()*0.22,{op:0.5,vx:-dashU[0]*0.6+rnd(0.3),vz:-dashU[1]*0.6+rnd(0.3),vy:0.6+Math.random()*0.8,grow:1.7});
        dpuff(heroW(0.8,rnd(0.6),0.06),FOAM,0.08,0.4,{op:0.34,vx:dashU[0]*0.5,vz:dashU[1]*0.5,vy:0.2,grow:2.2});
        const s=Math.random()<0.5?-1:1; dpuff(heroW(-0.35,s*0.66,0.05),FOAM,0.07,0.5,{op:0.3,vx:dashU[1]*s*0.35,vz:-dashU[0]*s*0.35,vy:0.15,grow:2.2}); } }
    // the water she leaves: it grows behind her while she rides, lies there, then dries
    if(wetT>=0){ wetT+=d; if(wetGrow&&t>=0){ const h=heroW(-0.15,0); wetLen=Math.max(wetLen,(h.x-wetFrom.x)*wetU[0]+(h.z-wetFrom.z)*wetU[1]); }
      const fade=wetT>WET_LIFE-0.6?Math.max(0,(WET_LIFE-wetT)/0.6):Math.min(1,wetT/0.12); wet.visible=feel&&fade>0&&wetLen>0.05;
      wet.position.set(wetFrom.x+wetU[0]*wetLen/2,0,wetFrom.z+wetU[1]*wetLen/2); wet.rotation.y=Math.atan2(wetU[0],wetU[1]); wet.scale.set(WET_W*2,1,wetLen);
      wet.children.forEach((m,i)=>m.material.opacity=(i?0.3:0.26+0.03*Math.sin(wetT*5))*fade);
      if(feel&&fade>0.5&&Math.random()<d*5){ const a=Math.random()*wetLen, la=rnd(WET_W*0.7); dring(new THREE.Vector3(wetFrom.x+wetU[0]*a+wetU[1]*la,0,wetFrom.z+wetU[1]*a-wetU[0]*la),FOAM,0.03,0.16,0.7,{op:0.3,y:0.012}); }
      if(wetT>=WET_LIFE){ wetT=-1; wet.visible=false; } } }
