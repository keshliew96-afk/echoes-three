  // ---- effects: the game's violet. The shard's glow pulses (0.45 + 0.3 max(0, sin 3.2t)) with a violet halo round it
  // (0.35 + 0.15 sin 3.2t), the veins on the stone glow steady (the game's glowing crack), all kept dim under the bloom.
  // On the curse the shard's glow falls by 70% and the halo by 60%, and a violet burst goes up: 22 embers from the floor
  // round the altar (radius 0.7, tall 2.6) and a spray of 12 sparks. The hero stand-in waits where the party stands.
  const FXP=[], RINGS=[]; let dotTex=null;
  const sm=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}, c01=(x)=>Math.max(0,Math.min(1,x));
  function makeFx(){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); dotTex=new THREE.CanvasTexture(c);
    for(let i=0;i<40;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; scene.add(s); FXP.push({s,life:0,age:0,v:new THREE.Vector3(),g:0,s0:0.1,s1:0.2,a:0.5,floor:false});}
    halo=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:0xB79CF0,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0})); halo.scale.setScalar(1.3); scene.add(halo);
    dummy=new THREE.Group(); const dm=new THREE.MeshStandardMaterial({color:0x6b645c,roughness:1,emissive:0xffffff,emissiveIntensity:0}); const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.62,16),dm); body.position.y=0.31; const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),dm); hd.position.y=0.8; dummy.add(body,hd); dummy.userData={mat:dm,z:HOME,x:0,tip:0}; dummy.position.set(0,0,HOME); dummy.rotation.y=Math.PI; scene.add(dummy);
  }
  function puff(pos,vel,o){ if(!fxOn)return; const p=FXP.find(p=>p.life<=0); if(!p)return; p.life=o.life||0.5; p.age=0; p.v.copy(vel); p.g=o.g||0; p.s0=o.s0||0.1; p.s1=o.s1||0.3; p.a=o.a||0.4; p.drag=o.drag||0; p.floor=!!o.floor; p.s.material.color.setHex(o.col||DUST); p.s.position.copy(pos); if(p.floor){fxG.add(p.s);p.s.position.copy(toFloor(pos));}else scene.add(p.s); p.s.visible=true; p.s.scale.setScalar(p.s0); p.s.material.opacity=0; }
  function dust(pos,n,spd,up,col){ for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2; puff(tmp2.copy(pos).setY(0.04),new THREE.Vector3(Math.cos(a)*spd*(0.5+Math.random()),up*(0.4+Math.random()*0.6),Math.sin(a)*spd*(0.5+Math.random())),{life:0.5+Math.random()*0.3,s0:0.06,s1:0.2,a:0.18,drag:2.6,floor:true,col:col||DUST});} }
  function sparks(pos,n,col,spd,life){ for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-0.5,Math.random()-0.2,Math.random()-0.5).normalize().multiplyScalar(spd*(0.4+Math.random()*0.8)); puff(pos,v,{life:life*(0.6+Math.random()*0.6),s0:0.05,s1:0.012,a:0.55,col,g:-2.5,drag:1.6});} }
  function clearFx(){ FXP.forEach(p=>{p.life=0;p.s.visible=false;}); }
  function fxStart(name){ HOME=FAR; prevT=0; if(dummy){ const u=dummy.userData; u.z=HOME; dummy.position.set(0,0,HOME); } }
  function fxContact(name,i){ if(name!=='curse'||i!==0||!fxOn)return; const c=pt(bones.hips,[0,0,0]);
    // the game's impactFx.embers (radius 0.7, tall 2.6): from the floor, rising 0.5-1.1 x 2.6 u/s with drag 1.4, 0.06-0.14 u, 0.6-1.1 s
    for(let k=0;k<22;k++){ const a=Math.random()*Math.PI*2, rr=0.1+0.6*Math.random(); const p=new THREE.Vector3(c.x+Math.cos(a)*rr,0.06,c.z+Math.sin(a)*rr); const life=(0.5+0.4*Math.random())*1.25, sz=0.06+0.08*Math.random(), sp=0.05+0.2*Math.random(), b=Math.random()*Math.PI*2;
      puff(p,new THREE.Vector3(Math.cos(b)*sp,(0.5+0.6*Math.random())*2.6,Math.sin(b)*sp),{life,s0:sz,s1:sz*0.4,a:0.5,col:0xB79CF0,drag:1.4,g:0.5}); }
    // and its impactFx.impact: 12 sparks sprayed out low, 1-2.2 u/s, 0.05-0.11 u, 0.18-0.32 s
    for(let k=0;k<12;k++){ const b=Math.random()*Math.PI*2, sp=1+1.2*Math.random(), sz=0.05+0.06*Math.random(); puff(new THREE.Vector3(c.x,0.35,c.z),new THREE.Vector3(Math.cos(b)*sp,0.4*Math.random(),Math.sin(b)*sp),{life:0.18+0.14*Math.random(),s0:sz,s1:sz*0.3,a:0.55,col:0xB79CF0,drag:1.0}); } }
  let prevT=0, halo=null;
  const goneK=()=>shot&&shot.name==='curse'?Math.min(1,shot.action.time/0.5):0;
  function fxOngoing(d){ if(!shot||shot.done)return; prevT=shot.action.time; }
  function updateFx(d){
    flash=Math.max(0,flash-d*3.2); const gk=goneK(), pu=Math.sin(clockT*3.2);
    glowU.value.set(fxOn?0.6*(0.45+0.3*Math.max(0,pu))*(1-0.7*gk):0,fxOn?0.3:0,feel?flash:0,0);
    if(halo){ halo.visible=fxOn; halo.position.copy(pt(bones.crystal,[0,0,0])); halo.material.opacity=0.3*(0.35+0.15*pu)*(1-0.6*gk); }
    FXP.forEach(p=>{ if(p.life<=0)return; p.age+=d; const u=p.age/p.life; if(u>=1){p.life=0;p.s.visible=false;return;} p.v.y+=p.g*d; p.v.multiplyScalar(Math.max(0,1-p.drag*d)); p.s.position.addScaledVector(p.v,d); const s=p.s0+(p.s1-p.s0)*u; p.s.scale.setScalar(s); p.s.material.opacity=p.a*(1-u)*(u<0.1?u*10:1); });
    if(dummy){ const u=dummy.userData; u.mat.emissiveIntensity=Math.max(0,u.mat.emissiveIntensity-d*4); u.z+=(HOME-u.z)*Math.min(1,d*2); dummy.position.z=u.z; dummy.position.x=0; }
  }
