  // ---- the Duskwing's blink. He comes apart into a cloud of small bats that scatter, stream to the spot and gather into him again. Used by his dash and by hits 4 to 6 of his combo.
  const SWARM=[], SW_N=13; let swarmG=null;
  function makeSwarm(){ swarmG=new THREE.Group(); scene.add(swarmG); const wingGeo=new THREE.BufferGeometry();
    // one wing: a scalloped bat wing in the xz plane, root at the origin, tip out along +x
    const W=[[0,0,0.012],[0.05,0,0.03],[0.105,0,0.012],[0.085,0,-0.012],[0.07,0,-0.036],[0.05,0,-0.014],[0.035,0,-0.034],[0.018,0,-0.012],[0,0,-0.02]]; const pos=[], idx=[]; W.forEach(v=>pos.push(...v)); for(let i=1;i<W.length-1;i++)idx.push(0,i,i+1);
    wingGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); wingGeo.setIndex(idx);
    const bodyGeo=new THREE.SphereGeometry(0.02,8,6), earGeo=new THREE.ConeGeometry(0.008,0.022,4);
    for(let i=0;i<SW_N;i++){ const g=new THREE.Group(); const dark=new THREE.MeshBasicMaterial({color:i%3?0x35212F:0x432A3B}), skin=new THREE.MeshBasicMaterial({color:i%3?0x55344A:0x6B4059,side:THREE.DoubleSide});
      const body=new THREE.Mesh(bodyGeo,dark); body.scale.set(0.8,0.8,1.5); g.add(body); const eL=new THREE.Mesh(earGeo,dark), eR=new THREE.Mesh(earGeo,dark); eL.position.set(0.011,0.018,0.022); eR.position.set(-0.011,0.018,0.022); g.add(eL,eR);
      const wL=new THREE.Mesh(wingGeo,skin), wR=new THREE.Mesh(wingGeo,skin); wR.scale.x=-1; g.add(wL,wR); g.visible=false; swarmG.add(g);
      SWARM.push({g,wL,wR,mats:[dark,skin],on:false,t:0,dur:1,lag:0,from:new THREE.Vector3(),to:new THREE.Vector3(),off:new THREE.Vector3(),ph:Math.random()*6.28,rate:20+Math.random()*8,size:1.25+Math.random()*0.9,world:false,lead:0,dir:new THREE.Vector3(0,0,1)}); } }
  // from and to are points in the scene; world=true pins them to the sliding floor (the dash), false leaves them where they are (the combo)
  function swarm(from,to,dur,world){ if(!feel)return; if(!swarmG)makeSwarm(); const dir=to.clone().sub(from); const len=dir.length()||1; dir.multiplyScalar(1/len); const sideV=new THREE.Vector3(dir.z,0,-dir.x);
    SWARM.forEach((b,i)=>{ b.on=true; b.t=0; b.lag=0.02+0.2*(i/SW_N)*dur; b.dur=dur*(0.86+0.3*Math.random()); b.from.copy(from).add(new THREE.Vector3(rnd(0.07),rnd(0.12),rnd(0.07))); b.to.copy(to).add(new THREE.Vector3(rnd(0.06),rnd(0.1),rnd(0.06)));
      const a=i/SW_N*6.283+rnd(0.4), r=(0.22+0.3*Math.random())*Math.min(1,0.45+len*0.4); b.off.copy(sideV).multiplyScalar(Math.cos(a)*r).add(new THREE.Vector3(0,Math.sin(a)*r*0.75+0.1,0)).addScaledVector(dir,rnd(0.2)); b.world=!!world; b.dir.copy(dir); b.lead=rnd(0.4); if(world){ b.to.copy(b.from); } }); }
  const swP=new THREE.Vector3(), swQ=new THREE.Vector3();
  function swarmStep(d){ if(!swarmG)return; SWARM.forEach(b=>{ if(!b.on){b.g.visible=false;return;} b.t+=d; const u=(b.t-b.lag)/b.dur; if(u<0){b.g.visible=false;return;} if(u>=1){b.on=false; b.g.visible=false; return;}
      const at=(v,out)=>{ const e=v*v*(3-2*v), sp=Math.pow(Math.sin(Math.PI*v),0.55); out.copy(b.from).lerp(b.to,e).addScaledVector(b.off,sp); out.y+=0.03*Math.sin(b.ph+v*20); return out; };
      at(u,swP); at(Math.min(1,u+0.03),swQ); if(b.world){ swP.addScaledVector(b.dir,b.lead*Math.sin(Math.PI*u)); swQ.copy(swP).addScaledVector(b.dir,0.2).addScaledVector(b.off,0.3*Math.cos(Math.PI*u)); }
      b.g.visible=true; b.g.position.copy(swP); if(swQ.distanceToSquared(swP)>1e-8)b.g.lookAt(swQ); const k=Math.min(1,u*7)*Math.min(1,(1-u)*5); b.g.scale.setScalar(b.size*(0.15+0.85*k)); const fl=Math.sin(b.ph+b.t*b.rate*6.283/2.2)*0.95; b.wL.rotation.z=fl; b.wR.rotation.z=-fl; }); }
  const bodyAt=(y=0.34)=>new THREE.Vector3(model.position.x,y,model.position.z);
  function poof(p,n=5){ for(let i=0;i<n;i++)dpuff(p.clone().add(new THREE.Vector3(rnd(0.1),rnd(0.14),rnd(0.1))),i%2?PLUM:LEATHER,0.16+Math.random()*0.12,0.28+Math.random()*0.14,{op:0.4,grow:2,parent:scene}); }
  // the dash
  function dashFx(ev){ if(ev==='off'){ if(!batAway){model.visible=true; blob.visible=true;} return; } if(!feel)return;
    if(ev==='out'){ const a=bodyAt(), b=a.clone().add(new THREE.Vector3(dashU[0]*DASH.dist,0,dashU[1]*DASH.dist)); swarm(a,b,DASH.go[1]-DASH.go[0]+0.05,true); poof(a,4); }
    if(ev==='in'){ poof(bodyAt(),5); dring(heroW(0,0),PLUM,0.14,0.55,0.3,{op:0.3}); } }
  // ---- hits 4 to 6: each has a blink of its own. He comes out of the dark beside the foe nearest the player's mouse, from a different side each time when it is the same foe, and after hit 6 he blinks home
  const FOE_NEAR=new THREE.Vector3(0,0,0.74), FOE_FAR=new THREE.Vector3(1.2,0,1.25), AWAY_U=new THREE.Vector3(FOE_FAR.x,0,FOE_FAR.z).normalize(), UPY=new THREE.Vector3(0,1,0);
  // where he stands for each hit: 1 behind the foe, 2 and 3 on its two near flanks, a third of a turn apart; he always faces the foe
  const SPOTS=[null].concat([0,2.2,-2.2].map(a=>{ const u=AWAY_U.clone().applyAxisAngle(UPY,a); return {p:FOE_FAR.clone().addScaledVector(u,0.5),yaw:Math.atan2(-u.x,-u.z)}; }));
  // per clip: [hide from, hide to, which spot he is at after (0 is where he stood)]
  const BLINKS={combo:[[0.50,0.56,1],[0.66,0.72,2],[0.83,0.89,3],[1.04,1.10,0]],combo4:[[0.0,0.07,1],[0.40,0.48,0]],combo5:[[0.0,0.07,2],[0.40,0.48,0]],combo6:[[0.0,0.07,3],[0.41,0.49,0]]};
  let batSpot=0, batAway=false, batHid=false, posts=null, postK=0;
  function makePosts(){ posts=[dpost(scene),dpost(scene)]; posts[0].pos.copy(FOE_NEAR); posts[1].pos.copy(FOE_FAR); posts.forEach((m,i)=>{ m.g.position.copy(m.pos); m.tilt=0; m.tiltV=0; m.ax=new THREE.Vector3(1,0,0); }); }
  function postHit(i,from){ if(!posts)return; const m=posts[i]; const dir=m.pos.clone().sub(from).setY(0).normalize(); m.ax.set(dir.z,0,-dir.x); m.tiltV=7; m.flash=0.2; }
  function batTick(t,d){
    // which combo clip is playing, and where it puts him
    let key=null, ct=0; running.forEach((a,n)=>{ const k=n.replace(/Up$/,''); if(BLINKS[k]&&a.__tw>0){key=k; ct=a.time;} });
    let spot=0, hid=false; if(key&&!sel.dash&&!sel.downed&&!rising){ spot=key==='combo'?0:batSpot; BLINKS[key].forEach(([h0,h1,w])=>{ if(ct>=h0){ spot=w; if(ct<h1)hid=true; } }); }
    if(t>=0){ hid=t>=DASH.go[0]&&t<DASH.go[1]; }
    if(spot!==batSpot){ const a=bodyAt(); const P=spot?SPOTS[spot].p:null; model.position.set(P?P.x:0,0,P?P.z:0); const b=bodyAt(); swarm(a,b,0.08,false); if(feel){poof(a,4); poof(b,3);} batSpot=spot; batAway=spot>0; }
    if(batSpot){ model.rotation.y=SPOTS[batSpot].yaw; } else if(!sel.dash){ model.position.x=0; model.position.z=0; }
    if(hid!==batHid){ batHid=hid; } model.visible=!hid; blob.visible=!hid; blob.position.set(model.position.x,0.002,model.position.z+0.05);
    // the two practice posts: one in front of him for hits 1 to 3, one further off that stands for the foe nearest the mouse
    const want=feel&&!!key; postK+=((want?1:0)-postK)*Math.min(1,d*(want?12:2.5)); if(postK>0.02&&!posts)makePosts();
    if(posts)posts.forEach((m,i)=>{ m.g.visible=postK>0.02; m.mat.opacity=postK; m.tiltV+=(-m.tilt*170-m.tiltV*13)*d; m.tilt+=m.tiltV*d; m.tip.rotation.set(0,0,0); m.tip.rotateOnAxis(m.ax,m.tilt*0.5); m.flash=Math.max(0,(m.flash||0)-d*2); m.mat.emissive.setHex(0xffffff); m.mat.emissiveIntensity=m.flash; dsay(m.lab,postK>0.5&&i===1?'Foe nearest the mouse':''); });
    swarmStep(d); }
  function dashUpd(t,d){ batTick(t,d); }
