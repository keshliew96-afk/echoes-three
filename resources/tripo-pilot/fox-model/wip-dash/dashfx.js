  // ---- the fox's dash: a glint on the point in the stance, one thin crimson and silver line down the thrust, dust where he fires off and where he skids, a short cut on each foe he passes
  let dStreak=null, dStreakT=-1; const dA=new THREE.Vector3(), dB=new THREE.Vector3(), dTip=new THREE.Vector3();
  function makeDashStreak(){ dStreak=new THREE.Group(); const mk=(w,col,op,rot)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,1),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide})); m.rotation.x=Math.PI/2; m.rotation.y=rot; m.position.z=0.5; m.userData.op=op; dStreak.add(m); };
    mk(0.075,CRIM,0.3,0); mk(0.075,CRIM,0.3,Math.PI/2); mk(0.02,MOON,0.55,0); mk(0.02,MOON,0.55,Math.PI/2); dStreak.visible=false; worldG.add(dStreak); }
  function dashFx(ev){ if(!feel||!staff)return; staff.updateWorldMatrix(true,false);
    if(ev==='start'){ const p=toW(tip(dTip).clone()); dpuff(p,MOON,0.07,0.2,{grow:3.2,op:0.7}); dpuff(p,CRIM,0.12,0.26,{grow:2.4,op:0.3}); }
    if(ev==='go'){ if(!dStreak)makeDashStreak(); dA.copy(heroW(0.1,-0.05,0.44)); dStreakT=0; for(let i=0;i<5;i++)dpuff(heroW(-0.1-0.07*i,rnd(0.1),0.05+Math.random()*0.05),DUST,0.13+Math.random()*0.08,0.5+Math.random()*0.2,{op:0.34,vy:0.25,grow:2.2,delay:i*0.012}); dring(heroW(-0.05,0),DUST,0.12,0.5,0.32,{op:0.28}); }
    if(ev==='end'){ for(let i=0;i<7;i++)dpuff(heroW(0.12+0.06*i,rnd(0.14),0.04+Math.random()*0.05),DUST,0.1+Math.random()*0.09,0.45+Math.random()*0.25,{op:0.32,vy:0.2,grow:2.3,delay:i*0.015}); }
    if(ev==='flick'){ const p=toW(tip(dTip).clone()); for(let i=0;i<4;i++)dpuff(p.clone().add(new THREE.Vector3(rnd(0.05),rnd(0.04),rnd(0.05))),CRIM,0.035,0.24,{op:0.5,vy:-0.5,grow:1.2,delay:i*0.02}); }
  }
  function dashUpd(t,d){ if(!dStreak||dStreakT<0)return; dStreakT+=d; const live=t>=DASH.go[0]&&t<=DASH.go[1]+0.02;
    if(live&&staff){ staff.updateWorldMatrix(true,false); dB.copy(toW(tip(dTip).clone())); dB.y=0.44; }
    const len=dA.distanceTo(dB); const k=live?1:Math.max(0,1-(dStreakT-(DASH.go[1]-DASH.go[0]))/0.22); dStreak.visible=feel&&k>0&&len>0.05; if(k<=0){dStreakT=-1;return;}
    dStreak.position.copy(dA); dStreak.lookAt(dB.x-wOff.x,dB.y,dB.z-wOff.y); dStreak.scale.set(1,1,len); dStreak.children.forEach(m=>m.material.opacity=m.userData.op*k); }
  function dummyHit(m){ if(!feel)return; const p=m.pos.clone(); p.y=0.42; dpuff(p,MOON,0.1,0.14,{grow:3,op:0.7}); dpuff(p,CRIM,0.2,0.24,{grow:2,op:0.34}); for(let i=0;i<5;i++)dpuff(p.clone(),MOON,0.03,0.2+Math.random()*0.1,{op:0.7,vx:m.u[0]*1.6+rnd(0.9),vy:0.4+rnd(0.6),vz:m.u[1]*1.6+rnd(0.9),grow:0.6}); hitstop=Math.max(hitstop,0.02); }
